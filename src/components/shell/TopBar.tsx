import { formatDuration } from '../../lib/format'
import { ROUTE_TITLES } from '../../navigation'
import type { Route } from '../../router'
import { useWorld } from '../../state/hooks'
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

  return (
    <header className={styles.top}>
      <div className={styles.brand}>
        <Logo size={22} />
        <span className={styles.brandName}>Minotaur</span>
      </div>
      <h1 className={styles.title}>{ROUTE_TITLES[route]}</h1>

      <dl className={styles.readouts}>
        <div data-hide="narrow">
          <dt>Link</dt>
          <dd className="mono" data-tone={signal < 30 ? 'warn' : undefined}>
            {signal}%
          </dd>
        </div>
        <div>
          <dt>Battery</dt>
          <dd className="mono" data-tone={battery < 15 ? 'danger' : battery < 30 ? 'warn' : undefined}>
            {battery}%
          </dd>
        </div>
        <div data-hide="phone">
          <dt>Mission</dt>
          <dd className="mono">T+{formatDuration(missionSeconds)}</dd>
        </div>
      </dl>
      {sim && <SimControls sim={sim} />}
    </header>
  )
}
