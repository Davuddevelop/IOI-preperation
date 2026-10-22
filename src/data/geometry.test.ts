import { describe, expect, it } from 'vitest'
import { angleDelta, bearing, headingVector, rayCircle, rayExitRect } from './geometry'

describe('compass conventions', () => {
  it('measures bearings clockwise from north, with y pointing south', () => {
    const o = { x: 0, y: 0 }
    expect(bearing(o, { x: 0, y: -1 })).toBeCloseTo(0)
    expect(bearing(o, { x: 1, y: 0 })).toBeCloseTo(90)
    expect(bearing(o, { x: 0, y: 1 })).toBeCloseTo(180)
    expect(bearing(o, { x: -1, y: 0 })).toBeCloseTo(270)
  })

  it('turns a heading into the matching unit vector', () => {
    const east = headingVector(90)
    expect(east.x).toBeCloseTo(1)
    expect(east.y).toBeCloseTo(0)
  })

  it('finds the short way round between headings', () => {
    expect(angleDelta(350, 10)).toBeCloseTo(20)
    expect(angleDelta(10, 350)).toBeCloseTo(-20)
    expect(angleDelta(0, 180)).toBeCloseTo(180)
  })
})

describe('ray casting', () => {
  const east = { x: 1, y: 0 }

  it('hits the near surface of a circle', () => {
    expect(rayCircle({ x: 0, y: 0 }, east, { x: 5, y: 0 }, 1)).toBeCloseTo(4)
  })

  it('misses circles that are beside or behind the ray', () => {
    expect(rayCircle({ x: 0, y: 0 }, east, { x: 5, y: 3 }, 1)).toBeNull()
    expect(rayCircle({ x: 0, y: 0 }, east, { x: -5, y: 0 }, 1)).toBeNull()
  })

  it('reports zero from inside a circle', () => {
    expect(rayCircle({ x: 0, y: 0 }, east, { x: 0.5, y: 0 }, 1)).toBe(0)
  })

  it('measures the distance to a rectangle edge from inside', () => {
    expect(rayExitRect({ x: 2, y: 3 }, east, { x: 0, y: 0, w: 10, h: 10 })).toBeCloseTo(8)
  })
})
