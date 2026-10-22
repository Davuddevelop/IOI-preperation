import { useId } from 'react'
import { clamp } from '../../data/geometry'
import type { AirTarget } from '../../data/types'
import { CLASS_LABEL, THREAT_LABEL, formatBearing, formatDuration, formatMeters } from '../../lib/format'
import { useWorld } from '../../state/hooks'
import { Badge, EmptyState, Meter, Stat } from '../ui'
import { THREAT_TONE } from './threat'
import styles from './TargetDetail.module.css'

export function TargetDetail({ target }: { target: AirTarget | undefined }) {
  const now = useWorld((s) => Math.floor(s.clock / 1000) * 1000)
  if (!target) return <EmptyState>Nothing tracked. New contacts appear here automatically.</EmptyState>

  const tone = THREAT_TONE[target.threat]
  return (
    <div className={styles.detail}>
      <DetectionThumb target={target} />

      <div className={styles.head}>
        <h3 className="mono">{target.label}</h3>
        <Badge tone={tone} pulse={target.threat === 'high'}>
          {THREAT_LABEL[target.threat]}
          {target.threat !== 'none' && ' threat'}
        </Badge>
      </div>

      <div className={styles.classification}>
        <div className={styles.classRow}>
          <span>{CLASS_LABEL[target.classification]}</span>
          <span className="mono">{Math.round(target.confidence * 100)}%</span>
        </div>
        <Meter value={target.confidence * 100} label="Classifier confidence" tone={tone === 'neutral' ? 'accent' : tone} />
      </div>

      <div className={styles.stats}>
        <Stat label="Distance" value={formatMeters(target.distance)} />
        <Stat label="Bearing" value={formatBearing(target.bearing)} />
        <Stat label="Altitude" value={Math.round(target.altitude)} unit="m" />
        <Stat label="Speed" value={target.speed.toFixed(1)} unit="m/s" />
        <Stat label="Heading" value={formatBearing(target.heading)} />
        <Stat label="Tracked" value={formatDuration((now - target.firstSeen) / 1000)} />
      </div>

      <p className={styles.note}>
        Classified by the onboard vision model. Experimental — confirm visually before acting on it.
      </p>
    </div>
  )
}

/**
 * A mock frame from the vision system: the target's silhouette against the
 * sky, with the bounding box and label a detector such as YOLO would draw.
 */
function DetectionThumb({ target }: { target: AirTarget }) {
  const blurId = useId()
  const size = clamp(36 / Math.max(target.distance, 1), 0.5, 1.5)
  const tone = THREAT_TONE[target.threat]
  const box = 30 * size

  return (
    <svg className={styles.thumb} viewBox="0 0 200 112" data-tone={tone === 'neutral' ? 'accent' : tone} role="img" aria-label={`Camera detection of ${target.label}`}>
      <defs>
        <linearGradient id={`${blurId}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a6472" />
          <stop offset="1" stopColor="#a3b2ac" />
        </linearGradient>
        <filter id={`${blurId}blur`}>
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <rect width={200} height={112} fill={`url(#${blurId}sky)`} />
      <g transform={`translate(100 58) scale(${size})`} className={styles.silhouette}>
        <Silhouette kind={target.classification} blurId={`${blurId}blur`} />
      </g>
      <g className={styles.box}>
        <rect x={100 - box} y={58 - box * 0.75} width={box * 2} height={box * 1.5} />
        <text x={100 - box} y={58 - box * 0.75 - 4}>
          {target.classification === 'unknown' ? 'object' : target.classification} {target.confidence.toFixed(2)}
        </text>
      </g>
      <text x={6} y={12} className={styles.camLabel}>
        CV · {target.label}
      </text>
    </svg>
  )
}

function Silhouette({ kind, blurId }: { kind: AirTarget['classification']; blurId: string }) {
  switch (kind) {
    case 'quadcopter':
      return (
        <>
          <path d="M-14 -6 14 6 M14 -6 -14 6" strokeWidth={3} />
          <rect x={-6} y={-4} width={12} height={8} rx={2} />
          {[-16, 16].map((x) => [-7, 7].map((y) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx={7} ry={2} />))}
        </>
      )
    case 'fixed-wing':
      return <path d="M-22 1 22 1 M-4 -3h8l2 4h-12z M-26 0l26-4 26 4-26 3z M14 0l6-8h4l-3 8" strokeWidth={1} />
    case 'bird':
      return <path d="M-20 -2q10 -10 20 2q10 -12 20 -2q-10 -2 -20 6q-10 -8 -20 -6z" />
    default:
      return <ellipse rx={16} ry={8} filter={`url(#${blurId})`} />
  }
}
