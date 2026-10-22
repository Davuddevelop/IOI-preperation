import { memo, useMemo, useRef, useState, type PointerEvent } from 'react'
import { clamp } from '../../data/geometry'
import { OBSTACLE_SENSOR, RADAR, SURVEY } from '../../data/specs'
import type { AirTarget, MetalContact, Rect, Vec2, WorldMap, Zone } from '../../data/types'
import { cx } from '../../lib/cx'
import { percent } from '../../lib/format'
import { useWorld } from '../../state/hooks'
import { Segmented } from '../ui'
import styles from './TacticalMap.module.css'

/** Margin around the world in the full view, metres. */
const PAD = 2
/** Width of the zoomed "follow" window, metres. */
const FOLLOW_WIDTH = 40

type ViewMode = 'full' | 'follow'

interface TacticalMapProps {
  className?: string
  /** Outline one zone more strongly. */
  highlightZoneId?: string | null
  /** Makes zones clickable. */
  onSelectZone?: (zoneId: string) => void
  /** Makes the map clickable; receives the tapped point in world metres. */
  onPick?: (point: Vec2) => void
}

/**
 * Top-down SVG map. The SVG viewBox is in world metres, so positions are drawn
 * as-is. Symbols (robot, markers, text) are multiplied by `k`, the current
 * zoom factor, so they keep the same on-screen size when the view zooms in.
 */
