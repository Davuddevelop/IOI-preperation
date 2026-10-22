import type { AirTarget } from '../../data/types'

/**
 * Map symbols, drawn in a local unit square and scaled by the caller.
 *
 * Shapes follow the idea of military map symbology: the outline says who it
 * is, colour only says how urgent. Our units are round or chevrons, hostile
 * aircraft are diamonds, unidentified ones are open squares, and metal
 * contacts are caution triangles.
 */

export type AirShape = 'hostile' | 'unknown' | 'neutral'

export function airShape(target: Pick<AirTarget, 'classification'>): AirShape {
  if (target.classification === 'unknown') return 'unknown'
  if (target.classification === 'bird') return 'neutral'
  return 'hostile'
}

export const AIR_PATHS: Record<AirShape, string> = {
  hostile: 'M0 -1.5 1.5 0 0 1.5 -1.5 0z',
  unknown: 'M-1.2 -1.2h2.4v2.4h-2.4z',
  neutral: 'M-0.7 -0.7h1.4v1.4h-1.4z',
}

export const CONTACT_PATH = 'M0 -1.3 1.3 1 -1.3 1z'
export const ROBOT_PATH = 'M0 -2 1.5 1.5 0 0.6 -1.5 1.5z'
