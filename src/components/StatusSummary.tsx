import { useMemo } from 'react'
import { CLASS_LABEL, DRONE_PHASE_LABEL, MODE_LABEL, THREAT_LABEL, percent } from '../lib/format'
import { useWorld } from '../state/hooks'
import { THREAT_TONE } from './radar/threat'
import { Meter, Stat, StatGrid } from './ui'

/** One glance at the whole system. Values are white when normal and coloured only when they need attention. */
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
  const airTone = top ? THREAT_TONE[top.threat] : undefined

  return (
    <StatGrid>
      <Stat
        label="Robot"
        value={MODE_LABEL[robot.mode]}
        tone={robot.interlock ? 'warn' : undefined}
        hint={robot.interlock ?? (zone ? `${zone.name}, ${zone.description.toLowerCase()}` : 'No sector assigned')}
      />
      <>
        <Stat label="Battery" value={Math.round(robot.battery)} unit="%" />
        <Meter value={robot.battery} label="Robot battery" warnBelow={30} dangerBelow={15} />
      </>
      <>
        <Stat label="Link" value={Math.round(robot.signal)} unit="%" />
        <Meter value={robot.signal} label="Link quality" warnBelow={30} />
      </>
      <Stat
        label="Drone"
        value={DRONE_PHASE_LABEL[drone.phase]}
        hint={`Battery ${Math.round(drone.battery)}%${drone.phase !== 'docked' ? `, ${Math.round(drone.altitude)} m up` : ''}`}
      />
      <Stat label="Survey" value={percent(survey.coverage)} hint={`${survey.done} of ${zones.length} sectors done`} />
      <Stat
        label="Metal contacts"
        value={contacts}
        tone={contacts > 0 ? 'warn' : undefined}
        hint={contacts > 0 ? 'Marked for inspection' : 'None found yet'}
      />
      <Stat
        label="Air contacts"
        value={targets.length}
        tone={airTone === 'neutral' ? undefined : airTone}
        hint={
          top
            ? `${top.label} ${CLASS_LABEL[top.classification].toLowerCase()}, ${THREAT_LABEL[top.threat].toLowerCase()}`
            : 'Sky clear'
        }
      />
      <Stat label="Speed" value={Math.abs(robot.speed).toFixed(1)} unit="m/s" hint={`${Math.round(robot.odometer)} m driven`} />
    </StatGrid>
  )
}