export function TacticalMap({ className, highlightZoneId, onSelectZone, onPick }: TacticalMapProps) {
  const [mode, setMode] = useState<ViewMode>('full')
  const map = useWorld((s) => s.map)
  const robot = useWorld((s) => s.robot)
  const drone = useWorld((s) => s.drone)
  const zones = useWorld((s) => s.zones)
  const contacts = useWorld((s) => s.contacts)
  const targets = useWorld((s) => s.airTargets)
  const svgRef = useRef<SVGSVGElement>(null)
  const downAt = useRef<{ x: number; y: number } | null>(null)

  const view = mode === 'full' ? fullView(map) : followView(map, robot.pos)
  const k = view.w / (map.width + 2 * PAD)

  // A tap, not a drag-to-scroll: pointer moved less than a few pixels.
  const handlePointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const start = downAt.current
    downAt.current = null
    if (!onPick || !start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return
    const ctm = svgRef.current?.getScreenCTM()
    if (!ctm) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    onPick({ x: clamp(p.x, 0, map.width), y: clamp(p.y, 0, map.height) })
  }

  return (
    <div className={cx(styles.map, className)}>
      <svg
        ref={svgRef}
        className={cx(styles.svg, onPick && styles.pickable)}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Tactical map of the survey area"
        onPointerDown={(e) => {
          downAt.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerUp={handlePointerUp}
      >
        <rect x={-PAD} y={-PAD} width={map.width + 2 * PAD} height={map.height + 2 * PAD} fill="var(--map-bg)" />
        <Grid map={map} view={view} k={k} />
        <Terrain map={map} />
        <Zones zones={zones} k={k} highlightId={highlightZoneId ?? null} onSelect={onSelectZone} />
        <Trail points={robot.trail} />
        <Obstacles map={map} />
        <Contacts contacts={contacts} k={k} showLabels={mode === 'follow'} />

        {/* base */}
        <g transform={`translate(${map.base.x} ${map.base.y}) scale(${k})`}>
          <rect x={-1.6} y={-1.6} width={3.2} height={3.2} rx={0.4} className={styles.base} />
          <text y={4.2} className={styles.label} textAnchor="middle" fontSize={1.9}>
            BASE
          </text>
        </g>

        {/* sensor footprints around the robot */}
        <circle cx={robot.pos.x} cy={robot.pos.y} r={RADAR.range} className={styles.radarRange} />
        <circle cx={robot.pos.x} cy={robot.pos.y} r={OBSTACLE_SENSOR.range} className={styles.sensorRange} />

        {drone.phase !== 'docked' && (
          <>
            <line x1={robot.pos.x} y1={robot.pos.y} x2={drone.pos.x} y2={drone.pos.y} className={styles.droneLink} />
            {drone.goal && (
              <g transform={`translate(${drone.goal.x} ${drone.goal.y}) scale(${k})`} className={styles.goal}>
                <circle r={2.2} />
                <path d="M-3.4 0h2 M1.4 0h2 M0 -3.4v2 M0 1.4v2" />
              </g>
            )}
            <g transform={`translate(${drone.pos.x} ${drone.pos.y}) scale(${k})`} className={styles.drone}>
              <path d="M-1.4 -1.4 1.4 1.4 M1.4 -1.4 -1.4 1.4" />
              {[-1.4, 1.4].map((x) => [-1.4, 1.4].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r={0.9} />))}
              <text x={2.6} y={-1.4} fontSize={1.8} className={styles.droneText}>
                S-1 · {Math.round(drone.altitude)} m
              </text>
            </g>
          </>
        )}

        {targets.map((t) => (
          <AirMarker key={t.id} target={t} k={k} />
        ))}

        <g transform={`translate(${robot.pos.x} ${robot.pos.y}) scale(${k})`}>
          <circle r={2.8} className={styles.robotHalo} />
          <path transform={`rotate(${robot.heading})`} d="M0 -2.2 1.6 1.6 0 0.7 -1.6 1.6z" className={styles.robot} />
        </g>

        <ScaleBar view={view} k={k} />
      </svg>

      <div className={styles.controls}>
        <Segmented
          size="sm"
          label="Map view"
          value={mode}
          options={[
            { value: 'full', label: 'Full area' },
            { value: 'follow', label: 'Follow robot' },
          ]}
          onChange={setMode}
        />
      </div>
    </div>
  )
}

function fullView(map: WorldMap): Rect {
  return { x: -PAD, y: -PAD, w: map.width + 2 * PAD, h: map.height + 2 * PAD }
}

function followView(map: WorldMap, centre: Vec2): Rect {
  const full = fullView(map)
  const w = FOLLOW_WIDTH
  const h = (w * full.h) / full.w
  return {
    x: clamp(centre.x - w / 2, full.x, full.x + full.w - w),
    y: clamp(centre.y - h / 2, full.y, full.y + full.h - h),
    w,
    h,
  }
}

// --------------------------------------------------------------- layers
// Layers that only depend on the static map are memoised, so React skips them
// on the 20-per-second updates.

function Grid({ map, view, k }: { map: WorldMap; view: Rect; k: number }) {
  const step = k < 0.5 ? 5 : 10
  const xs: number[] = []
  const ys: number[] = []
  for (let x = 0; x <= map.width; x += step) xs.push(x)
  for (let y = 0; y <= map.height; y += step) ys.push(y)
  return (
    <g>
      {xs.map((x) => (
        <line key={`x${x}`} x1={x} y1={0} x2={x} y2={map.height} className={styles.grid} />
      ))}
      {ys.map((y) => (
        <line key={`y${y}`} x1={0} y1={y} x2={map.width} y2={y} className={styles.grid} />
      ))}
      {xs
        .filter((x) => x % (step * 2) === 0 && x > view.x && x < view.x + view.w)
        .map((x) => (
          <text key={`lx${x}`} x={x + 0.6 * k} y={view.y + 2.4 * k} fontSize={1.6 * k} className={styles.gridLabel}>
            {x}
          </text>
        ))}
      {ys
        .filter((y) => y % (step * 2) === 0 && y > view.y + 3 * k && y < view.y + view.h)
        .map((y) => (
          <text key={`ly${y}`} x={view.x + 0.6 * k} y={y - 0.6 * k} fontSize={1.6 * k} className={styles.gridLabel}>
            {y}
          </text>
        ))}
    </g>
  )
}

const Terrain = memo(function Terrain({ map }: { map: WorldMap }) {
  return (
    <g>
      {map.features.map((f, i) => (
        <polyline
          key={i}
          points={f.points.map((p) => `${p.x},${p.y}`).join(' ')}
          className={f.kind === 'road' ? styles.road : styles.stream}
        />
      ))}
    </g>
  )
})

const Obstacles = memo(function Obstacles({ map }: { map: WorldMap }) {
  return (
    <g>
      {map.obstacles.map((o) => (
        <circle key={o.id} cx={o.pos.x} cy={o.pos.y} r={o.radius} className={styles[o.kind]} />
      ))}
    </g>
  )
})

const Trail = memo(function Trail({ points }: { points: Vec2[] }) {
  // The trail is drawn as wide as the detector's swath, so it shows the area actually scanned.
  const d = useMemo(() => points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '), [points])
  return <polyline points={d} strokeWidth={SURVEY.swath} className={styles.trail} />
})

interface ZonesProps {
  zones: Zone[]
  k: number
  highlightId: string | null
  onSelect?: (id: string) => void
}

function Zones({ zones, k, highlightId, onSelect }: ZonesProps) {
  return (
    <g>
      {zones.map((z) => (
        <g
          key={z.id}
          className={cx(styles.zone, styles[z.status], z.id === highlightId && styles.highlight)}
          {...(onSelect && {
            role: 'button',
            tabIndex: 0,
            'aria-label': `${z.name}, ${z.description}`,
            onClick: () => onSelect(z.id),
            onKeyDown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(z.id)
              }
            },
          })}
        >
          <rect x={z.rect.x} y={z.rect.y} width={z.rect.w} height={z.rect.h} rx={0.6} />
          <text x={z.rect.x + 1.2 * k} y={z.rect.y + 2.8 * k} fontSize={2 * k} className={styles.zoneName}>
            {z.id} · {z.description}
          </text>
          <text
            x={z.rect.x + z.rect.w - 1.2 * k}
            y={z.rect.y + 2.8 * k}
            fontSize={1.8 * k}
            textAnchor="end"
            className={styles.zoneCoverage}
          >
            {percent(z.coverage)}
          </text>
        </g>
      ))}
    </g>
  )
}

