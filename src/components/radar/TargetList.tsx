import { CLASS_LABEL, THREAT_LABEL, formatMeters } from '../../lib/format'
import { useWorld } from '../../state/hooks'
import { Badge, EmptyState } from '../ui'
import { THREAT_TONE } from './threat'
import styles from './TargetList.module.css'

interface TargetListProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Tracked targets, most dangerous first. Doubles as the keyboard-accessible way to select. */
export function TargetList({ selectedId, onSelect }: TargetListProps) {
  const targets = useWorld((s) => s.airTargets)
  if (targets.length === 0) return <EmptyState>No aerial contacts — the sky is clear.</EmptyState>

  return (
    <ul className={styles.list}>
      {targets.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            className={styles.row}
            data-tone={THREAT_TONE[t.threat]}
            aria-pressed={t.id === selectedId}
            onClick={() => onSelect(t.id)}
          >
            <span className={styles.id}>{t.label}</span>
            <span className={styles.class}>{CLASS_LABEL[t.classification]}</span>
            <span className={`mono ${styles.numbers}`}>
              {formatMeters(t.distance)} · {String(Math.round(t.bearing)).padStart(3, '0')}°
            </span>
            <Badge tone={THREAT_TONE[t.threat]}>{THREAT_LABEL[t.threat]}</Badge>
          </button>
        </li>
      ))}
    </ul>
  )
}
