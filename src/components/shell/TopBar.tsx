import { formatDuration } from '../../lib/format'
import { ROUTE_TITLES } from '../../navigation'
import { href, type Route } from '../../router'
import { useAirThreats } from '../../state/derived'
import { useWorld } from '../../state/hooks'
import { Icon } from '../Icon'
import { Logo } from '../Logo'
import { SimControls } from './SimControls'
import styles from './TopBar.module.css'

export function TopBar({ route }: { route: Route }) {
  // Select exactly what is displayed: rounding here means the bar re-renders
  // when the shown number changes, not twenty times a second.
  const battery = useWorld((s) => Math.round(s.robot.battery))
  const signal = useWorld((s) => Math.round(s.robot.signal))
  const missionSeconds = useWorld((s) => Math.floor((s.clock - s.missionStart) / 1000))
  const sim = useWorld((s) => s.sim)
  const threats = useAirThreats()
  const high = threats.some((t) => t.threat === 'high')

  return (
    <header className={styles.top}>
      <div className={styles.brand}>
        <Logo size={26} />
        <span className={styles.brandName}>
          MINOTAUR <span>GUARDIAN</span>
        </span>
      </div>
      <h1 className={styles.title}>{ROUTE_TITLES[route]}</h1>

      <div className={styles.status}>
        {threats.length > 0 && (
          <a
            className={styles.threat}
            href={href('radar')}
            data-tone={high ? 'danger' : 'warn'}
            aria-label={`${threats.length} air threat${threats.length > 1 ? 's' : ''}, open radar`}
          >
            <Icon name="radar" size={16} />
            <span className="mono">{threats.length}</span>
          </a>
        )}
        <span className={styles.chip} data-hide="narrow" title="Link quality to base">
          <Icon name="link" size={16} />
          <span className="mono">{signal}%</span>
        </span>
        <span className={styles.chip} title="Robot battery" data-tone={battery < 15 ? 'danger' : battery < 30 ? 'warn' : undefined}>
          <Icon name="battery" size={16} />
          <span className="mono">{battery}%</span>
        </span>
        <span className={styles.chip} data-hide="phone" title="Mission time">
          <span className="mono">T+{formatDuration(missionSeconds)}</span>
        </span>
        {sim && <SimControls sim={sim} />}
      </div>
    </header>
  )
}
