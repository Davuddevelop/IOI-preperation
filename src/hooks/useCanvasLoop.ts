import { useEffect, useRef } from 'react'

export interface Frame {
  /** CSS pixels. */
  width: number
  height: number
  /** Seconds, monotonic. */
  time: number
}

/**
 * Runs `draw` on a canvas every animation frame, outside React rendering.
 *
 * Canvases that animate (camera feeds, radar sweep) should not go through
 * React state: re-rendering components 60 times a second is wasteful. Instead
 * the draw function reads the latest data itself each frame.
 *
 * Handles high-DPI screens, resizing, a frame-rate cap, and pausing while the
 * canvas is scrolled out of view.
 */
export function useCanvasLoop(draw: (ctx: CanvasRenderingContext2D, frame: Frame) => void, fps = 30) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)

  useEffect(() => {
    drawRef.current = draw
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr))
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    let visible = true
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    intersectionObserver.observe(canvas)

    let raf = 0
    let last = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible || now - last < 1000 / fps - 2) return
      last = now
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) return
      ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0)
      drawRef.current(ctx, { width, height, time: now / 1000 })
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [fps])

  return canvasRef
}
