import { describe, expect, it } from 'vitest'
import { distance, inRect } from '../geometry'
import { ROBOT, SURVEY } from '../specs'
import { Simulator } from './Simulator'
import { planSurvey } from './survey'

/** Runs the simulator in fixed chunks until `done` holds or time runs out. */
function runUntil(sim: Simulator, done: () => boolean, maxSeconds: number) {
  for (let t = 0; t < maxSeconds && !done(); t += 1) sim.advance(1)
}

describe('survey planning', () => {
  const rect = { x: 10, y: 20, w: 30, h: 12 }
  const lanes = planSurvey(rect, { x: 0, y: 0 })

  it('keeps every waypoint inside the zone', () => {
    for (const p of lanes) expect(inRect(p, rect)).toBe(true)
  })

  it('spaces lanes no wider than the detector swath', () => {
    const ys = [...new Set(lanes.map((p) => p.y))].sort((a, b) => a - b)
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeLessThanOrEqual(SURVEY.swath)
  })

  it('starts at the corner nearest the robot', () => {
    expect(lanes[0].x).toBeLessThan(rect.x + rect.w / 2)
    expect(lanes[0].y).toBeLessThan(rect.y + rect.h / 2)
  })
})

describe('Simulator', () => {
  it('is deterministic for a given seed', () => {
    const a = new Simulator({ seed: 3 })
    const b = new Simulator({ seed: 3 })
    a.advance(60)
    b.advance(60)
    expect(a.getSnapshot().robot.pos).toEqual(b.getSnapshot().robot.pos)
    expect(a.getSnapshot().events.map((e) => e.message)).toEqual(b.getSnapshot().events.map((e) => e.message))
  })

  it('never drives the robot into an obstacle', () => {
    const sim = new Simulator()
    const { obstacles } = sim.getSnapshot().map
    for (let t = 0; t < 600; t++) {
      sim.advance(1)
      const { pos } = sim.getSnapshot().robot
      for (const o of obstacles) expect(distance(pos, o.pos)).toBeGreaterThanOrEqual(o.radius + ROBOT.radius - 1e-6)
    }
  })

  it('surveys the first sector and finds buried metal', () => {
    const sim = new Simulator()
    const sectorA = () => sim.getSnapshot().zones.find((z) => z.id === 'A')!
    runUntil(sim, () => sectorA().status === 'surveyed', 1500)

    expect(sectorA().status).toBe('surveyed')
    expect(sectorA().coverage).toBeGreaterThan(0.85)
    expect(sectorA().contacts).toBeGreaterThan(0)
    // It moves straight on to the next sector.
    expect(sim.getSnapshot().robot.surveyZoneId).not.toBeNull()
  })

  it('launches the drone through the bay and lands it again', () => {
    const sim = new Simulator()
    sim.send({ type: 'drone/launch' })
    expect(sim.getSnapshot().drone.phase).toBe('launching')

    runUntil(sim, () => sim.getSnapshot().drone.phase === 'airborne', 30)
    expect(sim.getSnapshot().drone.phase).toBe('airborne')
    runUntil(sim, () => sim.getSnapshot().robot.lid === 'closed', 5)
    expect(sim.getSnapshot().robot.lid).toBe('closed')

    sim.send({ type: 'drone/return' })
    runUntil(sim, () => sim.getSnapshot().drone.phase === 'docked', 60)
    expect(sim.getSnapshot().drone.phase).toBe('docked')
    runUntil(sim, () => sim.getSnapshot().robot.lid === 'closed', 5)
    expect(sim.getSnapshot().robot.lid).toBe('closed')
  })

  it('holds the robot still while the drone takes off', () => {
    const sim = new Simulator()
    sim.advance(20)
    sim.send({ type: 'drone/launch' })
    sim.advance(3)
    const before = sim.getSnapshot().robot.pos
    sim.advance(2)
    expect(sim.getSnapshot().robot.interlock).toMatch(/launch/i)
    expect(distance(sim.getSnapshot().robot.pos, before)).toBeLessThan(0.1)
  })

  it('detects, classifies and raises alerts for aerial intruders', () => {
    const sim = new Simulator()
    runUntil(sim, () => sim.getSnapshot().airTargets.some((t) => t.classification !== 'unknown'), 240)
    const target = sim.getSnapshot().airTargets.find((t) => t.classification !== 'unknown')
    expect(target).toBeDefined()
    expect(target!.confidence).toBeGreaterThanOrEqual(0.6)
    expect(sim.getSnapshot().events.some((e) => e.category === 'radar' && !e.acknowledged)).toBe(true)
  })

  it('switches to manual when the operator drives, and acknowledges alerts', () => {
    const sim = new Simulator()
    sim.send({ type: 'robot/drive', throttle: 1, turn: 0 })
    expect(sim.getSnapshot().robot.mode).toBe('manual')

    runUntil(sim, () => sim.getSnapshot().events.some((e) => !e.acknowledged), 240)
    sim.send({ type: 'events/acknowledge', id: 'all' })
    expect(sim.getSnapshot().events.every((e) => e.acknowledged)).toBe(true)
  })

  it('keeps the same snapshot object until something changes', () => {
    const sim = new Simulator()
    expect(sim.getSnapshot()).toBe(sim.getSnapshot())
    const before = sim.getSnapshot()
    sim.advance(0.1)
    expect(sim.getSnapshot()).not.toBe(before)
    // Unchanged pieces keep their identity, so React components that use them skip re-rendering.
    expect(sim.getSnapshot().map).toBe(before.map)
  })
})
