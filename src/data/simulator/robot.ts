import {
  DEG,
  add,
  angleDelta,
  approach,
  clamp,
  distance,
  dot,
  headingVector,
  inRect,
  length,
  normalize,
  rayCircle,
  rayExitRect,
  scale,
  sub,
  vectorHeading,
  wrap360,
} from '../geometry'
import { METAL_DETECTOR, OBSTACLE_SENSOR, ROBOT, SURVEY } from '../specs'
import type { Obstacle, Vec2, WorldMap } from '../types'
import type { SimContext, SimState } from './state'
import type { HiddenObject } from './world'

const TRAIL_SPACING = 0.75
const TRAIL_MAX = 4000
const METAL_HISTORY = 60
const AVOID_RANGE = 2
const WAYPOINT_RADIUS = 0.8
const STALL_SECONDS = 12

/** Ray-casts the proximity sensors: nearest obstacle distance per sector, clockwise from the front. */
export function senseObstacles(pos: Vec2, heading: number, map: WorldMap): number[] {
  const { sectors, range } = OBSTACLE_SENSOR
  const bounds = { x: 0, y: 0, w: map.width, h: map.height }
  const nearby = map.obstacles.filter((o) => distance(o.pos, pos) < range + o.radius)
  const width = 360 / sectors
  const result: number[] = []
  for (let s = 0; s < sectors; s++) {
    let nearest: number = range
    // Three rays per sector so thin obstacles between ray centres are not missed.
    for (const offset of [-width / 3, 0, width / 3]) {
      const dir = headingVector(heading + s * width + offset)
      nearest = Math.min(nearest, rayExitRect(pos, dir, bounds))
      for (const o of nearby) {
        const hit = rayCircle(pos, dir, o.pos, o.radius)
        if (hit !== null && hit < nearest) nearest = hit
      }
    }
    result.push(nearest)
  }
  return result
}

/**
 * Heading towards `goal` that bends around nearby obstacles: a pull towards the
 * goal plus, for each close obstacle, a push away and a slide along its side.
 */
export function avoidanceHeading(pos: Vec2, goal: Vec2, obstacles: Obstacle[]) {
  const toGoal = normalize(sub(goal, pos))
  let steer = toGoal
  for (const o of obstacles) {
    const offset = sub(pos, o.pos)
    const dist = length(offset)
    const gap = dist - o.radius - ROBOT.radius
    if (gap > AVOID_RANGE || dist < 1e-6) continue
    const away = scale(offset, 1 / dist)
    const weight = 2 * (1 - Math.max(gap, 0) / AVOID_RANGE) ** 2
    // Slide around the side that keeps us heading towards the goal.
    let tangent = { x: -away.y, y: away.x }
    if (dot(tangent, toGoal) < 0) tangent = scale(tangent, -1)
    steer = add(steer, add(scale(away, weight * 0.6), scale(tangent, weight)))
  }
  return vectorHeading(steer)
}

function collides(p: Vec2, map: WorldMap) {
  if (!inRect(p, { x: 0, y: 0, w: map.width, h: map.height }, -ROBOT.radius)) return true
  return map.obstacles.some((o) => distance(o.pos, p) < o.radius + ROBOT.radius)
}

function interlockReason(state: SimState): string | null {
  if (state.robot.battery <= 0) return 'Battery depleted'
  if (state.drone.phase === 'launching') return 'Holding for drone launch'
  if (state.drone.phase === 'landing') return 'Holding for drone landing'
  return null
}

/** Follows the survey route; returns the motion it wants. */
function followRoute(state: SimState, map: WorldMap, dt: number) {
  const { route, robot } = state
  const goal = route.points[route.index]
  if (!goal) return { speed: 0, turnRate: 0 }

  const d = distance(robot.pos, goal)
  if (d < WAYPOINT_RADIUS) {
    route.index++
    route.best = Infinity
    route.stall = 0
    return { speed: robot.speed, turnRate: 0 }
  }
  // If we stop making progress (boxed in by obstacles), give up on this waypoint.
  if (d < route.best - 0.5) {
    route.best = d
    route.stall = 0
  } else if ((route.stall += dt) > STALL_SECONDS) {
    route.index++
    route.best = Infinity
    route.stall = 0
  }

  const error = angleDelta(robot.heading, avoidanceHeading(robot.pos, goal, map.obstacles))
  return {
    // Slow for sharp turns; turn on the spot when facing away.
    speed: ROBOT.patrolSpeed * clamp(Math.cos(error * DEG), 0, 1),
    turnRate: clamp(error * 2.5, -ROBOT.turnRate, ROBOT.turnRate),
  }
}

