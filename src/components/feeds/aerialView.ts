import { DEG, clamp } from '../../data/geometry'
import { DRONE, SURVEY } from '../../data/specs'
import type { Vec2, WorldSnapshot } from '../../data/types'
import type { Frame } from '../../hooks/useCanvasLoop'
import { drawGrain, drawStatic, drawVignette, hash2 } from './effects'

/** Metres covered by one repeat of the ground texture. */
const TILE_METRES = 16
const patterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern>()

function groundPattern(ctx: CanvasRenderingContext2D) {
  let pattern = patterns.get(ctx)
  if (pattern) return pattern
  const tile = document.createElement('canvas')
  tile.width = tile.height = 128
  const g = tile.getContext('2d')!
  g.fillStyle = '#56553e'
  g.fillRect(0, 0, 128, 128)
  const colors = ['rgba(70,82,48,0.55)', 'rgba(104,98,70,0.5)', 'rgba(52,60,38,0.5)', 'rgba(120,112,84,0.35)']
  for (let i = 0; i < 220; i++) {
    g.fillStyle = colors[i % colors.length]
    g.beginPath()
    g.arc(hash2(i, 1) * 128, hash2(i, 2) * 128, 1 + hash2(i, 3) * 7, 0, Math.PI * 2)
    g.fill()
  }
  pattern = ctx.createPattern(tile, 'repeat')!
  pattern.setTransform(new DOMMatrix().scale(TILE_METRES / 128))
  patterns.set(ctx, pattern)
  return pattern
}

/**
 * The drone's downward camera. The canvas is transformed so one unit equals one
 * metre and the drone sits in the centre; the world is then drawn in world
 * coordinates. Higher altitude means a wider view and therefore a smaller scale.
 */
export function renderAerialView(ctx: CanvasRenderingContext2D, snap: WorldSnapshot, { width: w, height: h, time }: Frame) {
  const { drone, robot, map, contacts, zones } = snap
  if (drone.phase === 'docked') {
    drawStatic(ctx, w, h)
    return
  }

  const altitude = Math.max(drone.altitude, 1.5)
  const viewWidth = 2 * altitude * Math.tan((DRONE.fov * DEG) / 2)
  const s = w / viewWidth
  // A hovering drone is never perfectly still.
  const cam = { x: drone.pos.x + Math.sin(time * 1.9) * 0.12, y: drone.pos.y + Math.cos(time * 1.6) * 0.12 }
  const toScreen = (p: Vec2) => ({ x: w / 2 + (p.x - cam.x) * s, y: h / 2 + (p.y - cam.y) * s })

  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(s, s)
  ctx.translate(-cam.x, -cam.y)

  ctx.fillStyle = '#2b2b21'
  ctx.fillRect(cam.x - viewWidth, cam.y - viewWidth, viewWidth * 2, viewWidth * 2)
  ctx.fillStyle = groundPattern(ctx)
  ctx.fillRect(0, 0, map.width, map.height)

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const f of map.features) {
    ctx.strokeStyle = f.kind === 'road' ? '#6a6453' : '#2b4c5e'
    ctx.lineWidth = f.kind === 'road' ? 3.5 : 1.8
    ctx.beginPath()
    f.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.stroke()
  }

  // Overlay: the strip the metal detector has already swept.
  if (robot.trail.length > 1) {
    ctx.strokeStyle = 'rgba(79,227,161,0.14)'
    ctx.lineWidth = SURVEY.swath
    ctx.beginPath()
    robot.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(219,230,224,0.45)'
  ctx.lineWidth = 1.5 / s
  ctx.setLineDash([6 / s, 4 / s])
  for (const z of zones) ctx.strokeRect(z.rect.x, z.rect.y, z.rect.w, z.rect.h)
  ctx.setLineDash([])

  const margin = viewWidth
  for (const o of map.obstacles) {
    if (Math.abs(o.pos.x - cam.x) > margin || Math.abs(o.pos.y - cam.y) > margin) continue
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.arc(o.pos.x + o.radius * 0.35, o.pos.y + o.radius * 0.35, o.radius * (o.kind === 'tree' ? 1.45 : 1.05), 0, Math.PI * 2)
    ctx.fill()
    const r = o.kind === 'tree' ? o.radius * 1.4 : o.radius
    const g = ctx.createRadialGradient(o.pos.x - r * 0.3, o.pos.y - r * 0.3, r * 0.1, o.pos.x, o.pos.y, r)
    const [light, dark] =
      o.kind === 'tree' ? ['#46744b', '#1d3826'] : o.kind === 'rock' ? ['#878c83', '#474b45'] : ['#7c6a57', '#463a2f']
    g.addColorStop(0, light)
    g.addColorStop(1, dark)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(o.pos.x, o.pos.y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  drawRobotFromAbove(ctx, robot.pos, robot.heading, robot.lidOpen)
  ctx.restore()

  // Labels are drawn in screen space so text stays the same size at any altitude.
  const fontSize = clamp(w / 55, 10, 13)
  ctx.font = `600 ${fontSize}px ui-monospace, monospace`
  ctx.textAlign = 'left'
  for (const c of contacts) {
    const p = toScreen(c.pos)
    if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) continue
    ctx.fillStyle = '#f2cf5b'
    ctx.beginPath()
    ctx.moveTo(p.x, p.y - 6)
    ctx.lineTo(p.x + 6, p.y)
    ctx.lineTo(p.x, p.y + 6)
    ctx.lineTo(p.x - 6, p.y)
    ctx.closePath()
    ctx.fill()
    ctx.fillText(c.label, p.x + 9, p.y + 4)
  }

  const rp = toScreen(robot.pos)
  const box = Math.max(14, 1.6 * s)
  ctx.strokeStyle = '#4fe3a1'
  ctx.lineWidth = 1.5
  corners(ctx, rp.x, rp.y, box)
  ctx.fillStyle = '#4fe3a1'
  ctx.fillText('MINOTAUR', rp.x + box + 4, rp.y - box + fontSize)

  drawGrain(ctx, w, h, 0.1)
  drawVignette(ctx, w, h, 0.45)
}

function drawRobotFromAbove(ctx: CanvasRenderingContext2D, pos: Vec2, heading: number, lidOpen: number) {
  ctx.save()
  ctx.translate(pos.x, pos.y)
  ctx.rotate(heading * DEG)
  ctx.fillStyle = '#1b1e19'
  ctx.fillRect(-0.47, -0.6, 0.2, 1.2)
  ctx.fillRect(0.27, -0.6, 0.2, 1.2)
  ctx.fillStyle = '#4c5b40'
  ctx.fillRect(-0.3, -0.56, 0.6, 1.12)
  // Bay: the lid slides back as it opens, revealing the dark cavity.
  ctx.fillStyle = '#0c0e0b'
  ctx.fillRect(-0.2, -0.32, 0.4, 0.56)
  ctx.fillStyle = '#6a7a5c'
  ctx.fillRect(-0.22, -0.34 + lidOpen * 0.5, 0.44, 0.6 * (1 - lidOpen) + 0.06)
  ctx.fillStyle = '#d8ffe9'
  ctx.fillRect(-0.12, -0.6, 0.24, 0.06)
  ctx.restore()
}

/** Four corner brackets around a point, like a targeting box. */
function corners(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const l = r * 0.45
  ctx.beginPath()
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    ctx.moveTo(x + sx * r, y + sy * (r - l))
    ctx.lineTo(x + sx * r, y + sy * r)
    ctx.lineTo(x + sx * (r - l), y + sy * r)
  }
  ctx.stroke()
}
