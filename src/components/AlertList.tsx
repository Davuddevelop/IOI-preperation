import { useMemo } from 'react'
import { formatAgo, formatClock } from '../lib/format'
import { useSend, useWorld } from '../state/hooks'
import styles from './AlertList.module.css'
import { CATEGORY_ICON } from './categoryIcons'
import { Icon } from './Icon'
import { EmptyState } from './ui'

/** Warnings and criticals the operator has not acknowledged yet, newest first. */
export function AlertList() {
  const events = useWorld((s) => s.events)
  // Rounded to 5 s so "2 min ago" labels refresh without re-rendering every tick.
  const now = useWorld((s) => Math.floor(s.clock / 5000) * 5000)
  const send = useSend()
  const open = useMemo(() => events.filter((e) => !e.acknowledged), [events])

  if (open.length === 0) return <EmptyState>No open alerts — all systems nominal.</EmptyState>

  return (
    <ul className={styles.list}>
      {open.map((e) => (
        <li key={e.id} className={styles.alert} data-tone={e.severity === 'critical' ? 'danger' : 'warn'}>
          <Icon name={CATEGORY_ICON[e.category]} size={18} className={styles.icon} />
          <div className={styles.body}>
            <p>{e.message}</p>
            <span className="mono">
              {formatClock(e.time)} · {formatAgo(e.time, now)}
            </span>
          </div>
          <button
            type="button"
            className={styles.ack}
            onClick={() => send({ type: 'events/acknowledge', id: e.id })}
            aria-label={`Acknowledge: ${e.message}`}
            title="Acknowledge"
          >
            <Icon name="check" size={18} />
          </button>
        </li>
      ))}
    </ul>
  )
}
