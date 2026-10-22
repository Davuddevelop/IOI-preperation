import { add, angleDelta, bearing, clamp, distance, headingVector, scale, wrap360 } from '../geometry'
import { RADAR } from '../specs'
import type { AirClass, AirTarget, ThreatLevel } from '../types'
import type { Intruder, SimContext } from './state'

const MAX_INTRUDERS = 3
const SPAWN_DISTANCE = 95
const DESPAWN_DISTANCE = 112
/** Tracks drop a little further out than they start, so a target on the edge does not flicker. */
const LOSE_DISTANCE = RADAR.range + 8

export function threatLevel(classification: AirClass, dist: number): ThreatLevel {
  switch (classification) {
    case 'bird':
      return 'none'
    case 'unknown':
      return dist < 40 ? 'medium' : 'low'
    default:
      return dist < RADAR.highThreatRange ? 'high' : 'medium'
  }
}

function spawn(ctx: SimContext) {
  const { state, rng } = ctx
  // The first contact is always a loitering quadcopter, so a demo shows the
  // main threat early; after that the mix is random.
  const truth = state.intruderCount === 0 ? 'quadcopter' : rng.pick(['quadcopter', 'quadcopter', 'fixed-wing', 'bird'] as const)
  const from = rng.range(0, 360)
  const pos = add(state.robot.pos, scale(headingVector(from), SPAWN_DISTANCE))
  const inbound = wrap360(from + 180)
  const n = ++state.intruderCount

  const profile = {
    quadcopter: { speed: rng.range(7, 11), altitude: rng.range(30, 60), heading: inbound, behavior: 'inbound' },
    'fixed-wing': { speed: rng.range(16, 22), altitude: rng.range(60, 120), heading: wrap360(inbound + rng.range(-45, 45)), behavior: 'transit' },
    bird: { speed: rng.range(6, 10), altitude: rng.range(10, 30), heading: wrap360(inbound + rng.range(-30, 30)), behavior: 'wander' },
  } as const

  state.intruders.push({
    id: `T${n}`,
    label: `T-${String(n).padStart(2, '0')}`,
    truth,
    pos,
    ...profile[truth],
    behaviorTimer: truth === 'bird' ? rng.range(40, 70) : 0,
    loiterRadius: rng.range(25, 55),
    classifyAt: rng.range(0.6, 0.78),
    age: 0,
    tracked: false,
    trackTime: 0,
    firstSeen: 0,
    confidence: 0,
    classification: 'unknown',
    threat: 'low',
    announcedClass: false,
    announcedHigh: false,
  })
}

function turnTowards(t: Intruder, heading: number, rate: number, dt: number) {
  const delta = angleDelta(t.heading, heading)
  t.heading = wrap360(t.heading + clamp(delta, -rate * dt, rate * dt))
}

function steer(t: Intruder, ctx: SimContext, dt: number) {
  const robotPos = ctx.state.robot.pos
  const dist = distance(t.pos, robotPos)
  switch (t.behavior) {
    case 'inbound':
      turnTowards(t, bearing(t.pos, robotPos), 40, dt)
      if (dist < t.loiterRadius + 2) {
        t.behavior = 'loiter'
        t.behaviorTimer = ctx.rng.range(45, 90)
      }
      break
    case 'loiter': {
      // Circle the robot: fly tangentially, correcting inwards or outwards to hold the radius.
      const tangent = bearing(robotPos, t.pos) + 90
      turnTowards(t, tangent + clamp((dist - t.loiterRadius) * 3, -60, 60), 60, dt)
      if ((t.behaviorTimer -= dt) <= 0) t.behavior = 'outbound'
      break
    }
    case 'outbound':
      turnTowards(t, bearing(robotPos, t.pos), 40, dt)
      break
    case 'wander':
      t.heading = wrap360(t.heading + ctx.rng.range(-50, 50) * dt)
      if ((t.behaviorTimer -= dt) <= 0) t.behavior = 'outbound'
      break
    case 'transit':
      break
  }
}

