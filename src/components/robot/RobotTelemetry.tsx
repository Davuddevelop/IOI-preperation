import { formatBearing } from '../../lib/format'
import { useWorld } from '../../state/hooks'
import { Meter, Stat, StatGrid } from '../ui'

export function RobotTelemetry() {
  const robot = useWorld((s) => s.robot)
  const zones = useWorld((s) => s.zones)
  const zone = zones.find((z) => z.id === robot.surveyZoneId)

  return (
    <StatGrid>
      <Stat label="Speed" value={robot.speed.toFixed(1)} unit="m/s" />
      <Stat label="Heading" value={formatBearing(robot.heading)} />
      <>
        <Stat label="Battery" value={Math.round(robot.battery)} unit="%" />
        <Meter value={robot.battery} label="Robot battery" warnBelow={30} dangerBelow={15} />
      </>
      <>
        <Stat label="Link" value={Math.round(robot.signal)} unit="%" />
        <Meter value={robot.signal} label="Link quality" warnBelow={30} />
      </>
      <Stat label="Motor temp" value={robot.temperature.toFixed(1)} unit="°C" tone={robot.temperature > 60 ? 'warn' : undefined} />
      <Stat label="Odometer" value={Math.round(robot.odometer)} unit="m" />
      <Stat label="Position" value={`${robot.pos.x.toFixed(1)} E`} hint={`${robot.pos.y.toFixed(1)} S of grid origin`} />
      <Stat label="Sector" value={zone ? zone.name : '—'} hint={zone?.description ?? 'Not surveying'} />
    </StatGrid>
  )
}
