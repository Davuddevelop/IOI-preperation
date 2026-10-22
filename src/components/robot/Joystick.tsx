import { useRef, useState, type PointerEvent } from 'react'
import { cx } from '../../lib/cx'
import styles from './Joystick.module.css'

const DEADZONE = 0.08

interface JoystickProps {
  /** x: −1 (left) … 1 (right); y: −1 (back) … 1 (forward). */
  onChange: (x: number, y: number) => void
  disabled?: boolean
}

/**
 * A touch/mouse joystick. Pointer capture keeps the drag going even when the
 * finger slides off the control, and releasing always sends (0, 0).
 */
export function Joystick({ onChange, disabled }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null)
  const pointerId = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  const update = (e: PointerEvent) => {
    const rect = baseRef.current!.getBoundingClientRect()
    const radius = rect.width / 2
    let x = (e.clientX - rect.left - radius) / radius
    let y = (e.clientY - rect.top - radius) / radius
    const length = Math.hypot(x, y)
    if (length > 1) {
      x /= length
      y /= length
    }
    setKnob({ x, y })
    const dead = (v: number) => (Math.abs(v) < DEADZONE ? 0 : v)
    // Screen y grows downwards; "forward" is up.
    onChange(dead(x), dead(-y))
  }

  const release = () => {
    pointerId.current = null
    setDragging(false)
    setKnob({ x: 0, y: 0 })
    onChange(0, 0)
  }

  return (
    <div
      ref={baseRef}
      className={cx(styles.base, disabled && styles.disabled, dragging && styles.dragging)}
      role="img"
      aria-label="Drive joystick. Keyboard: W A S D or arrow keys."
      onPointerDown={(e) => {
        if (disabled) return
        e.currentTarget.setPointerCapture(e.pointerId)
        pointerId.current = e.pointerId
        setDragging(true)
        update(e)
      }}
      onPointerMove={(e) => {
        if (pointerId.current === e.pointerId) update(e)
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <span className={styles.cross} />
      <span
        className={styles.knob}
        // Knob travel is 30% of the base width in each direction.
        style={{ transform: `translate(calc(-50% + ${knob.x * 30}cqw), calc(-50% + ${knob.y * 30}cqw))` }}
      />
    </div>
  )
}
