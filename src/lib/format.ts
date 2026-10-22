import type { AirClass, DronePhase, LidState, RobotMode, ThreatLevel, ZoneStatus } from '../data/types'

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0')

/** 14:05:09 in local time. */
export function formatClock(ms: number) {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 1:02:03 or 02:03 */
export function formatDuration(seconds: number) {
  const s = Math.max(0, seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
}

export function formatAgo(ms: number, now: number) {
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s} s ago`
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
export const cardinal = (deg: number) => CARDINALS[Math.round(deg / 45) % 8]

/** 045° NE */
export const formatBearing = (deg: number) => `${String(Math.round(deg) % 360).padStart(3, '0')}° ${cardinal(deg)}`

export const formatMeters = (m: number) => (m < 10 ? `${m.toFixed(1)} m` : `${Math.round(m)} m`)

export const percent = (fraction: number) => `${Math.round(fraction * 100)}%`

export const MODE_LABEL: Record<RobotMode, string> = { patrol: 'Auto survey', manual: 'Manual', hold: 'Hold' }

export const DRONE_PHASE_LABEL: Record<DronePhase, string> = {
  docked: 'Docked',
  launching: 'Launching',
  airborne: 'Airborne',
  returning: 'Returning',
  landing: 'Landing',
}

export const LID_LABEL: Record<LidState, string> = {
  closed: 'Closed',
  opening: 'Opening',
  open: 'Open',
  closing: 'Closing',
}

export const CLASS_LABEL: Record<AirClass, string> = {
  unknown: 'Unidentified',
  quadcopter: 'Quadcopter',
  'fixed-wing': 'Fixed-wing UAV',
  bird: 'Bird',
}

export const THREAT_LABEL: Record<ThreatLevel, string> = {
  none: 'No threat',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const ZONE_STATUS_LABEL: Record<ZoneStatus, string> = {
  pending: 'Not surveyed',
  surveying: 'Surveying',
  surveyed: 'Surveyed',
}
