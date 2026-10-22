import { useMemo, useState } from 'react'
import type { EventCategory, Severity } from '../../data/types'
import { formatClock } from '../../lib/format'
import { useWorld } from '../../state/hooks'
import { CATEGORY_ICON } from '../categoryIcons'
import { Icon } from '../Icon'
import { EmptyState, type Tone } from '../ui'
import styles from './EventLog.module.css'

const CATEGORIES: { value: EventCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'robot', label: 'Robot' },
  { value: 'drone', label: 'Drone' },
  { value: 'radar', label: 'Radar' },
  { value: 'survey', label: 'Survey' },
  { value: 'system', label: 'System' },
]

const SEVERITY_TONE: Record<Severity, Tone> = { info: 'neutral', warning: 'warn', critical: 'danger' }

/** Every mission event, newest first, filterable by subsystem and severity. */
export function EventLog() {
  const events = useWorld((s) => s.events)
  const [category, setCategory] = useState<EventCategory | 'all'>('all')
  const [alertsOnly, setAlertsOnly] = useState(false)

  const visible = useMemo(
    () =>
      events.filter(
        (e) => (category === 'all' || e.category === category) && (!alertsOnly || e.severity !== 'info'),
      ),
    [events, category, alertsOnly],
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.filters} role="group" aria-label="Filter events">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            className={styles.chip}
            aria-pressed={category === c.value}
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          className={styles.chip}
          data-tone="warn"
          aria-pressed={alertsOnly}
          onClick={() => setAlertsOnly((v) => !v)}
        >
          Alerts only
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState>No events match this filter.</EmptyState>
      ) : (
        <ol className={styles.log}>
          {visible.map((e) => (
            <li key={e.id} className={styles.entry} data-tone={SEVERITY_TONE[e.severity]}>
              <time className="mono" dateTime={new Date(e.time).toISOString()}>
                {formatClock(e.time)}
              </time>
              <Icon name={CATEGORY_ICON[e.category]} size={16} className={styles.icon} />
              <span className={styles.message}>
                <span className="visually-hidden">{e.severity}: </span>
                {e.message}
              </span>
              {!e.acknowledged && <span className={styles.open}>Open</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
