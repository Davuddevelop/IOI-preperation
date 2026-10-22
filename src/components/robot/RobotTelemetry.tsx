import { formatBearing } from '../../lib/format'
import { useWorld } from '../../state/hooks'
import { Meter, Stat } from '../ui'
import styles from './RobotTelemetry.module.css'

export function RobotTelemetry() {
  const robot = useWorld((s) => s.robot)
  const zones = useWorld((s) => s.zones)
  const zone = zones.find((z) => z.id === robot.surveyZoneId)

  return (
    <div className={styles.grid}>
      <Stat label="Speed" value={robot.speed.toFixed(1)} unit="m/s" />
      <Stat label="Heading" value={formatBearing(robot.heading)} />
      <div className={styles.withMeter}>
        <Stat label="Battery" value={Math.round(robot.battery)} unit="%" />
        <Meter value={robot.battery} label="Robot battery" />
      </div>
      <div className={styles.withMeter}>
        <Stat label="Link" value={Math.round(robot.signal)} unit="%" />
        <Meter value={robot.signal} label="Link quality" tone={robot.signal < 30 ? 'warn' : 'accent'} />
      </div>
      <Stat label="Motor temp" value={robot.temperature.toFixed(1)} unit="°C" tone={robot.temperature > 60 ? 'warn' : undefined} />
      <Stat label="Odometer" value={Math.round(robot.odometer)} unit="m" />
      <Stat label="Position" value={`${robot.pos.x.toFixed(1)} E`} hint={`${robot.pos.y.toFixed(1)} S of grid origin`} />
      <Stat label="Sector" value={zone ? zone.name : '—'} hint={zone?.description ?? 'Not surveying'} />
    </div>
  )
}
