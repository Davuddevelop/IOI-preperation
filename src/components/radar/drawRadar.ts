import { DEG, bearing, distance, headingVector, wrap360 } from '../../data/geometry'
import { RADAR } from '../../data/specs'
import type { ThreatLevel, WorldSnapshot } from '../../data/types'
import type { Frame } from '../../hooks/useCanvasLoop'

export const SWEEP_SECONDS = 3
const TAU = Math.PI * 2

export interface ScopeGeometry {
  cx: number
  cy: number
  radius: number
}

const THREAT_RGB: Record<ThreatLevel, string> = {
  high: '255,90,95',
  medium: '255,159,67',
  low: '160,176,168',
  none: '160,176,168',
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

  const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
  disc.addColorStop(0, '#0d1f17')
  disc.addColorStop(1, '#050d09')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, TAU)
  ctx.fill()

  // Range rings.
  ctx.font = '600 10px ui-monospace, monospace'
  ctx.textAlign = 'left'
  ctx.lineWidth = 1
  for (const m of [20, 40, 60]) {
    ctx.strokeStyle = 'rgba(79,227,161,0.16)'
    ctx.beginPath()
    ctx.arc(cx, cy, (R * m) / RADAR.range, 0, TAU)
    ctx.stroke()
    ctx.fillStyle = 'rgba(79,227,161,0.5)'
    ctx.fillText(`${m} m`, cx + 4, cy - (R * m) / RADAR.range + 12)
  }
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = 'rgba(255,90,95,0.5)'
  ctx.beginPath()
  ctx.arc(cx, cy, (R * RADAR.highThreatRange) / RADAR.range, 0, TAU)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.strokeStyle = 'rgba(79,227,161,0.45)'
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, TAU)
  ctx.stroke()

  // Crosshair and bearing ticks.
  ctx.strokeStyle = 'rgba(79,227,161,0.1)'
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
    const inner = R - (d % 30 === 0 ? 8 : 4)
    ctx.strokeStyle = 'rgba(79,227,161,0.4)'
    ctx.beginPath()
    ctx.moveTo(cx + v.x * inner, cy + v.y * inner)
    ctx.lineTo(cx + v.x * R, cy + v.y * R)
    ctx.stroke()
    if (d % 30 === 0) {
      ctx.fillStyle = d % 90 === 0 ? 'rgba(219,230,224,0.85)' : 'rgba(139,156,148,0.8)'
      ctx.fillText(({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' } as Record<number, string>)[d] ?? String(d), cx + v.x * (R + 13), cy + v.y * (R + 13))
    }
  }

  // The sweep: a bright line trailing a fading wedge.
  const sweep = ((time * 360) / SWEEP_SECONDS) % 360
  if ('createConicGradient' in ctx) {
    const trail = 70
    // Canvas angles start at +x (east) and run clockwise; compass angles start at north.
    const wedge = ctx.createConicGradient((sweep - 90 - trail) * DEG, cx, cy)
    wedge.addColorStop(0, 'rgba(79,227,161,0)')
    wedge.addColorStop(trail / 360, 'rgba(79,227,161,0.28)')
    wedge.addColorStop(trail / 360 + 0.001, 'rgba(79,227,161,0)')
    wedge.addColorStop(1, 'rgba(79,227,161,0)')
    ctx.fillStyle = wedge
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, TAU)
    ctx.fill()
  }
  const tip = headingVector(sweep)
  ctx.strokeStyle = 'rgba(79,227,161,0.9)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + tip.x * R, cy + tip.y * R)
  ctx.stroke()

  // Targets glow when the sweep passes, then fade until the next pass — like radar phosphor.
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '650 11px ui-monospace, monospace'
  for (const t of snap.airTargets) {
    const p = blipPosition(t.bearing, t.distance, g)
    const glow = 1 - (wrap360(sweep - t.bearing) / 360) * 0.7
    const rgb = THREAT_RGB[t.threat]
    ctx.fillStyle = `rgba(${rgb},${glow * 0.22})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, 12, 0, TAU)
    ctx.fill()
    ctx.fillStyle = `rgba(${rgb},${glow})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, 4.5, 0, TAU)
    ctx.fill()
    const v = headingVector(t.heading)
    const len = 8 + t.speed * 1.4
    ctx.strokeStyle = `rgba(${rgb},${glow})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x + v.x * len, p.y + v.y * len)
    ctx.stroke()
    ctx.fillStyle = `rgba(${rgb},${Math.max(glow, 0.75)})`
    const selected = t.id === selectedId
    ctx.fillText(t.label, p.x + (selected ? 19 : 10), p.y - 8)
    if (selected) brackets(ctx, p.x, p.y, 15)
  }

  // Our own drone, identified as friendly.
  if (snap.drone.phase !== 'docked') {
    const p = blipPosition(bearing(snap.robot.pos, snap.drone.pos), distance(snap.robot.pos, snap.drone.pos), g)
    ctx.fillStyle = '#5cc8ff'
    ctx.beginPath()
    ctx.moveTo(p.x, p.y - 5)
    ctx.lineTo(p.x + 5, p.y)
    ctx.lineTo(p.x, p.y + 5)
    ctx.lineTo(p.x - 5, p.y)
    ctx.closePath()
    ctx.fill()
    ctx.fillText('S-1', p.x + 8, p.y + 4)
  }

  // The robot at the centre, pointing where it faces.
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(snap.robot.heading * DEG)
  ctx.fillStyle = '#4fe3a1'
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

function brackets(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const l = 6
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 1.5
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
