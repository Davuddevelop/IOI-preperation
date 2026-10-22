/**
 * Seeded pseudo-random numbers (mulberry32). Seeding makes the simulation
 * repeatable: the same seed always produces the same map and the same events,
 * which is what lets the tests make exact assertions.
 */
export function createRandom(seed: number) {
  let s = seed >>> 0

  function next() {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * next()),
    chance: (p: number) => next() < p,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  }
}

export type Random = ReturnType<typeof createRandom>
