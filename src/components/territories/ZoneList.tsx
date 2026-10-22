import { cx } from '../../lib/cx'
import { ZONE_STATUS_LABEL, percent } from '../../lib/format'
import { useSend, useWorld } from '../../state/hooks'
import { Button, Glyph, Meter } from '../ui'
import styles from './ZoneList.module.css'

interface ZoneListProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ZoneList({ selectedId, onSelect }: ZoneListProps) {
  const zones = useWorld((s) => s.zones)
  const activeZone = useWorld((s) => s.robot.surveyZoneId)
  const send = useSend()

  return (
    <ul className={styles.list}>
      {zones.map((z) => (
        <li key={z.id} className={cx(styles.row, z.id === selectedId && styles.selected)}>
          <button type="button" className={styles.select} aria-pressed={z.id === selectedId} onClick={() => onSelect(z.id)}>
            <span className={`mono ${styles.letter}`}>{z.id}</span>
            <span className={styles.name}>
              <span>{z.name}</span>
              <span>
                {z.description}, {z.rect.w}×{z.rect.h} m
              </span>
            </span>
            <span className={styles.status} data-status={z.status}>
              {ZONE_STATUS_LABEL[z.status]}
            </span>
          </button>

          <div className={styles.progress}>
            <Meter value={z.coverage * 100} label={`${z.name} coverage`} />
            <span className="mono">{percent(z.coverage)}</span>
          </div>

          <div className={styles.footer}>
            <span className={styles.contacts} data-tone={z.contacts > 0 ? 'warn' : undefined}>
              {z.contacts > 0 && <Glyph tone="warn" />}
              {z.contacts} metal contact{z.contacts === 1 ? '' : 's'}
            </span>
            {z.id === activeZone ? (
              <span className={styles.here}>Robot is here</span>
            ) : (
              <Button onClick={() => send({ type: 'robot/surveyZone', zoneId: z.id })}>
                {z.status === 'surveyed' ? 'Survey again' : 'Send robot'}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
