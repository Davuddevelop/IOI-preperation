import { useId } from 'react'
import type { SimulationInfo } from '../../data/types'
import { useSend } from '../../state/hooks'
import { Button, Segmented } from '../ui'
import styles from './SimControls.module.css'

const SPEEDS = [1, 2, 4, 8]

/**
 * The simulation button and its menu. Uses the browser's built-in popover,
 * which gives us open/close, Escape and tap-outside-to-dismiss with no extra code.
 */
export function SimControls({ sim }: { sim: SimulationInfo }) {
  const send = useSend()
  const id = useId()

  return (
    <>
      <button type="button" className={styles.trigger} popoverTarget={id} aria-label="Simulation settings">
        Sim <span className="mono">{sim.paused ? 'paused' : `×${sim.speed}`}</span>
      </button>
      <div id={id} popover="auto" className={styles.popover}>
        <p className={styles.heading}>Simulation</p>
        <p className={styles.note}>
          No robot is connected. Positions, sensor readings and threats on this console are generated live for
          demonstration.
        </p>
        <span className="label">Speed</span>
        <Segmented
          label="Simulation speed"
          value={String(sim.speed)}
          options={SPEEDS.map((s) => ({ value: String(s), label: `×${s}` }))}
          onChange={(v) => send({ type: 'sim/setSpeed', speed: Number(v) })}
        />
        <div className={styles.row}>
          <Button
            icon={sim.paused ? 'play' : 'pause'}
            onClick={() => send({ type: 'sim/setPaused', paused: !sim.paused })}
          >
            {sim.paused ? 'Resume' : 'Pause'}
          </Button>
          <Button icon="reset" onClick={() => send({ type: 'sim/reset' })}>
            Restart
          </Button>
        </div>
      </div>
    </>
  )
}
