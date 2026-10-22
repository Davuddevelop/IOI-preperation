import { useMemo } from 'react'
import { CLASS_LABEL, DRONE_PHASE_LABEL, MODE_LABEL, THREAT_LABEL, percent } from '../lib/format'
import { useWorld } from '../state/hooks'
import styles from './StatusSummary.module.css'
import { Meter, Stat, type Tone } from './ui'

/** One glance at the whole system: robot, drone, survey progress and the sky. */
export function StatusSummary() {
  const robot = useWorld((s) => s.robot)
  const drone = useWorld((s) => s.drone)
  const zones = useWorld((s) => s.zones)
  const contacts = useWorld((s) => s.contacts.length)
  const targets = useWorld((s) => s.airTargets)

  const survey = useMemo(() => {
    const area = zones.reduce((sum, z) => sum + z.rect.w * z.rect.h, 0)
    const swept = zones.reduce((sum, z) => sum + z.coverage * z.rect.w * z.rect.h, 0)
    return { coverage: swept / area, done: zones.filter((z) => z.status === 'surveyed').length }
  }, [zones])

  const zone = zones.find((z) => z.id === robot.surveyZoneId)
  const top = targets[0]
  const airTone: Tone | undefined = top?.threat === 'high' ? 'danger' : top?.threat === 'medium' ? 'warn' : undefined

  return (
    <div className={styles.grid}>
      <Stat
        label="Robot"
        value={MODE_LABEL[robot.mode]}
        tone={robot.interlock ? 'warn' : 'accent'}
        hint={robot.interlock ?? (zone ? `${zone.name} · ${zone.description}` : 'No sector assigned')}
      />
      <div className={styles.withMeter}>
        <Stat label="Battery" value={Math.round(robot.battery)} unit="%" />
        <Meter value={robot.battery} label="Robot battery" />
      </div>
      <div className={styles.withMeter}>
        <Stat label="Link" value={Math.round(robot.signal)} unit="%" />
        <Meter value={robot.signal} label="Link quality" tone={robot.signal < 30 ? 'warn' : 'accent'} />
      </div>
      <Stat
        label="Drone"
        value={DRONE_PHASE_LABEL[drone.phase]}
        tone="drone"
        hint={`Battery ${Math.round(drone.battery)}%${drone.phase !== 'docked' ? ` · ${Math.round(drone.altitude)} m` : ''}`}
      />
      <Stat
        label="Survey"
        value={percent(survey.coverage)}
        hint={`${survey.done} of ${zones.length} sectors done`}
      />
      <Stat label="Metal contacts" value={contacts} tone={contacts > 0 ? 'metal' : undefined} hint="Marked for inspection" />
      <Stat
        label="Air contacts"
        value={targets.length}
        tone={airTone}
        hint={top ? `${top.label} ${CLASS_LABEL[top.classification]} · ${THREAT_LABEL[top.threat]}` : 'Sky clear'}
      />
      <Stat label="Speed" value={Math.abs(robot.speed).toFixed(1)} unit="m/s" hint={`Odometer ${Math.round(robot.odometer)} m`} />
    </div>
  )
}
