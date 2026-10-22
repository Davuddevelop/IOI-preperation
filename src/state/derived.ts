import { useMemo } from 'react'
import { useWorld } from './hooks'

/** Values computed from the snapshot that several components need. */

export function useOpenAlertCount() {
  const events = useWorld((s) => s.events)
  return useMemo(() => events.filter((e) => !e.acknowledged).length, [events])
}

/** Tracked air targets worth the operator's attention (medium or high threat). */
export function useAirThreats() {
  const targets = useWorld((s) => s.airTargets)
  return useMemo(() => targets.filter((t) => t.threat === 'high' || t.threat === 'medium'), [targets])
}
