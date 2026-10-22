import type { Command, DataSource } from '../DataSource'
import { clamp, distance } from '../geometry'
import { DRONE } from '../specs'
import type {
  AirTarget,
  EventCategory,
  MissionEvent,
  RobotMode,
  Severity,
  SimulationInfo,
  WorldSnapshot,
  Zone,
} from '../types'
import { stepAirTraffic, trackedTargets } from './airTraffic'
import { clampToRange, stepDrone } from './drone'
import { createRandom } from './random'
import { senseObstacles, stepRobot } from './robot'
import type { SimContext, SimState } from './state'
import { CoverageGrid, cellsInRect, planSurvey } from './survey'
import { generateWorld, type World } from './world'

const TICK_MS = 50
/** Largest physics step. Faster sim speeds take several of these per tick, keeping motion stable. */
const MAX_STEP = 0.05
const MAX_EVENTS = 250
/**
 * A watchdog: drive commands expire after this long. If the operator's finger
 * slips off or the link drops, the robot stops instead of driving on.
 */
const DRIVE_TIMEOUT_MS = 400
const NO_TARGETS: AirTarget[] = []

const MODE_MESSAGES: Record<RobotMode, string> = {
  patrol: 'Autonomous survey resumed',
  manual: 'Manual control engaged',
  hold: 'Holding position',
}

/** A self-contained, deterministic stand-in for the real robot. */
export class Simulator implements DataSource {
  private readonly seed: number
  private world!: World
  private state!: SimState
  private ctx!: SimContext
  private startClock = 0
  private snapshot!: WorldSnapshot
  private sim: SimulationInfo = { speed: 1, paused: false }
  private readonly listeners = new Set<() => void>()
  private timer: ReturnType<typeof setInterval> | null = null
  private lastTick = 0
  private lastDriveAt = 0

  constructor(options: { seed?: number } = {}) {
    this.seed = options.seed ?? 7
    this.reset()
  }

  // ------------------------------------------------------ DataSource

  // Arrow functions so `this` survives being passed around (useSyncExternalStore does that).
  getSnapshot = () => this.snapshot

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  send = (command: Command) => {
    this.handle(command)
    this.publish()
  }