function track(t: Intruder, ctx: SimContext, dt: number) {
  const robotPos = ctx.state.robot.pos
  const dist = distance(t.pos, robotPos)
  const brg = Math.round(bearing(robotPos, t.pos))

  if (!t.tracked && dist <= RADAR.range) {
    t.tracked = true
    t.trackTime = 0
    t.firstSeen = ctx.clock()
    ctx.emit('warning', 'radar', `Air contact ${t.label} detected — ${Math.round(dist)} m, bearing ${brg}°`)
  } else if (t.tracked && dist > LOSE_DISTANCE) {
    t.tracked = false
    t.confidence = 0
    t.classification = 'unknown'
    t.announcedClass = false
    ctx.emit('info', 'radar', `${t.label} left radar coverage`)
  }
  if (!t.tracked) return

  // The classifier grows more certain the longer it watches and the closer the target gets.
  t.trackTime += dt
  const proximity = 1 - dist / RADAR.range
  const target = clamp(0.3 + t.trackTime * 0.035 + proximity * 0.45, 0, 0.97)
  t.confidence = clamp(t.confidence + (target - t.confidence) * Math.min(1, dt) + ctx.rng.range(-0.01, 0.01), 0, 0.99)
  t.classification = t.confidence >= t.classifyAt ? t.truth : 'unknown'
  t.threat = threatLevel(t.classification, dist)

  if (t.classification !== 'unknown' && !t.announcedClass) {
    t.announcedClass = true
    const pct = Math.round(t.confidence * 100)
    // Info, not an alert: it refines a contact the operator was already warned about.
    const verdict = t.classification === 'bird' ? ' — no threat' : ''
    ctx.emit('info', 'radar', `${t.label} classified as ${t.classification} (${pct}%)${verdict}`)
  }
  if (t.threat === 'high' && !t.announcedHigh) {
    t.announcedHigh = true
    ctx.emit('critical', 'radar', `High threat: ${t.label} ${t.classification} at ${Math.round(dist)} m, bearing ${brg}°`)
  }
}

export function stepAirTraffic(ctx: SimContext, dt: number) {
  const { state, rng } = ctx
  if (state.elapsed >= state.nextIntruderAt) {
    if (state.intruders.length < MAX_INTRUDERS) spawn(ctx)
    state.nextIntruderAt = state.elapsed + rng.range(25, 60)
  }

  for (const t of state.intruders) {
    t.age += dt
    steer(t, ctx, dt)
    t.pos = add(t.pos, scale(headingVector(t.heading), t.speed * dt))
    t.altitude = Math.max(5, t.altitude + Math.sin(t.age * 0.7) * 0.6 * dt)
    track(t, ctx, dt)
  }

  state.intruders = state.intruders.filter((t) => t.age < 300 && distance(t.pos, state.robot.pos) < DESPAWN_DISTANCE)
}

const THREAT_ORDER: Record<ThreatLevel, number> = { high: 0, medium: 1, low: 2, none: 3 }

/** The tracked targets as the UI sees them, most dangerous first. */
export function trackedTargets(ctx: SimContext): AirTarget[] {
  const robotPos = ctx.state.robot.pos
  return ctx.state.intruders
    .filter((t) => t.tracked)
    .map((t) => ({
      id: t.id,
      label: t.label,
      pos: { ...t.pos },
      altitude: t.altitude,
      heading: t.heading,
      speed: t.speed,
      classification: t.classification,
      confidence: t.confidence,
      threat: t.threat,
      distance: distance(t.pos, robotPos),
      bearing: bearing(robotPos, t.pos),
      firstSeen: t.firstSeen,
    }))
    .sort((a, b) => THREAT_ORDER[a.threat] - THREAT_ORDER[b.threat] || a.distance - b.distance)
}
