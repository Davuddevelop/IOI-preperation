import { useCallback, useEffect, useRef } from 'react'
import { useSend } from '../state/hooks'

/** How often a held stick or key re-sends its command. Must be shorter than the robot's drive watchdog. */
const REPEAT_MS = 100

const KEYS: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * Turns joystick and keyboard input into drive commands.
 *
 * The robot obeys a drive command for only a moment (a watchdog), so while
 * input is held we keep re-sending it. If the browser tab freezes or the link
 * drops, the commands stop arriving and the robot stops by itself — the safe
 * failure. Returns the joystick's change handler.
 */
export function useDriveControl() {
  const send = useSend()
  const stick = useRef({ x: 0, y: 0 })
  const keys = useRef(new Set<string>())

  useEffect(() => {
    const held = keys.current
    const current = () => ({
      throttle: Number(held.has('up')) - Number(held.has('down')) || stick.current.y,
      turn: Number(held.has('right')) - Number(held.has('left')) || stick.current.x,
    })

    let wasMoving = false
    const timer = setInterval(() => {
      const { throttle, turn } = current()
      const moving = throttle !== 0 || turn !== 0
      // Keep sending while moving, plus one final zero to stop cleanly.
      if (moving || wasMoving) send({ type: 'robot/drive', throttle, turn })
      wasMoving = moving
    }, REPEAT_MS)

    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEYS[e.code]
      if (!dir || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      e.preventDefault()
      held.add(dir)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const dir = KEYS[e.code]
      if (dir) held.delete(dir)
    }
    const onBlur = () => held.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      clearInterval(timer)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [send])

  return useCallback(
    (x: number, y: number) => {
      stick.current = { x, y }
      send({ type: 'robot/drive', throttle: y, turn: x })
    },
    [send],
  )
}
