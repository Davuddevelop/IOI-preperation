import { BayDiagram } from '../components/drone/BayDiagram'
import { DroneControls } from '../components/drone/DroneControls'
import { DroneFeed } from '../components/feeds/Feeds'
import { TacticalMap } from '../components/map/TacticalMap'
import { Button, Panel } from '../components/ui'
import { useSend, useWorld } from '../state/hooks'
import styles from './screens.module.css'

export function DroneScreen() {
  const airborne = useWorld((s) => s.drone.phase === 'airborne')
  const hasGoal = useWorld((s) => s.drone.goal !== null)
  const send = useSend()

  return (
    <div className={`${styles.columns} ${styles.droneLayout}`}>
      <div className={styles.mainColumn}>
        <Panel title="Aerial camera" flush className={styles.feed}>
          <DroneFeed />
        </Panel>
        <Panel
          title="Flight map"
          flush
          className={styles.flightMap}
          tag={airborne ? 'Tap the map to send the drone' : 'Launch the drone to task it'}
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
        <Panel title="Flight control" flush className={styles.control}>
          <DroneControls />
        </Panel>
        <Panel title="Drone bay" className={styles.bay}>
          <BayDiagram />
        </Panel>
      </div>
    </div>
  )
}
