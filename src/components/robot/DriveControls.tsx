import type { RobotMode } from '../../data/types'
import { useDriveControl } from '../../hooks/useDriveControl'
import { LID_LABEL } from '../../lib/format'
import { useSend, useWorld } from '../../state/hooks'
import { Badge, Button, Segmented } from '../ui'
import styles from './DriveControls.module.css'
import { Joystick } from './Joystick'

const MODES: { value: RobotMode; label: string }[] = [
  { value: 'patrol', label: 'Auto survey' },
  { value: 'manual', label: 'Manual' },
  { value: 'hold', label: 'Hold' },
]

export function DriveControls() {
  const onStick = useDriveControl()
  const send = useSend()
  const mode = useWorld((s) => s.robot.mode)
  const interlock = useWorld((s) => s.robot.interlock)
  const obstacleStop = useWorld((s) => s.robot.obstacleStop)
  const lid = useWorld((s) => s.robot.lid)
  const dronePhase = useWorld((s) => s.drone.phase)

  // The lid may not move while the drone is taking off or landing through it.
  const lidMovable = dronePhase === 'docked' || dronePhase === 'airborne'
  const lidOpening = lid === 'open' || lid === 'opening'

  return (
    <div className={styles.drive}>
      <Joystick onChange={onStick} disabled={!!interlock} />

      <div className={styles.side}>
        <div className={styles.group}>
          <span className="label">Mode</span>
          <Segmented
            label="Drive mode"
            value={mode}
            options={MODES}
            onChange={(m) => send({ type: 'robot/setMode', mode: m })}
          />
          <p className={styles.hint} aria-live="polite">
            {interlock ? (
              <Badge tone="warn">{interlock}</Badge>
            ) : obstacleStop ? (
              <Badge tone="danger">Safety stop: obstacle ahead</Badge>
            ) : mode === 'manual' ? (
              <>
                <span className={styles.touchHint}>Drag the stick to drive.</span>
                <span className={styles.keyHint}>Drag the stick or hold W A S D / arrow keys.</span>
              </>
            ) : (
              'Touch the stick to take manual control.'
            )}
          </p>
        </div>

        <div className={styles.group}>
          <span className="label">Drone bay</span>
          <div className={styles.bay}>
            <span className={styles.lid}>Lid {LID_LABEL[lid].toLowerCase()}</span>
            <Button
              disabled={!lidMovable}
              onClick={() => send({ type: 'robot/setLid', open: !lidOpening })}
            >
              {lidOpening ? 'Close lid' : 'Open lid'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
