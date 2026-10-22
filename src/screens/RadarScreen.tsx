import { useState } from 'react'
import { RadarScope } from '../components/radar/RadarScope'
import { TargetDetail } from '../components/radar/TargetDetail'
import { TargetList } from '../components/radar/TargetList'
import { Badge, Panel } from '../components/ui'
import { RADAR } from '../data/specs'
import { useWorld } from '../state/hooks'
import styles from './screens.module.css'

export function RadarScreen() {
  const targets = useWorld((s) => s.airTargets)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // If nothing is chosen, or the chosen target has left, show the most dangerous one.
  const selected = targets.find((t) => t.id === selectedId) ?? targets[0]

  return (
    <div className={`${styles.columns} ${styles.radarLayout}`}>
      <div className={styles.mainColumn}>
        <Panel
          title="Air surveillance"
          icon="radar"
          flush
          className={styles.feed}
          tag={<Badge tone="drone">Experimental</Badge>}
        >
          <RadarScope selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          <p className={styles.caption}>
            Range {RADAR.range} m · red ring {RADAR.highThreatRange} m alert radius · <span data-tone="drone">◆</span> our
            drone · tap a target to inspect
          </p>
        </Panel>
      </div>
      <div className={styles.sideColumn}>
        <Panel title="Selected target" icon="crosshair" className={styles.detail}>
          <TargetDetail target={selected} />
        </Panel>
        <Panel title={`Tracked contacts (${targets.length})`} icon="alert" className={styles.list}>
          <TargetList selectedId={selected?.id ?? null} onSelect={setSelectedId} />
        </Panel>
      </div>
    </div>
  )
}