function Contacts({ contacts, k, showLabels }: { contacts: MetalContact[]; k: number; showLabels: boolean }) {
  return (
    <g>
      {contacts.map((c) => (
        <g key={c.id} transform={`translate(${c.pos.x} ${c.pos.y}) scale(${k})`} className={styles.contact}>
          <path d="M0 -1.3 1.3 0 0 1.3 -1.3 0z" />
          {showLabels && (
            <text x={1.8} y={0.6} fontSize={1.6}>
              {c.label}
            </text>
          )}
        </g>
      ))}
    </g>
  )
}

function AirMarker({ target, k }: { target: AirTarget; k: number }) {
  return (
    <g transform={`translate(${target.pos.x} ${target.pos.y}) scale(${k})`} className={styles.air} data-threat={target.threat}>
      <path transform={`rotate(${target.heading})`} d="M0 -1.9 1.5 1.4 0 0.6 -1.5 1.4z" />
      <text x={2.2} y={0.7} fontSize={1.8}>
        {target.label}
      </text>
    </g>
  )
}

function ScaleBar({ view, k }: { view: Rect; k: number }) {
  const length = k < 0.5 ? 5 : 10
  const x = view.x + 2 * k
  const y = view.y + view.h - 2 * k
  return (
    <g className={styles.scale}>
      <path d={`M${x} ${y - 0.8 * k}V${y}H${x + length}V${y - 0.8 * k}`} />
      <text x={x + length + 1 * k} y={y} fontSize={1.6 * k}>
        {length} m
      </text>
    </g>
  )
}

export function MapLegend() {
  return (
    <ul className={styles.legend} aria-label="Map legend">
      <li data-kind="robot">Robot</li>
      <li data-kind="drone">Drone</li>
      <li data-kind="metal">Metal contact</li>
      <li data-kind="air">Air target</li>
      <li data-kind="swept">Swept area</li>
      <li data-kind="obstacle">Obstacle</li>
      <li data-kind="radar">Radar range</li>
    </ul>
  )
}
