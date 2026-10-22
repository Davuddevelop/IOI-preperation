import { DRONE_PHASE_LABEL, LID_LABEL } from '../../lib/format'
import { useWorld } from '../../state/hooks'
import styles from './BayDiagram.module.css'

/** Pixels per metre of altitude while the drone is close to the bay. */
const CLIMB_SCALE = 4
const DOCKED_Y = 78

/**
 * Side view of the robot: the hinged lid swings open and the drone rises out
 * of the bay. Explains the drone-in-a-robot idea at a glance.
 */
export function BayDiagram() {
  const lidOpen = useWorld((s) => s.robot.lidOpen)
  const lid = useWorld((s) => s.robot.lid)
  const phase = useWorld((s) => s.drone.phase)
  const altitude = useWorld((s) => s.drone.altitude)

  const nearBay = phase === 'docked' || phase === 'launching' || phase === 'landing'
  const droneY = nearBay ? Math.max(18, DOCKED_Y - altitude * CLIMB_SCALE) : 18

  return (
    <div className={styles.wrap}>
      <svg
        viewBox="0 0 240 150"
        className={styles.svg}
        role="img"
        aria-label={`Drone bay lid ${LID_LABEL[lid].toLowerCase()}, drone ${DRONE_PHASE_LABEL[phase].toLowerCase()}`}
      >
        <line x1={0} x2={240} y1={134} y2={134} className={styles.ground} />

        {/* Hull and the bay cavity cut into its top. */}
        <path d="M34 106 44 68h152l10 38z" className={styles.hull} />
        <rect x={82} y={68} width={94} height={20} rx={2} className={styles.cavity} />

        {/* Drone, drawn before the lid so a closed lid covers it. */}
        <g transform={`translate(129 ${droneY})`} className={styles.drone}>
          <line x1={-24} x2={24} y1={-3} y2={-3} />
          <rect x={-12} y={-4} width={24} height={8} rx={2} />
          <ellipse cx={-24} cy={-6} rx={10} ry={1.6} className={styles.rotor} />
          <ellipse cx={24} cy={-6} rx={10} ry={1.6} className={styles.rotor} />
          <path d="M-8 4l-3 5 M8 4l3 5" />
          {!nearBay && (
            <text x={34} y={2} className={styles.altitude}>
              {Math.round(altitude)} m ↑
            </text>
          )}
        </g>

        {/* Lid, hinged at its rear edge. */}
        <g transform={`rotate(${-lidOpen * 110} 178 66)`}>
          <rect x={80} y={63} width={99} height={5} rx={2} className={styles.lid} />
        </g>

        {/* Tracks. */}
        <rect x={28} y={104} width={184} height={28} rx={14} className={styles.track} />
        {[46, 83, 120, 157, 194].map((x) => (
          <circle key={x} cx={x} cy={118} r={9} className={styles.wheel} />
        ))}
        <circle cx={199} cy={82} r={3} className={styles.sensor} />
      </svg>

      <dl className={styles.facts}>
        <div>
          <dt className="label">Lid</dt>
          <dd>
            {LID_LABEL[lid]} · <span className="mono">{Math.round(lidOpen * 100)}%</span>
          </dd>
        </div>
        <div>
          <dt className="label">Drone</dt>
          <dd>{DRONE_PHASE_LABEL[phase]}</dd>
        </div>
      </dl>
    </div>
  )
}