export function stepRobot(ctx: SimContext, dt: number) {
  const { state, world, rng } = ctx
  const { map } = world
  const robot = state.robot

  robot.obstacleDistances = senseObstacles(robot.pos, robot.heading, map)
  robot.interlock = interlockReason(state)

  let targetSpeed = 0
  let turnRate = 0
  if (!robot.interlock) {
    if (robot.mode === 'manual') {
      const { throttle, turn } = state.drive
      targetSpeed = throttle >= 0 ? throttle * ROBOT.maxSpeed : throttle * ROBOT.maxReverse
      turnRate = turn * ROBOT.turnRate
    } else if (robot.mode === 'patrol') {
      const motion = followRoute(state, map, dt)
      targetSpeed = motion.speed
      turnRate = motion.turnRate
    }
  }

  // Safety stop: never drive into something the proximity sensors can see.
  const d = robot.obstacleDistances
  const n = d.length
  const front = Math.min(d[n - 1], d[0], d[1])
  const rear = Math.min(d[n / 2 - 1], d[n / 2], d[n / 2 + 1])
  robot.obstacleStop =
    (targetSpeed > 0 && front < ROBOT.stopDistance) || (targetSpeed < 0 && rear < ROBOT.stopDistance)
  if (robot.obstacleStop) {
    targetSpeed = 0
    if (robot.mode === 'manual') {
      ctx.emitThrottled('obstacle-stop', 8, 'warning', 'robot', `Safety stop — obstacle ${front.toFixed(1)} m ahead`)
    }
  }

  robot.heading = wrap360(robot.heading + turnRate * dt)
  robot.speed = approach(robot.speed, targetSpeed, ROBOT.acceleration * dt)
  const next = add(robot.pos, scale(headingVector(robot.heading), robot.speed * dt))
  if (collides(next, map)) {
    robot.speed = 0
  } else {
    robot.odometer += Math.abs(robot.speed * dt)
    robot.pos = next
  }

  const last = robot.trail[robot.trail.length - 1]
  if (!last || distance(last, robot.pos) > TRAIL_SPACING) {
    robot.trail = [...robot.trail.slice(-(TRAIL_MAX - 1)), { ...robot.pos }]
  }

  stepPower(ctx, dt)
  stepDetector(ctx, dt)

  const linkTarget = clamp(100 - 0.55 * distance(robot.pos, map.base) + rng.range(-2, 2), 4, 100)
  robot.signal += (linkTarget - robot.signal) * Math.min(1, dt * 2)
  const heatTarget = 33 + Math.abs(robot.speed) * 7
  robot.temperature += (heatTarget - robot.temperature) * Math.min(1, dt * 0.05)
}

function stepPower(ctx: SimContext, dt: number) {
  const robot = ctx.state.robot
  robot.battery = Math.max(0, robot.battery - (0.004 + 0.02 * Math.abs(robot.speed)) * dt)
  for (const [level, severity] of [
    [30, 'warning'],
    [15, 'critical'],
  ] as const) {
    const key = `robot-battery-${level}`
    if (robot.battery <= level && !ctx.state.latches.has(key)) {
      ctx.state.latches.add(key)
      ctx.emit(severity, 'robot', `Robot battery at ${level}%`)
    }
  }
}

function stepDetector(ctx: SimContext, dt: number) {
  const { state, rng } = ctx
  const robot = state.robot
  const coil = add(robot.pos, scale(headingVector(robot.heading), METAL_DETECTOR.offset))

  let strongest = 0
  let source: HiddenObject | null = null
  for (const h of state.hidden) {
    const d = distance(coil, h.pos)
    if (d > METAL_DETECTOR.sigma * 3) continue
    const s = h.size * Math.exp(-((d / METAL_DETECTOR.sigma) ** 2))
    if (s > strongest) {
      strongest = s
      source = h
    }
  }
  robot.metalSignal = clamp(strongest + rng.range(0, 0.04), 0, 1)

  if ((state.metalSampleTimer -= dt) <= 0) {
    state.metalSampleTimer = 0.25
    robot.metalHistory = [...robot.metalHistory.slice(-(METAL_HISTORY - 1)), robot.metalSignal]
  }

  // Register a contact at its peak, the way an operator pinpoints with a real detector:
  // follow the signal up past the threshold and log it once it starts to fall.
  const candidate = state.metalCandidate
  if (source && !source.found && strongest >= METAL_DETECTOR.threshold) {
    if (candidate?.object === source) {
      if (strongest > candidate.peak) state.metalCandidate = { object: source, peak: strongest }
      else if (strongest < candidate.peak - 0.05) registerContact(ctx, candidate.object, candidate.peak)
    } else {
      if (candidate) registerContact(ctx, candidate.object, candidate.peak)
      state.metalCandidate = { object: source, peak: strongest }
    }
  } else if (candidate) {
    registerContact(ctx, candidate.object, candidate.peak)
  }

  state.coverage.cover(coil, SURVEY.swath / 2, (cell) => {
    for (const zone of state.zones) {
      if (inRect(cell, zone.rect)) {
        state.zoneCells[zone.id].covered++
        state.zonesDirty = true
      }
    }
  })
}

function registerContact(ctx: SimContext, source: HiddenObject, strength: number) {
  const { state, rng } = ctx
  state.metalCandidate = null
  source.found = true
  const label = `M-${String(state.contacts.length + 1).padStart(2, '0')}`
  // The reported position carries some error, as a real detector's would.
  const pos = { x: source.pos.x + rng.range(-0.3, 0.3), y: source.pos.y + rng.range(-0.3, 0.3) }
  state.contacts = [...state.contacts, { id: source.id, label, pos, strength, zoneId: source.zoneId, time: ctx.clock() }]
  const zone = state.zones.find((z) => z.id === source.zoneId)
  if (zone) state.zones = state.zones.map((z) => (z === zone ? { ...z, contacts: z.contacts + 1 } : z))
  ctx.emit(
    'warning',
    'robot',
    `Metal contact ${label} — peak signal ${Math.round(strength * 100)}%, ${zone ? zone.name : 'outside sectors'}`,
  )
}
