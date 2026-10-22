import type { ZoneStatus } from '../../data/types'
import { cx } from '../../lib/cx'
import { ZONE_STATUS_LABEL, percent } from '../../lib/format'
import { useSend, useWorld } from '../../state/hooks'
import { Badge, Button, Meter, type Tone } from '../ui'
import styles from './ZoneList.module.css'

const STATUS_TONE: Record<ZoneStatus, Tone> = {
  pending: 'neutral',
  surveying: 'accent',
  surveyed: 'drone',
}

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
        <li key={z.id} className={cx(styles.card, z.id === selectedId && styles.selected)}>
          <button type="button" className={styles.select} aria-pressed={z.id === selectedId} onClick={() => onSelect(z.id)}>
            <span className={styles.letter}>{z.id}</span>
            <span className={styles.name}>
              <strong>{z.name}</strong>
              <span>
                {z.description} · {z.rect.w}×{z.rect.h} m
              </span>
            </span>
            <Badge tone={STATUS_TONE[z.status]} pulse={z.status === 'surveying'}>
              {ZONE_STATUS_LABEL[z.status]}
            </Badge>
          </button>

          <div className={styles.progress}>
            <Meter value={z.coverage * 100} label={`${z.name} coverage`} tone="accent" />
            <span className="mono">{percent(z.coverage)}</span>
          </div>

          <div className={styles.footer}>
            <span data-tone={z.contacts > 0 ? 'metal' : undefined} className={styles.contacts}>
              {z.contacts} metal contact{z.contacts === 1 ? '' : 's'}
            </span>
            <Button
              variant={z.id === activeZone ? 'ghost' : 'default'}
              icon="robot"
              disabled={z.id === activeZone}
              onClick={() => send({ type: 'robot/surveyZone', zoneId: z.id })}
            >
              {z.id === activeZone ? 'Robot here' : z.status === 'surveyed' ? 'Re-survey' : 'Send robot'}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
