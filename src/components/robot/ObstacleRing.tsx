import { OBSTACLE_SENSOR, ROBOT } from '../../data/specs'
import { formatMeters } from '../../lib/format'
import { useWorld } from '../../state/hooks'
import { Badge, type Tone } from '../ui'
import styles from './ObstacleRing.module.css'

const R = 92
const SECTOR_NAMES = [
  'front',
  'front-right',
  'front-right',
  'right',
  'rear-right',
  'rear-right',
  'rear',
  'rear-left',
  'rear-left',
  'left',
  'front-left',
  'front-left',
]

const point = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180
  return `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`
}

const toneFor = (d: number): Tone => (d < 1.5 ? 'danger' : d < 3 ? 'warn' : 'accent')

/**
 * The proximity sensors seen from above, robot's front pointing up. Each wedge
 * reaches out to the nearest thing that sector can see; short red wedges mean
 * something is close.
 */
export function ObstacleRing() {
  const distances = useWorld((s) => s.robot.obstacleDistances)
  const stop = useWorld((s) => s.robot.obstacleStop)
  const { range } = OBSTACLE_SENSOR
  const width = 360 / distances.length

  let nearest = 0
  distances.forEach((d, i) => {
    if (d < distances[nearest]) nearest = i
  })
  const nearestDistance = distances[nearest]

  return (
    <div className={styles.wrap}>
      <svg viewBox="-110 -110 220 220" className={styles.svg} role="img" aria-label={`Nearest obstacle ${formatMeters(nearestDistance)} ${SECTOR_NAMES[nearest]}`}>
        {[2, 4, 6].map((m) => (
          <g key={m}>
            <circle r={(R * m) / range} className={styles.ring} />
            <text x={3} y={(-R * m) / range + 9} className={styles.ringLabel}>
              {m} m
            </text>
          </g>
        ))}
        <circle r={(R * ROBOT.stopDistance) / range} className={styles.stopRing} />

        {distances.map((d, i) => {
          const a0 = i * width - width / 2 + 1
          const a1 = i * width + width / 2 - 1
          const r = Math.max(4, (R * Math.min(d, range)) / range)
          const clear = d >= range - 0.01
          return (
            <g key={i} data-tone={toneFor(d)} className={clear ? styles.clear : styles.sector}>
              <path d={`M0 0 L${point(a0, r)} A${r} ${r} 0 0 1 ${point(a1, r)} Z`} className={styles.wedge} />
              <path d={`M${point(a0, r)} A${r} ${r} 0 0 1 ${point(a1, r)}`} className={styles.edge} />
            </g>
          )
        })}

        <g className={styles.robot}>
          <rect x={-9} y={-12} width={18} height={24} rx={3} />
          <path d="M-5 -6 0 -11 5 -6" />
        </g>
      </svg>

      <div className={styles.readout}>
        <div>
          <span className="label">Nearest</span>
          <p className="mono" data-tone={toneFor(nearestDistance)}>
            {nearestDistance >= range ? `> ${range} m` : formatMeters(nearestDistance)}
          </p>
          <span className={styles.direction}>{nearestDistance >= range ? 'all clear' : SECTOR_NAMES[nearest]}</span>
        </div>
        {stop && (
          <Badge tone="danger" pulse>
            Safety stop
          </Badge>
        )}
      </div>
    </div>
  )
}
