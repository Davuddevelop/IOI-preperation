import { SURVEY } from '../specs'
import type { Rect, Vec2 } from '../types'

const LANE_END_INSET = 0.5

/**
 * Plans a "lawnmower" sweep: parallel lanes along the zone's long side, spaced
 * so the detector's swath leaves no gaps. Starts at the corner nearest `from`.
 */
export function planSurvey(rect: Rect, from: Vec2): Vec2[] {
  const alongX = rect.w >= rect.h
  const [along0, alongLen] = alongX ? [rect.x, rect.w] : [rect.y, rect.h]
  const [across0, acrossLen] = alongX ? [rect.y, rect.h] : [rect.x, rect.w]
  const toVec = (along: number, across: number): Vec2 => (alongX ? { x: along, y: across } : { x: across, y: along })

  const laneCount = Math.ceil(acrossLen / SURVEY.swath)
  const spacing = acrossLen / laneCount
  const lanes = Array.from({ length: laneCount }, (_, i) => across0 + spacing * (i + 0.5))

  const fromAlong = alongX ? from.x : from.y
  const fromAcross = alongX ? from.y : from.x
  if (Math.abs(fromAcross - lanes[lanes.length - 1]) < Math.abs(fromAcross - lanes[0])) lanes.reverse()

  // Lane ends sit just inside the edge; the coil reaches past the robot's centre.
  const start = along0 + LANE_END_INSET
  const end = along0 + alongLen - LANE_END_INSET
  let forward = Math.abs(fromAlong - start) <= Math.abs(fromAlong - end)

  const points: Vec2[] = []
  for (const lane of lanes) {
    points.push(toVec(forward ? start : end, lane), toVec(forward ? end : start, lane))
    forward = !forward
  }
  return points
}

/** Tracks which 1 m cells the detector has passed over. */
export class CoverageGrid {
  readonly cols: number
  readonly rows: number
  private readonly cells: Uint8Array

  constructor(width: number, height: number) {
    this.cols = Math.ceil(width)
    this.rows = Math.ceil(height)
    this.cells = new Uint8Array(this.cols * this.rows)
  }

  /** Marks every cell whose centre is within `radius` of `p`; reports each newly covered centre. */
  cover(p: Vec2, radius: number, onNewCell: (center: Vec2) => void) {
    const x0 = Math.max(0, Math.floor(p.x - radius))
    const x1 = Math.min(this.cols - 1, Math.floor(p.x + radius))
    const y0 = Math.max(0, Math.floor(p.y - radius))
    const y1 = Math.min(this.rows - 1, Math.floor(p.y + radius))
    const r2 = radius * radius
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * this.cols + x
        if (this.cells[i]) continue
        const cx = x + 0.5
        const cy = y + 0.5
        if ((cx - p.x) ** 2 + (cy - p.y) ** 2 > r2) continue
        this.cells[i] = 1
        onNewCell({ x: cx, y: cy })
      }
    }
  }
}

/** Number of 1 m cells whose centres fall inside a rectangle. */
export function cellsInRect(r: Rect) {
  const xs = Math.max(0, Math.ceil(r.x + r.w - 0.5) - Math.ceil(r.x - 0.5))
  const ys = Math.max(0, Math.ceil(r.y + r.h - 0.5) - Math.ceil(r.y - 0.5))
  return xs * ys
}
