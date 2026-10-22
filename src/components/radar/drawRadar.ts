import { DEG, bearing, distance, headingVector, wrap360 } from '../../data/geometry'
import { RADAR } from '../../data/specs'
import type { ThreatLevel, WorldSnapshot } from '../../data/types'
import type { Frame } from '../../hooks/useCanvasLoop'
import { airShape, type AirShape } from '../map/symbols'

export const SWEEP_SECONDS = 3
const TAU = Math.PI * 2
const FONT = "'IBM Plex Mono', ui-monospace, monospace"

// Canvas cannot read CSS variables cheaply every frame, so the palette from tokens.css is mirrored here.
const INK = '233,233,231'
const THREAT_RGB: Record<ThreatLevel, string> = {
  high: '239,95,87',
  medium: '232,163,61',
  low: '164,165,169',
  none: '128,130,135',
}
const FRIENDLY = '#6aa9e9'

export interface ScopeGeometry {
  cx: number
  cy: number
  radius: number
}

/** Screen position of something at a compass bearing and distance from the robot. North is up. */
export function blipPosition(bearingDeg: number, dist: number, g: ScopeGeometry) {
  const r = (g.radius * Math.min(dist, RADAR.range * 1.1)) / RADAR.range
  return { x: g.cx + r * Math.sin(bearingDeg * DEG), y: g.cy - r * Math.cos(bearingDeg * DEG) }
}

/** Draws one frame of the radar scope; returns its geometry for hit-testing clicks. */
export function drawRadar(
  ctx: CanvasRenderingContext2D,
  snap: WorldSnapshot,
  { width: w, height: h, time }: Frame,
  selectedId: string | null,
): ScopeGeometry {
  const g = { cx: w / 2, cy: h / 2, radius: Math.min(w, h) / 2 - 24 }
  const { cx, cy, radius: R } = g
  ctx.clearRect(0, 0, w, h)
  ctx.lineWidth = 1

  // Range rings, labelled once.
  ctx.font = `400 10px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  for (const m of [20, 40, 60]) {
    const r = (R * m) / RADAR.range
    ctx.strokeStyle = `rgba(${INK},0.09)`
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, TAU)
    ctx.stroke()
    ctx.fillStyle = `rgba(${INK},0.4)`
    ctx.fillText(`${m}`, cx + 4, cy - r + 11)
  }
  ctx.setLineDash([3, 4])
  ctx.strokeStyle = `rgba(${THREAT_RGB.high},0.45)`
  ctx.beginPath()
  ctx.arc(cx, cy, (R * RADAR.highThreatRange) / RADAR.range, 0, TAU)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.strokeStyle = `rgba(${INK},0.22)`
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, TAU)
  ctx.stroke()

  // Axes and bearing ticks.
  ctx.strokeStyle = `rgba(${INK},0.06)`
  ctx.beginPath()
  ctx.moveTo(cx - R, cy)
  ctx.lineTo(cx + R, cy)
  ctx.moveTo(cx, cy - R)
  ctx.lineTo(cx, cy + R)
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let d = 0; d < 360; d += 10) {
    const v = headingVector(d)
    const inner = R - (d % 30 === 0 ? 7 : 3)
    ctx.strokeStyle = `rgba(${INK},0.3)`
    ctx.beginPath()
    ctx.moveTo(cx + v.x * inner, cy + v.y * inner)
    ctx.lineTo(cx + v.x * R, cy + v.y * R)
    ctx.stroke()
    if (d % 30 === 0) {
      const cardinal = ({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' } as Record<number, string>)[d]
      ctx.fillStyle = cardinal ? `rgba(${INK},0.85)` : `rgba(${INK},0.4)`
      ctx.fillText(cardinal ?? String(d), cx + v.x * (R + 13), cy + v.y * (R + 13))
    }
  }

  // The sweep: one line and a faint flat wedge behind it showing what was just scanned.
  const sweep = ((time * 360) / SWEEP_SECONDS) % 360
  const toCanvas = (deg: number) => (deg - 90) * DEG
  ctx.fillStyle = `rgba(${INK},0.035)`
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.arc(cx, cy, R, toCanvas(sweep - 30), toCanvas(sweep))
  ctx.closePath()
  ctx.fill()
  const tip = headingVector(sweep)
  ctx.strokeStyle = `rgba(${INK},0.55)`
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + tip.x * R, cy + tip.y * R)
  ctx.stroke()

  // Targets brighten when the sweep passes and fade until the next pass, like radar phosphor.
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `500 11px ${FONT}`
  for (const t of snap.airTargets) {
    const p = blipPosition(t.bearing, t.distance, g)
    const alpha = 1 - (wrap360(sweep - t.bearing) / 360) * 0.55
    const rgb = THREAT_RGB[t.threat]
    const v = headingVector(t.heading)
    ctx.strokeStyle = `rgba(${rgb},${alpha})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(p.x + v.x * 7, p.y + v.y * 7)
    ctx.lineTo(p.x + v.x * (10 + t.speed), p.y + v.y * (10 + t.speed))
    ctx.stroke()
    drawBlip(ctx, airShape(t), p.x, p.y, `rgba(${rgb},${alpha})`)
    const selected = t.id === selectedId
    ctx.fillStyle = `rgba(${rgb},${Math.max(alpha, 0.8)})`
    ctx.fillText(t.label, p.x + (selected ? 16 : 9), p.y - 7)
    if (selected) brackets(ctx, p.x, p.y, 12)
  }

  // Our own drone: a blue circle, the friendly symbol.
  if (snap.drone.phase !== 'docked') {
    const p = blipPosition(bearing(snap.robot.pos, snap.drone.pos), distance(snap.robot.pos, snap.drone.pos), g)
    ctx.strokeStyle = FRIENDLY
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(p.x, p.y, 5, 0, TAU)
    ctx.stroke()
    ctx.fillStyle = FRIENDLY
    ctx.fillText('S-1', p.x + 9, p.y + 4)
  }

  // The robot at the centre, pointing where it faces.
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(snap.robot.heading * DEG)
  ctx.fillStyle = FRIENDLY
  ctx.beginPath()
  ctx.moveTo(0, -8)
  ctx.lineTo(6, 6)
  ctx.lineTo(0, 3)
  ctx.lineTo(-6, 6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  return g
}

/** Same shapes as the map: diamond hostile, open square unidentified, small square neutral. */
function drawBlip(ctx: CanvasRenderingContext2D, shape: AirShape, x: number, y: number, color: string) {
  ctx.beginPath()
  if (shape === 'hostile') {
    ctx.moveTo(x, y - 6)
    ctx.lineTo(x + 6, y)
    ctx.lineTo(x, y + 6)
    ctx.lineTo(x - 6, y)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  } else if (shape === 'unknown') {
    ctx.rect(x - 4.5, y - 4.5, 9, 9)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.stroke()
  } else {
    ctx.rect(x - 3, y - 3, 6, 6)
    ctx.fillStyle = color
    ctx.fill()
  }
}

function brackets(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const l = 5
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 1
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
