import { METAL_DETECTOR } from '../../data/specs'
import { formatAgo } from '../../lib/format'
import { useWorld } from '../../state/hooks'
import { Badge } from '../ui'
import styles from './MetalDetector.module.css'

/** Live detector response with a 15-second trace and the threshold that registers a contact. */
export function MetalDetector() {
  const signal = useWorld((s) => s.robot.metalSignal)
  const history = useWorld((s) => s.robot.metalHistory)
  const contacts = useWorld((s) => s.contacts)
  const now = useWorld((s) => Math.floor(s.clock / 5000) * 5000)
  const last = contacts[contacts.length - 1]
  const hit = signal >= METAL_DETECTOR.threshold
  const threshold = METAL_DETECTOR.threshold

  // Trace: newest sample at the right edge, 60 samples across 0–100; value 0–1 mapped to 40–0.
  const points = history.map((v, i) => `${100 - ((history.length - 1 - i) / 59) * 100},${40 - v * 38}`).join(' ')

  return (
    <div className={styles.detector}>
      <div className={styles.top}>
        <div>
          <span className="label">Signal</span>
          <p className={`mono ${styles.value}`} data-tone={hit ? 'metal' : undefined}>
            {Math.round(signal * 100)}
            <span>%</span>
          </p>
        </div>
        {hit ? (
          <Badge tone="metal" pulse>
            Metal detected
          </Badge>
        ) : (
          <Badge>Scanning</Badge>
        )}
      </div>

      <div className={styles.bar} role="meter" aria-label="Metal detector signal" aria-valuenow={Math.round(signal * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={styles.fill} data-tone={hit ? 'metal' : 'accent'} style={{ width: `${signal * 100}%` }} />
        <div className={styles.threshold} style={{ left: `${threshold * 100}%` }} title="Detection threshold" />
      </div>

      <svg className={styles.trace} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <line x1={0} x2={100} y1={40 - threshold * 38} y2={40 - threshold * 38} className={styles.traceThreshold} />
        <polyline points={points} className={styles.traceLine} />
      </svg>
      <p className={styles.caption}>
        Last 15 s · dashed line = {Math.round(threshold * 100)}% detection threshold
      </p>

      <div className={styles.footer}>
        <div>
          <span className="label">Contacts</span>
          <p className="mono">{contacts.length}</p>
        </div>
        <div>
          <span className="label">Last contact</span>
          <p>{last ? `${last.label} · ${Math.round(last.strength * 100)}% · ${formatAgo(last.time, now)}` : 'None yet'}</p>
        </div>
      </div>
    </div>
  )
}
