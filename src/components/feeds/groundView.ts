import { DEG, clamp, distance, dot, headingVector, sub } from '../../data/geometry'
import { CAMERA } from '../../data/specs'
import type { Obstacle, Vec2, WorldSnapshot } from '../../data/types'
import type { Frame } from '../../hooks/useCanvasLoop'
import { drawGrain, drawVignette, hash2 } from './effects'

const MAX_DISTANCE = 40
const TUFT_CELL = 1.3
const TUFT_RANGE = 22
const FOG: RGB = [138, 152, 144]

type RGB = [number, number, number]
const mix = (a: RGB, b: RGB, t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`

/**
 * The robot's front camera: a pinhole projection of the simulated world.
 * A world point is converted to camera space (how far ahead, how far right),
 * then divided by the distance ahead — that division is what makes far things
 * small and makes everything converge on the horizon.
 */
export function renderGroundView(ctx: CanvasRenderingContext2D, snap: WorldSnapshot, { width: w, height: h, time }: Frame) {
  const { robot, map, contacts } = snap
  const ahead = headingVector(robot.heading)
  const right = headingVector(robot.heading + 90)
  const focal = w / 2 / Math.tan((CAMERA.fov * DEG) / 2)
  // Driving over rough ground shakes the camera a little.
  const horizon = h * 0.44 + Math.sin(time * 12) * Math.min(1, Math.abs(robot.speed)) * 1.2

  const project = (p: Vec2, above = 0) => {
    const d = sub(p, robot.pos)
    const z = dot(d, ahead)
    if (z < 0.3) return null
    return { x: w / 2 + (dot(d, right) / z) * focal, y: horizon + ((CAMERA.height - above) / z) * focal, z, scale: focal / z }
  }

  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, horizon)
  sky.addColorStop(0, '#2c434f')
  sky.addColorStop(1, '#94a49c')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, horizon + 1)

  // Two ridgelines whose shape depends on compass direction, so they slide past as the robot turns.
  const ridge = (color: string, amp: number, phase: number) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, horizon)
    for (let x = 0; x <= w + 4; x += 4) {
      const a = robot.heading * DEG + Math.atan((x - w / 2) / focal)
      const y = 5 + 3 * Math.sin(a * 3 + phase) + 2 * Math.sin(a * 7 + 1.3 + phase) + 1.2 * Math.sin(a * 17 + 0.4)
      ctx.lineTo(x, horizon - y * amp * (h / 240))
    }
    ctx.lineTo(w, horizon)
    ctx.closePath()
    ctx.fill()
  }
  ridge('#55665c', 1.4, 0)
  ridge('#3a4a40', 0.8, 2.1)

  // Ground.
  const ground = ctx.createLinearGradient(0, horizon, 0, h)
  ground.addColorStop(0, '#6d6c54')
  ground.addColorStop(0.35, '#504d3a')
  ground.addColorStop(1, '#29271c')
  ctx.fillStyle = ground
  ctx.fillRect(0, horizon, w, h - horizon)

  const haze = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 28)
  haze.addColorStop(0, 'rgba(160,172,165,0)')
  haze.addColorStop(0.4, 'rgba(160,172,165,0.4)')
  haze.addColorStop(1, 'rgba(160,172,165,0)')
  ctx.fillStyle = haze
  ctx.fillRect(0, horizon - 10, w, 38)

  // Grass and pebbles pinned to world cells, so the ground visibly flows past when driving.
  const gx0 = Math.floor((robot.pos.x - TUFT_RANGE) / TUFT_CELL)
  const gx1 = Math.floor((robot.pos.x + TUFT_RANGE) / TUFT_CELL)
  const gy0 = Math.floor((robot.pos.y - TUFT_RANGE) / TUFT_CELL)
  const gy1 = Math.floor((robot.pos.y + TUFT_RANGE) / TUFT_CELL)
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gy = gy0; gy <= gy1; gy++) {
      const r = hash2(gx, gy)
      const s = project({ x: (gx + hash2(gx, gy, 1)) * TUFT_CELL, y: (gy + hash2(gx, gy, 2)) * TUFT_CELL })
      if (!s || s.x < -20 || s.x > w + 20 || s.y > h + 20) continue
      const size = (0.05 + r * 0.07) * s.scale
      if (size < 0.5) continue
      ctx.beginPath()
      if (r > 0.55) {
        ctx.fillStyle = 'rgba(38,44,26,0.6)'
        ctx.moveTo(s.x - size, s.y)
        ctx.lineTo(s.x - size * 0.2, s.y - size * 2.4)
        ctx.lineTo(s.x + size * 0.3, s.y - size * 1.4)
        ctx.lineTo(s.x + size, s.y)
      } else {
        ctx.fillStyle = 'rgba(128,124,98,0.5)'
        ctx.ellipse(s.x, s.y, size, size * 0.45, 0, 0, Math.PI * 2)
      }
      ctx.fill()
    }
  }

  // Obstacles, painted far to near so close ones cover distant ones.
  const visible = map.obstacles
    .map((o) => ({ o, s: project(o.pos) }))
    .filter((v): v is { o: Obstacle; s: NonNullable<typeof v.s> } => v.s !== null && v.s.z < MAX_DISTANCE)
    .sort((a, b) => b.s.z - a.s.z)
  for (const { o, s } of visible) {
    const r = o.radius * s.scale
    if (s.x + r * 2 < 0 || s.x - r * 2 > w) continue
    // Light haze only: heavy fog turns distant trees into pale discs that read as a moon.
    drawObstacle(ctx, o, s, clamp(s.z / MAX_DISTANCE, 0, 1) * 0.5)
  }

  // Augmented-reality markers over registered metal contacts.
  ctx.font = `500 ${clamp(w / 55, 10, 12)}px 'IBM Plex Mono', ui-monospace, monospace`
  ctx.textAlign = 'center'
  for (const c of contacts) {
    const ground = project(c.pos)
    const top = project(c.pos, 0.7)
    if (!ground || !top || ground.z > 25) continue
    // Same caution triangle as on the map.
    const size = clamp(0.16 * ground.scale, 4, 12)
    ctx.strokeStyle = 'rgba(232,163,61,0.9)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(ground.x, ground.y)
    ctx.lineTo(top.x, top.y)
    ctx.stroke()
    ctx.fillStyle = '#e8a33d'
    ctx.beginPath()
    ctx.moveTo(top.x, top.y - size)
    ctx.lineTo(top.x + size, top.y + size * 0.75)
    ctx.lineTo(top.x - size, top.y + size * 0.75)
    ctx.closePath()
    ctx.fill()
    ctx.fillText(`${c.label} ${distance(robot.pos, c.pos).toFixed(1)}m`, top.x, top.y - size - 5)
  }

  drawGrain(ctx, w, h, 0.1)
  drawVignette(ctx, w, h, 0.35)
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  o: Obstacle,
  s: { x: number; y: number; scale: number },
  fog: number,
) {
  const m = s.scale
  ctx.beginPath()
  if (o.kind === 'tree') {
    ctx.fillStyle = mix([46, 38, 28], FOG, fog)
    ctx.fillRect(s.x - 0.15 * m, s.y - 2.4 * m, 0.3 * m, 2.4 * m)
    ctx.fillStyle = mix([34, 62, 40], FOG, fog)
    ctx.arc(s.x, s.y - 3.1 * m, o.radius * 1.4 * m, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = mix([52, 86, 56], FOG, fog)
    ctx.beginPath()
    ctx.arc(s.x - o.radius * 0.4 * m, s.y - 3.5 * m, o.radius * 0.8 * m, 0, Math.PI * 2)
  } else if (o.kind === 'rock') {
    const height = o.radius * 0.8 * m
    ctx.fillStyle = mix([84, 90, 86], FOG, fog)
    ctx.ellipse(s.x, s.y - height * 0.45, o.radius * m, height * 0.65, 0, Math.PI, 0)
    ctx.lineTo(s.x + o.radius * m, s.y)
    ctx.lineTo(s.x - o.radius * m, s.y)
  } else {
    // Rubble: an irregular heap; vertex heights come from a hash of the obstacle id so it keeps its shape.
    const seed = Number(o.id.slice(1))
    ctx.fillStyle = mix([92, 78, 64], FOG, fog)
    ctx.moveTo(s.x - o.radius * m, s.y)
    for (let i = 1; i < 6; i++) {
      const x = s.x - o.radius * m + (i / 6) * 2 * o.radius * m
      ctx.lineTo(x, s.y - (0.3 + hash2(seed, i) * 0.9) * o.radius * m)
    }
    ctx.lineTo(s.x + o.radius * m, s.y)
  }
  ctx.closePath()
  ctx.fill()
}
