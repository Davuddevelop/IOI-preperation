import { distance, inRect } from '../geometry'
import type { Obstacle, ObstacleKind, Rect, TerrainFeature, Vec2, WorldMap } from '../types'
import { createRandom } from './random'

/** A buried metal object. The robot does not know these exist until its detector finds one. */
export interface HiddenObject {
  id: string
  pos: Vec2
  /** Signal multiplier, 0–1: bigger objects ring louder. */
  size: number
  zoneId: string | null
  found: boolean
}

export interface ZoneDef {
  id: string
  name: string
  description: string
  rect: Rect
}

export interface World {
  map: WorldMap
  zones: ZoneDef[]
  hidden: HiddenObject[]
}

export const WORLD_WIDTH = 120
export const WORLD_HEIGHT = 80
const BASE: Vec2 = { x: 8, y: 72 }

export const ZONE_DEFS: ZoneDef[] = [
  { id: 'A', name: 'Sector A', description: 'Open field', rect: { x: 16, y: 46, w: 32, h: 24 } },
  { id: 'B', name: 'Sector B', description: 'Ruins', rect: { x: 58, y: 48, w: 34, h: 22 } },
  { id: 'C', name: 'Sector C', description: 'Treeline', rect: { x: 18, y: 8, w: 36, h: 26 } },
  { id: 'D', name: 'Sector D', description: 'Crossroads', rect: { x: 70, y: 10, w: 38, h: 26 } },
]

const FEATURES: TerrainFeature[] = [
  {
    kind: 'stream',
    points: [
      { x: 0, y: 41 },
      { x: 12, y: 38 },
      { x: 26, y: 42 },
      { x: 40, y: 38 },
      { x: 52, y: 41 },
      { x: 64, y: 44 },
    ],
  },
  {
    kind: 'road',
    points: [
      { x: 0, y: 77 },
      { x: 30, y: 76 },
      { x: 56, y: 74 },
      { x: 66, y: 42 },
      { x: 89, y: 40 },
      { x: 120, y: 38 },
    ],
  },
  {
    kind: 'road',
    points: [
      { x: 89, y: 0 },
      { x: 89, y: 40 },
    ],
  },
]

const shrink = (r: Rect, m: number): Rect => ({ x: r.x + m, y: r.y + m, w: r.w - 2 * m, h: r.h - 2 * m })

/** Builds the same terrain, obstacles and buried objects for the same seed. */
export function generateWorld(seed: number): World {
  const rng = createRandom(seed)
  const obstacles: Obstacle[] = []

  // Obstacles keep a 2.5 m gap from each other so the robot can always pass between them.
  const place = (kind: ObstacleKind, count: number, area: Rect, rMin: number, rMax: number, outsideZones = false) => {
    for (let placed = 0, tries = 0; placed < count && tries < count * 60; tries++) {
      const radius = rng.range(rMin, rMax)
      const pos = { x: rng.range(area.x, area.x + area.w), y: rng.range(area.y, area.y + area.h) }
      if (distance(pos, BASE) < 10) continue
      if (obstacles.some((o) => distance(o.pos, pos) < o.radius + radius + 2.5)) continue
      if (outsideZones && ZONE_DEFS.some((z) => inRect(pos, z.rect, radius + 3))) continue
      obstacles.push({ id: `O${obstacles.length + 1}`, kind, pos, radius })
      placed++
    }
  }

  const [a, b, c, d] = ZONE_DEFS
  // Inside zones, stay 4 m from the edges so survey lane ends are always reachable.
  place('rock', 4, shrink(a.rect, 4), 0.6, 1.4)
  place('rubble', 7, shrink(b.rect, 4), 0.7, 1.8)
  place('tree', 9, shrink(c.rect, 4), 0.8, 1.6)
  place('rock', 5, shrink(d.rect, 4), 0.6, 1.6)
  place('tree', 10, { x: 2, y: 2, w: WORLD_WIDTH - 4, h: WORLD_HEIGHT - 4 }, 0.9, 2.2, true)

  const hidden: HiddenObject[] = []
  const placeHidden = (count: number, area: Rect, zoneId: string | null) => {
    for (let placed = 0, tries = 0; placed < count && tries < count * 60; tries++) {
      const pos = { x: rng.range(area.x, area.x + area.w), y: rng.range(area.y, area.y + area.h) }
      if (obstacles.some((o) => distance(o.pos, pos) < o.radius + 1)) continue
      if (hidden.some((h) => distance(h.pos, pos) < 3)) continue
      if (zoneId === null && ZONE_DEFS.some((z) => inRect(pos, z.rect))) continue
      hidden.push({ id: `H${hidden.length + 1}`, pos, size: rng.range(0.75, 1), zoneId, found: false })
      placed++
    }
  }
  for (const zone of ZONE_DEFS) placeHidden(rng.int(4, 6), shrink(zone.rect, 1.5), zone.id)
  placeHidden(3, { x: 4, y: 4, w: WORLD_WIDTH - 8, h: WORLD_HEIGHT - 8 }, null)

  return {
    map: { width: WORLD_WIDTH, height: WORLD_HEIGHT, base: BASE, obstacles, features: FEATURES },
    zones: ZONE_DEFS,
    hidden,
  }
}
