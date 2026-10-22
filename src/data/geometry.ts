import type { Rect, Vec2 } from './types'

export const DEG = Math.PI / 180

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k })
export const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y
export const length = (a: Vec2) => Math.hypot(a.x, a.y)
export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y)
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function normalize(a: Vec2): Vec2 {
  const l = length(a)
  return l > 1e-9 ? scale(a, 1 / l) : { x: 0, y: 0 }
}

/** Moves `value` towards `target` by at most `step`. */
export function approach(value: number, target: number, step: number) {
  return value < target ? Math.min(value + step, target) : Math.max(value - step, target)
}

export const wrap360 = (deg: number) => ((deg % 360) + 360) % 360

/** Signed shortest rotation from heading `a` to heading `b`, in (−180, 180]. */
export function angleDelta(a: number, b: number) {
  const d = wrap360(b - a)
  return d > 180 ? d - 360 : d
}

/** Unit vector pointing along a compass heading (0° = north = −y). */
export function headingVector(deg: number): Vec2 {
  return { x: Math.sin(deg * DEG), y: -Math.cos(deg * DEG) }
}

/** Compass heading of a direction vector, 0–360°. */
export function vectorHeading(v: Vec2) {
  return wrap360(Math.atan2(v.x, -v.y) / DEG)
}

/** Compass bearing from one point to another, 0–360°. */
export function bearing(from: Vec2, to: Vec2) {
  return vectorHeading(sub(to, from))
}

export function inRect(p: Vec2, r: Rect, margin = 0) {
  return (
    p.x >= r.x - margin && p.x <= r.x + r.w + margin && p.y >= r.y - margin && p.y <= r.y + r.h + margin
  )
}

/**
 * Distance along a ray (unit `dir`) to the first point on a circle, or null if
 * the ray misses. Returns 0 when the origin is already inside the circle.
 */
export function rayCircle(origin: Vec2, dir: Vec2, center: Vec2, radius: number): number | null {
  const f = sub(origin, center)
  const c = dot(f, f) - radius * radius
  if (c <= 0) return 0
  const b = dot(f, dir)
  const disc = b * b - c
  if (disc < 0) return null
  const t = -b - Math.sqrt(disc)
  return t >= 0 ? t : null
}

/** Distance along a ray from a point inside `r` to the rectangle's edge. */
export function rayExitRect(origin: Vec2, dir: Vec2, r: Rect) {
  const tx = dir.x > 0 ? (r.x + r.w - origin.x) / dir.x : dir.x < 0 ? (r.x - origin.x) / dir.x : Infinity
  const ty = dir.y > 0 ? (r.y + r.h - origin.y) / dir.y : dir.y < 0 ? (r.y - origin.y) / dir.y : Infinity
  return Math.max(0, Math.min(tx, ty))
}
