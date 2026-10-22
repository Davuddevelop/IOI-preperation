import { useEffect, useRef, type MouseEvent } from 'react'
import { useCanvasLoop } from '../../hooks/useCanvasLoop'
import { useDataSource } from '../../state/hooks'
import { blipPosition, drawRadar, type ScopeGeometry } from './drawRadar'
import styles from './RadarScope.module.css'

interface RadarScopeProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function RadarScope({ selectedId, onSelect }: RadarScopeProps) {
  const source = useDataSource()
  const selected = useRef(selectedId)
  const geometry = useRef<ScopeGeometry>({ cx: 0, cy: 0, radius: 1 })

  useEffect(() => {
    selected.current = selectedId
  }, [selectedId])

  const canvasRef = useCanvasLoop((ctx, frame) => {
    geometry.current = drawRadar(ctx, source.getSnapshot(), frame, selected.current)
  }, 60)

  // Pick the blip nearest the click, if it is close enough.
  const handleClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let best: string | null = null
    let bestDistance = 28
    for (const t of source.getSnapshot().airTargets) {
      const p = blipPosition(t.bearing, t.distance, geometry.current)
      const d = Math.hypot(p.x - x, p.y - y)
      if (d < bestDistance) {
        best = t.id
        bestDistance = d
      }
    }
    if (best) onSelect(best)
  }

  return (
    <div className={styles.scope}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onClick={handleClick}
        role="img"
        aria-label="Radar scope centred on the robot, north up. Targets are listed beside it."
      />
    </div>
  )
}
