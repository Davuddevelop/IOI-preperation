/** Shield (guardian) with bull's horns (Minotaur) and an M, drawn as a single-colour line mark. */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 6.5 24.5 9.5v6.5c0 5.2-3.6 9-8.5 10.8C11.1 25 7.5 21.2 7.5 16V9.5z" />
        <path d="M7.5 9.5C5 8.6 3.2 6.6 3 3.5 M24.5 9.5C27 8.6 28.8 6.6 29 3.5" />
        <path d="M11.5 20v-6.5l4.5 4.5 4.5-4.5V20" />
      </g>
    </svg>
  )
}
