import { RADAR } from '../../data/specs'
import { CLASS_LABEL, formatBearing, formatMeters } from '../../lib/format'
import { href, type Route } from '../../router'
import { useWorld } from '../../state/hooks'
import { Icon } from '../Icon'
import styles from './AirspaceStrip.module.css'

/**
 * Always-visible airspace status above every screen.
 *
 * It keeps a fixed height whether the sky is clear or a threat is inbound: if
 * an alert pushed the page down as it appeared, the button under the
 * operator's finger would move and they could tap the wrong thing.
 */
export function AirspaceStrip({ route }: { route: Route }) {
  const targets = useWorld((s) => s.airTargets)
  // Sorted most dangerous first.
  const top = targets[0]
  const tone = !top ? 'neutral' : top.threat === 'high' ? 'danger' : top.threat === 'medium' ? 'warn' : 'neutral'

  return (
    <div className={styles.strip} data-tone={tone}>
      <Icon name={top?.threat === 'high' ? 'alert' : 'radar'} size={18} className={styles.icon} />
      <p className={styles.text}>
        {!top ? (
          <>
            <strong>Airspace clear</strong>
            <span>Radar active · {RADAR.range} m</span>
          </>
        ) : (
          <>
            <strong>
              {top.threat === 'high' ? 'High air threat' : `${targets.length} air contact${targets.length > 1 ? 's' : ''}`}
              {' — '}
              {top.label} {CLASS_LABEL[top.classification]}
            </strong>
            <span className="mono">
              {formatMeters(top.distance)} · {formatBearing(top.bearing)} · alt {Math.round(top.altitude)} m
            </span>
          </>
        )}
      </p>
      {top && route !== 'radar' && (
        <a className={styles.link} href={href('radar')}>
          Radar
        </a>
      )}
      {/* Screen readers hear about high threats once per target, not on every distance update. */}
      <span className="visually-hidden" aria-live="assertive">
        {top?.threat === 'high' ? `High air threat: ${top.label} ${CLASS_LABEL[top.classification]}` : ''}
      </span>
    </div>
  )
}
