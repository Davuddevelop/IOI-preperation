import { BayDiagram } from '../components/drone/BayDiagram'
import { DroneControls } from '../components/drone/DroneControls'
import { DroneFeed } from '../components/feeds/Feeds'
import { TacticalMap } from '../components/map/TacticalMap'
import { Badge, Button, Panel } from '../components/ui'
import { useSend, useWorld } from '../state/hooks'
import styles from './screens.module.css'

export function DroneScreen() {
  const airborne = useWorld((s) => s.drone.phase === 'airborne')
  const hasGoal = useWorld((s) => s.drone.goal !== null)
  const send = useSend()

  return (
    <div className={`${styles.columns} ${styles.droneLayout}`}>
      <div className={styles.mainColumn}>
        <Panel title="Aerial camera" icon="eye" flush className={styles.feed}>
          <DroneFeed />
        </Panel>
        <Panel
          title="Flight map"
          icon="territories"
          flush
          className={styles.flightMap}
          tag={<Badge tone={airborne ? 'drone' : 'neutral'}>{airborne ? 'Tap to task' : 'Launch to task'}</Badge>}
          actions={
            hasGoal && (
              <Button variant="ghost" icon="crosshair" onClick={() => send({ type: 'drone/goTo', target: null })}>
                Orbit robot
              </Button>
            )
          }
        >
          <TacticalMap
            className={styles.mapCanvas}
            onPick={airborne ? (target) => send({ type: 'drone/goTo', target }) : undefined}
          />
        </Panel>
      </div>
      <div className={styles.sideColumn}>
        <Panel title="Flight control" icon="drone" className={styles.control}>
          <DroneControls />
        </Panel>
        <Panel title="Drone bay" icon="bay" className={styles.bay}>
          <BayDiagram />
        </Panel>
      </div>
    </div>
  )
}
