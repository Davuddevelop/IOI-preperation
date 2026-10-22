import type { ThreatLevel } from '../../data/types'
import type { Tone } from '../ui'

export const THREAT_TONE: Record<ThreatLevel, Tone> = {
  high: 'danger',
  medium: 'warn',
  low: 'neutral',
  none: 'neutral',
}
