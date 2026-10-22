import { NAV_ITEMS } from '../../navigation'
import { href, type Route } from '../../router'
import { useAirThreats, useOpenAlertCount } from '../../state/derived'
import { Icon } from '../Icon'
import { Logo } from '../Logo'
import styles from './NavBar.module.css'

/**
 * One component, three layouts (see NavBar.module.css): a bottom tab bar on
 * phones, an icon rail on tablets and a labelled sidebar on desktops.
 */
export function NavBar({ current }: { current: Route }) {
  const counts: Partial<Record<Route, number>> = { overview: useOpenAlertCount(), radar: useAirThreats().length }

  return (
    <nav className={styles.nav} aria-label="Main">
      <div className={styles.brand}>
        <Logo size={26} />
        <span className={styles.brandName}>
          Minotaur
          <span>Guardian</span>
        </span>
      </div>
      <ul className={styles.list}>
        {NAV_ITEMS.map((item) => {
          const count = counts[item.route] ?? 0
          return (
            <li key={item.route}>
              <a
                className={styles.item}
                href={href(item.route)}
                aria-current={current === item.route ? 'page' : undefined}
              >
                <span className={styles.iconWrap}>
                  <Icon name={item.icon} size={20} />
                  {count > 0 && (
                    <span className={styles.count} data-tone={item.route === 'radar' ? 'danger' : 'warn'}>
                      {count > 9 ? '9+' : count}
                      <span className="visually-hidden">{item.route === 'radar' ? ' air threats' : ' open alerts'}</span>
                    </span>
                  )}
                </span>
                <span className={styles.text}>{item.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
      <p className={styles.footer}>
        Team Batzilla
        <br />
        Prototype console 0.1
      </p>
    </nav>
  )
}
