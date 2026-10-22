import { RobotFeed } from '../components/feeds/Feeds'
import { DriveControls } from '../components/robot/DriveControls'
import { MetalDetector } from '../components/robot/MetalDetector'
import { ObstacleRing } from '../components/robot/ObstacleRing'
import { RobotTelemetry } from '../components/robot/RobotTelemetry'
import { Panel } from '../components/ui'
import styles from './screens.module.css'

export function RobotScreen() {
  return (
    <div className={`${styles.columns} ${styles.robotLayout}`}>
      <div className={styles.mainColumn}>
        <Panel title="Front camera" flush className={styles.feed}>
          <RobotFeed />
        </Panel>
        <Panel title="Drive" className={styles.control}>
          <DriveControls />
        </Panel>
        <Panel title="Telemetry" flush className={styles.telemetry}>
          <RobotTelemetry />
        </Panel>
      </div>
      <div className={styles.sideColumn}>
        <Panel title="Obstacle sensors" className={styles.sensors}>
          <ObstacleRing />
        </Panel>
        <Panel title="Metal detector" className={styles.metal}>
          <MetalDetector />
        </Panel>
      </div>
    </div>
  )
}
