import { useState } from 'react'
import { AlertList } from '../components/AlertList'
import { DroneFeed, RobotFeed } from '../components/feeds/Feeds'
import { MapLegend, TacticalMap } from '../components/map/TacticalMap'
import { StatusSummary } from '../components/StatusSummary'
import { Badge, Button, Panel, Segmented } from '../components/ui'
import { useOpenAlertCount } from '../state/derived'
import { useSend } from '../state/hooks'
import styles from './screens.module.css'

export function OverviewScreen() {
  const [feed, setFeed] = useState<'robot' | 'drone'>('robot')
  const openAlerts = useOpenAlertCount()
  const send = useSend()

  return (
    <div className={styles.overview}>
      <Panel title="Tactical map" icon="territories" flush className={styles.map} bodyClassName={styles.mapBody}>
        <TacticalMap className={styles.mapCanvas} />
        <MapLegend />
      </Panel>

      <Panel title="System status" icon="overview" className={styles.status}>
        <StatusSummary />
      </Panel>

      <Panel
        title="Live feed"
        icon="eye"
        flush
        className={styles.feeds}
        actions={
          <Segmented
            label="Camera"
            value={feed}
            options={[
              { value: 'robot', label: 'Robot' },
              { value: 'drone', label: 'Drone' },
            ]}
            onChange={setFeed}
          />
        }
      >
        {feed === 'robot' ? <RobotFeed compact /> : <DroneFeed compact />}
      </Panel>

      <Panel
        title="Alerts"
        icon="alert"
        className={styles.alerts}
        bodyClassName={styles.scrollBody}
        tag={openAlerts > 0 && <Badge tone="warn">{openAlerts} open</Badge>}
        actions={
          openAlerts > 0 && (
            <Button variant="ghost" icon="check" onClick={() => send({ type: 'events/acknowledge', id: 'all' })}>
              All
            </Button>
          )
        }
      >
        <AlertList />
      </Panel>
    </div>
  )
}
