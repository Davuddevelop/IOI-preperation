import { useMemo } from 'react'
import { formatAgo, formatClock } from '../lib/format'
import { useSend, useWorld } from '../state/hooks'
import styles from './AlertList.module.css'
import { EmptyState, Glyph } from './ui'

/** Warnings and criticals the operator has not acknowledged yet, newest first. */
export function AlertList() {
  const events = useWorld((s) => s.events)
  // Rounded to 5 s so "2 min ago" labels refresh without re-rendering every tick.
  const now = useWorld((s) => Math.floor(s.clock / 5000) * 5000)
  const send = useSend()
  const open = useMemo(() => events.filter((e) => !e.acknowledged), [events])

  if (open.length === 0) return <EmptyState>No open alerts.</EmptyState>

  return (
    <ul className={styles.list}>
      {open.map((e) => {
        const tone = e.severity === 'critical' ? 'danger' : 'warn'
        return (
          <li key={e.id} className={styles.alert} data-tone={tone}>
            <Glyph tone={tone} />
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
            >
              Ack
            </button>
          </li>
        )
      })}
    </ul>
  )
}
