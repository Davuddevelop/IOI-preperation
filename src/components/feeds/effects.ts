/** Shared camera effects: film grain, vignette, and a deterministic hash for scattering details. */

let grain: HTMLCanvasElement | null = null

function grainTile() {
  if (grain) return grain
  grain = document.createElement('canvas')
  grain.width = grain.height = 128
  const g = grain.getContext('2d')!
  const img = g.createImageData(128, 128)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return grain
}

/** Sensor noise: a random-offset noise tile tiled across the frame. */
export function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  const tile = grainTile()
  const ox = Math.floor(Math.random() * 128)
  const oy = Math.floor(Math.random() * 128)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'overlay'
  for (let y = -oy; y < h; y += 128) for (let x = -ox; x < w; x += 128) ctx.drawImage(tile, x, y)
  ctx.restore()
}

export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.55) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) / 2)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${strength})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

/** Full-frame static for a feed with no picture. */
export function drawStatic(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#0b0f0d'
  ctx.fillRect(0, 0, w, h)
  drawGrain(ctx, w, h, 0.35)
  drawVignette(ctx, w, h, 0.7)
}

/** Stable pseudo-random 0–1 for integer cell coordinates, so scenery stays put between frames. */
export function hash2(x: number, y: number, salt = 0) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(salt, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
