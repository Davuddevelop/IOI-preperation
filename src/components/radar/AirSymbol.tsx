import type { AirTarget } from '../../data/types'
import { AIR_PATHS, airShape } from '../map/symbols'
import styles from './AirSymbol.module.css'

/** The same shape the map and radar use for a target, sized for text. */
export function AirSymbol({ target }: { target: Pick<AirTarget, 'classification' | 'threat'> }) {
  const shape = airShape(target)
  return (
    <svg viewBox="-2 -2 4 4" className={styles.symbol} data-shape={shape} data-threat={target.threat} aria-hidden="true">
      <path d={AIR_PATHS[shape]} />
    </svg>
  )
}