  connect() {
    if (this.timer) return
    this.lastTick = performance.now()
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  disconnect() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /** Advances the world by `seconds` of simulated time. Public so tests can run it without timers. */
  advance(seconds: number) {
    for (let left = seconds; left > 1e-9; left -= MAX_STEP) this.step(Math.min(MAX_STEP, left))
    this.publish()
  }

  // -------------------------------------------------------- internals

  private tick() {
    const now = performance.now()
    const realDt = Math.min((now - this.lastTick) / 1000, 0.25)
    this.lastTick = now
    if (now - this.lastDriveAt > DRIVE_TIMEOUT_MS) this.state.drive = { throttle: 0, turn: 0 }
    if (!this.sim.paused) this.advance(realDt * this.sim.speed)
  }

  private step(dt: number) {
    const { state, ctx } = this
    state.elapsed += dt
    stepRobot(ctx, dt)
    stepDrone(ctx, dt)
    stepAirTraffic(ctx, dt)

    if (state.zonesDirty) {
      state.zonesDirty = false
      state.zones = state.zones.map((z) => {
        const cells = state.zoneCells[z.id]
        const coverage = cells.covered / cells.total
        return coverage === z.coverage ? z : { ...z, coverage }
      })
    }

    const { robot, route } = state
    if (robot.mode === 'patrol' && robot.surveyZoneId && route.index >= route.points.length) {
      this.completeSurvey()
    }
  }

  private clock() {
    return this.startClock + this.state.elapsed * 1000
  }

  private emit = (severity: Severity, category: EventCategory, message: string) => {
    const s = this.state
    const event: MissionEvent = {
      id: `E${++s.eventCount}`,
      time: this.clock(),
      severity,
      category,
      message,
      acknowledged: severity === 'info',
    }
    s.events = [event, ...s.events].slice(0, MAX_EVENTS)
  }

  private emitThrottled = (
    key: string,
    seconds: number,
    severity: Severity,
    category: EventCategory,
    message: string,
  ) => {
    const s = this.state
    if (s.elapsed < (s.cooldowns.get(key) ?? -Infinity)) return
    s.cooldowns.set(key, s.elapsed + seconds)
    this.emit(severity, category, message)
  }

  private handle(command: Command) {
    const { state } = this
    const { robot, drone } = state
    switch (command.type) {
      case 'robot/drive': {
        const throttle = clamp(command.throttle, -1, 1)
        const turn = clamp(command.turn, -1, 1)
        this.lastDriveAt = performance.now()
        // Touching the controls overrides autonomy, as on the real robot.
        if ((throttle !== 0 || turn !== 0) && robot.mode !== 'manual') this.setMode('manual')
        state.drive = { throttle, turn }
        break
      }
      case 'robot/setMode':
        this.setMode(command.mode)
        break
      case 'robot/surveyZone':
        this.beginSurvey(command.zoneId)
        break
      case 'robot/setLid':
        // Moving the lid under a drone that is taking off or landing would hit it.
        if (drone.phase !== 'docked' && drone.phase !== 'airborne') break
        state.lidTarget = command.open ? 'open' : 'closed'
        this.emit('info', 'robot', command.open ? 'Drone bay opening' : 'Drone bay closing')
        break
      case 'drone/launch':
        if (drone.phase !== 'docked') break
        if (drone.battery < DRONE.launchBattery) {
          this.emit('warning', 'drone', `Launch refused — drone battery ${Math.round(drone.battery)}%`)
          break
        }
        drone.phase = 'launching'
        drone.flightTime = 0
        drone.goal = null
        this.emit('info', 'drone', 'Launch sequence started — opening bay')
        break
      case 'drone/return':
        if (drone.phase !== 'airborne') break
        drone.phase = 'returning'
        drone.goal = null
        this.emit('info', 'drone', 'Drone returning to robot')
        break
      case 'drone/goTo':
        if (drone.phase !== 'airborne') break
        drone.goal = command.target && clampToRange(robot.pos, command.target)
        if (drone.goal) {
          this.emit('info', 'drone', `Drone tasked to ${Math.round(drone.goal.x)} E, ${Math.round(drone.goal.y)} S`)
        }
        break
      case 'events/acknowledge':
        state.events = state.events.map((e) =>
          !e.acknowledged && (command.id === 'all' || e.id === command.id) ? { ...e, acknowledged: true } : e,
        )
        break
      case 'sim/setSpeed':
        this.sim = { ...this.sim, speed: clamp(command.speed, 0.25, 8) }
        break
      case 'sim/setPaused':
        this.sim = { ...this.sim, paused: command.paused }
        break
      case 'sim/reset':
        this.reset()
        break
    }
  }

  private setMode(mode: RobotMode) {
    const { state } = this
    const robot = state.robot
    if (mode === robot.mode) return
    if (mode === 'patrol' && !robot.surveyZoneId) {
      const next = state.zones.find((z) => z.status !== 'surveyed')
      if (next) this.beginSurvey(next.id)
      else this.emit('info', 'survey', 'Nothing left to survey')
      return
    }
    robot.mode = mode
    state.drive = { throttle: 0, turn: 0 }
    state.route.best = Infinity
    state.route.stall = 0
    this.emit('info', 'robot', MODE_MESSAGES[mode])
  }

  private beginSurvey(zoneId: string) {
    const { state } = this
    const zone = state.zones.find((z) => z.id === zoneId)
    if (!zone) return
    state.zones = state.zones.map(
      (z): Zone =>
        z.id === zoneId ? { ...z, status: 'surveying' } : z.status === 'surveying' ? { ...z, status: 'pending' } : z,
    )
    state.robot.surveyZoneId = zoneId
    state.robot.mode = 'patrol'
    state.route = { points: planSurvey(zone.rect, state.robot.pos), index: 0, best: Infinity, stall: 0 }
    this.emit('info', 'survey', `Survey started: ${zone.name} — ${zone.description}`)
  }

  private completeSurvey() {
    const { state } = this
    const robot = state.robot
    const zone = state.zones.find((z) => z.id === robot.surveyZoneId)
    if (!zone) return
    state.zones = state.zones.map((z): Zone => (z === zone ? { ...z, status: 'surveyed' } : z))
    this.emit(
      'info',
      'survey',
      `${zone.name} survey complete — ${Math.round(zone.coverage * 100)}% covered, ${zone.contacts} metal contact(s)`,
    )
    robot.surveyZoneId = null

    const centre = (z: Zone) => ({ x: z.rect.x + z.rect.w / 2, y: z.rect.y + z.rect.h / 2 })
    const next = state.zones
      .filter((z) => z.status === 'pending')
      .sort((a, b) => distance(robot.pos, centre(a)) - distance(robot.pos, centre(b)))[0]
    if (next) {
      this.beginSurvey(next.id)
    } else {
      robot.mode = 'hold'
      this.emit('info', 'survey', 'All sectors surveyed — holding position')
    }
  }

  private reset() {
    this.world = generateWorld(this.seed)
    const { map, zones, hidden } = this.world
    this.startClock = Date.now()
    this.state = {
      elapsed: 0,
      robot: {
        pos: { ...map.base },
        heading: 45,
        speed: 0,
        odometer: 0,
        mode: 'hold',
        interlock: null,
        battery: 96,
        signal: 100,
        temperature: 31,
        obstacleDistances: senseObstacles(map.base, 45, map),
        obstacleStop: false,
        metalSignal: 0,
        metalHistory: [],
        lid: 'closed',
        lidOpen: 0,
        surveyZoneId: null,
        trail: [],
      },
      drone: {
        phase: 'docked',
        pos: { ...map.base },
        altitude: 0,
        heading: 45,
        speed: 0,
        battery: 100,
        flightTime: 0,
        goal: null,
      },
      droneVelocity: { x: 0, y: 0 },
      orbitAngle: 0,
      lidTarget: 'closed',
      zones: zones.map((z) => ({ ...z, coverage: 0, status: 'pending', contacts: 0 })),
      zonesDirty: false,
      contacts: [],
      events: [],
      intruders: [],
      nextIntruderAt: 6,
      intruderCount: 0,
      eventCount: 0,
      drive: { throttle: 0, turn: 0 },
      route: { points: [], index: 0, best: Infinity, stall: 0 },
      hidden,
      coverage: new CoverageGrid(map.width, map.height),
      zoneCells: Object.fromEntries(zones.map((z) => [z.id, { total: cellsInRect(z.rect), covered: 0 }])),
      metalSampleTimer: 0,
      metalCandidate: null,
      latches: new Set(),
      cooldowns: new Map(),
    }
    this.ctx = {
      state: this.state,
      world: this.world,
      rng: createRandom(this.seed + 1),
      clock: () => this.clock(),
      emit: this.emit,
      emitThrottled: this.emitThrottled,
    }

    this.emit('info', 'system', 'Console online — simulation mode')
    this.emit('info', 'system', 'Link to MINOTAUR GUARDIAN established')
    this.beginSurvey(zones[0].id)
    this.publish()
  }

  private publish() {
    const s = this.state
    this.snapshot = {
      clock: this.clock(),
      missionStart: this.startClock,
      map: this.world.map,
      // Shallow copies are enough: nested values are always replaced, never mutated.
      robot: { ...s.robot },
      drone: { ...s.drone },
      zones: s.zones,
      contacts: s.contacts,
      airTargets: s.intruders.some((t) => t.tracked) ? trackedTargets(this.ctx) : NO_TARGETS,
      events: s.events,
      sim: this.sim,
    }
    for (const listener of this.listeners) listener()
  }
}
