import { useMemo, useState } from 'react'
import { TacticalMap } from '../components/map/TacticalMap'
import { EventLog } from '../components/territories/EventLog'
import { ZoneList } from '../components/territories/ZoneList'
import { Button, Panel } from '../components/ui'
import { percent } from '../lib/format'
import { useOpenAlertCount } from '../state/derived'
import { useSend, useWorld } from '../state/hooks'
import styles from './screens.module.css'

export function TerritoriesScreen() {
  const zones = useWorld((s) => s.zones)
  const activeZone = useWorld((s) => s.robot.surveyZoneId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const openAlerts = useOpenAlertCount()
  const send = useSend()

  const coverage = useMemo(() => {
    const area = zones.reduce((sum, z) => sum + z.rect.w * z.rect.h, 0)
    return zones.reduce((sum, z) => sum + z.coverage * z.rect.w * z.rect.h, 0) / area
  }, [zones])

  return (
    <div className={styles.territories}>
      <Panel
        title="Sectors"
        flush
        className={styles.zones}
        tag={`${percent(coverage)} swept`}
      >
        <ZoneList selectedId={selectedId ?? activeZone} onSelect={setSelectedId} />
      </Panel>

      <Panel title="Sector map" flush className={styles.map} bodyClassName={styles.mapBody}>
        <TacticalMap className={styles.mapCanvas} highlightZoneId={selectedId ?? activeZone} onSelectZone={setSelectedId} />
      </Panel>

      <Panel
        title="Mission log"
        className={styles.log}
        bodyClassName={styles.logBody}
        actions={
          openAlerts > 0 && (
            <Button variant="ghost" icon="check" onClick={() => send({ type: 'events/acknowledge', id: 'all' })}>
              Acknowledge {openAlerts}
            </Button>
          )
        }
      >
        <EventLog />
      </Panel>
    </div>
  )
}
