import { useState } from 'react'
import { wrap360 } from '../../data/geometry'
import { METAL_DETECTOR } from '../../data/specs'
import { useCanvasLoop } from '../../hooks/useCanvasLoop'
import { cx } from '../../lib/cx'
import { DRONE_PHASE_LABEL, MODE_LABEL, formatClock } from '../../lib/format'
import { useDataSource, useWorld } from '../../state/hooks'
import { renderAerialView } from './aerialView'
import styles from './Feeds.module.css'
import { renderGroundView } from './groundView'

interface FeedProps {
  /** Smaller HUD for thumbnails. */
  compact?: boolean
}

export function RobotFeed({ compact }: FeedProps) {
  const source = useDataSource()
  const [nightVision, setNightVision] = useState(false)
  const canvasRef = useCanvasLoop((ctx, frame) => renderGroundView(ctx, source.getSnapshot(), frame))
  const heading = useWorld((s) => Math.round(s.robot.heading))
  const speed = useWorld((s) => s.robot.speed.toFixed(1))
  const mode = useWorld((s) => s.robot.mode)
  const obstacleStop = useWorld((s) => s.robot.obstacleStop)
  const metal = useWorld((s) => s.robot.metalSignal >= METAL_DETECTOR.threshold)

  return (
    <div className={cx(styles.feed, nightVision && styles.nightVision, compact && styles.compact)}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="Simulated front camera view from the robot" />
      <div className={styles.hud} aria-hidden="true">
        <span className={styles.topLeft}>
          <span className={styles.rec} /> CAM-1 FRONT
        </span>
        <FeedClock className={styles.topRight} />
        <Crosshair />
        <span className={styles.bottomLeft}>
          {speed} m/s · {MODE_LABEL[mode]}
        </span>
        {!compact && <HeadingTape heading={heading} />}
        <span className={styles.alerts}>
          {obstacleStop && <span data-tone="danger">OBSTACLE STOP</span>}
          {metal && <span data-tone="metal">METAL</span>}
        </span>
      </div>
      {!compact && (
        <button
          type="button"
          className={styles.toggle}
          aria-pressed={nightVision}
          onClick={() => setNightVision((v) => !v)}
        >
          Night vision
        </button>
      )}
    </div>
  )
}

export function DroneFeed({ compact }: FeedProps) {
  const source = useDataSource()
  const canvasRef = useCanvasLoop((ctx, frame) => renderAerialView(ctx, source.getSnapshot(), frame))
  const phase = useWorld((s) => s.drone.phase)
  const altitude = useWorld((s) => Math.round(s.drone.altitude))
  const speed = useWorld((s) => s.drone.speed.toFixed(1))
  const battery = useWorld((s) => Math.round(s.drone.battery))
  const heading = useWorld((s) => Math.round(s.drone.heading))

  return (
    <div className={cx(styles.feed, compact && styles.compact)}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="Simulated downward camera view from the drone" />
      <div className={styles.hud} aria-hidden="true">
        <span className={styles.topLeft}>
          {phase !== 'docked' && <span className={styles.rec} />} CAM-2 AERIAL
        </span>
        <FeedClock className={styles.topRight} />
        {phase === 'docked' ? (
          <span className={styles.standby}>
            Drone docked
            <br />
            feed on standby
          </span>
        ) : (
          <>
            <Crosshair />
            <span className={styles.bottomLeft}>
              ALT {altitude} m · {speed} m/s · BAT {battery}%
            </span>
            {!compact && <HeadingTape heading={heading} />}
            <span className={styles.alerts}>
              <span data-tone="drone">{DRONE_PHASE_LABEL[phase].toUpperCase()}</span>
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function FeedClock({ className }: { className: string }) {
  const seconds = useWorld((s) => Math.floor(s.clock / 1000))
  return <span className={className}>{formatClock(seconds * 1000)}</span>
}

function Crosshair() {
  return (
    <svg className={styles.crosshair} viewBox="-20 -20 40 40">
      <path d="M-14 -8v-6h6 M8 -14h6v6 M14 8v6h-6 M-8 14h-6v-6 M-4 0h-4 M4 0h4 M0 -4v-4 M0 4v4" />
    </svg>
  )
}

const CARDINAL_TICKS: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }

/** A strip of compass ticks centred on the current heading, like an aircraft HUD. */
function HeadingTape({ heading }: { heading: number }) {
  const span = 90
  const width = 220
  const ticks = []
  for (let d = Math.ceil((heading - span / 2) / 5) * 5; d <= heading + span / 2; d += 5) {
    const x = ((d - heading) / span) * width + width / 2
    const major = d % 15 === 0
    const deg = wrap360(d)
    ticks.push(
      <g key={d}>
        <line x1={x} x2={x} y1={major ? 9 : 13} y2={17} />
        {d % 30 === 0 && (
          <text x={x} y={6} textAnchor="middle">
            {CARDINAL_TICKS[deg] ?? deg}
          </text>
        )}
      </g>,
    )
  }
  return (
    <svg className={styles.tape} viewBox={`0 -4 ${width} 36`}>
      {ticks}
      <path d={`M${width / 2 - 5} 26 L${width / 2} 20 L${width / 2 + 5} 26`} className={styles.tapeMarker} />
      <text x={width / 2} y={32} textAnchor="middle" className={styles.tapeValue}>
        {String(heading % 360).padStart(3, '0')}
      </text>
    </svg>
  )
}
