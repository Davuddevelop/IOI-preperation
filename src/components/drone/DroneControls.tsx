import { distance } from '../../data/geometry'
import { DRONE } from '../../data/specs'
import type { DronePhase } from '../../data/types'
import { DRONE_PHASE_LABEL, formatDuration, formatMeters } from '../../lib/format'
import { useSend, useWorld } from '../../state/hooks'
import { Badge, Button, Meter, Stat } from '../ui'
import styles from './DroneControls.module.css'

const PHASE_NOTE: Record<DronePhase, string> = {
  docked: 'In the bay and charging.',
  launching: 'Opening the bay and climbing out.',
  airborne: 'On station. Tap the flight map to send it somewhere.',
  returning: 'Flying back to the robot.',
  landing: 'Descending into the bay.',
}

export function DroneControls() {
  const drone = useWorld((s) => s.drone)
  const robotPos = useWorld((s) => s.robot.pos)
  const send = useSend()

  const lowBattery = drone.battery < DRONE.launchBattery
  const busy = drone.phase === 'launching' || drone.phase === 'landing' || drone.phase === 'returning'
  const range = distance(drone.pos, robotPos)

  return (
    <div className={styles.controls}>
      <div className={styles.status}>
        <Badge tone="drone" pulse={busy}>
          {DRONE_PHASE_LABEL[drone.phase]}
        </Badge>
        <p>
          {drone.phase === 'docked' && lowBattery
            ? `Charging — launch available at ${DRONE.launchBattery}%.`
            : drone.phase === 'airborne' && drone.goal
              ? 'Circling the tasked point.'
              : PHASE_NOTE[drone.phase]}
        </p>
      </div>

      <div className={styles.actions}>
        <Button
          variant="primary"
          icon="launch"
          disabled={drone.phase !== 'docked' || lowBattery}
          onClick={() => send({ type: 'drone/launch' })}
        >
          Launch
        </Button>
        <Button icon="land" disabled={drone.phase !== 'airborne'} onClick={() => send({ type: 'drone/return' })}>
          Return &amp; land
        </Button>
      </div>

      <div className={styles.stats}>
        <Stat label="Altitude" value={Math.round(drone.altitude)} unit="m" tone="drone" />
        <Stat label="Speed" value={drone.speed.toFixed(1)} unit="m/s" />
        <div className={styles.withMeter}>
          <Stat label="Battery" value={Math.round(drone.battery)} unit="%" />
          <Meter value={drone.battery} label="Drone battery" />
        </div>
        <Stat label="Flight time" value={drone.phase === 'docked' ? '—' : formatDuration(drone.flightTime)} />
        <Stat
          label="From robot"
          value={drone.phase === 'docked' ? '—' : formatMeters(range)}
          hint={`Max ${DRONE.maxRange} m`}
        />
      </div>
    </div>
  )
}
