/** Inline stroke icons on a 24×24 grid; they inherit colour from the surrounding text. */
const PATHS = {
  overview: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  robot: 'M3.5 13.5h17a3 3 0 0 1 0 6h-17a3 3 0 0 1 0-6z M6 13.5V10h8l3 3.5 M7 16.5h.01 M12 16.5h.01 M17 16.5h.01',
  drone:
    'M9.5 9.5h5v5h-5z M9.5 9.5 6.5 6.5 M14.5 9.5l3-3 M9.5 14.5l-3 3 M14.5 14.5l3 3 M3 6.5a3.5 1.5 0 1 0 7 0a3.5 1.5 0 1 0-7 0 M14 6.5a3.5 1.5 0 1 0 7 0a3.5 1.5 0 1 0-7 0 M3 17.5a3.5 1.5 0 1 0 7 0a3.5 1.5 0 1 0-7 0 M14 17.5a3.5 1.5 0 1 0 7 0a3.5 1.5 0 1 0-7 0',
  radar: 'M12 3a9 9 0 1 0 9 9 M12 7a5 5 0 1 0 5 5 M12 12l6.5-6.5 M12 12h.01',
  territories: 'M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z M9 4v13.5 M15 6.5V20',
  alert: 'M12 3.5 21.5 20h-19z M12 10v4.5 M12 17.2h.01',
  battery: 'M3 7.5h15a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5V9A1.5 1.5 0 0 1 3 7.5z M22.5 10.5v3',
  signal: 'M4 20v-3 M9 20v-7 M14 20V9 M19 20V5',
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M8 5v14 M16 5v14',
  reset: 'M3.5 12a8.5 8.5 0 1 0 2.5-6 M3.5 4v5h5',
  crosshair: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16 M12 2v5 M12 17v5 M2 12h5 M17 12h5',
  metal: 'M12 3l8 9-8 9-8-9z M12 8.5 15 12l-3 3.5L9 12z',
  check: 'M5 12.5l4.5 4.5L19 7',
  chevron: 'M9 6l6 6-6 6',
  launch: 'M12 15V3.5 M7.5 8 12 3.5 16.5 8 M4 14.5V20h16v-5.5',
  land: 'M12 3.5V15 M7.5 10.5 12 15l4.5-4.5 M4 14.5V20h16v-5.5',
  hold: 'M7 7h10v10H7z',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  bay: 'M3 12h18v7H3z M3 12l4-6h10l4 6 M9 15.5h6',
  link: 'M5 12.5a7 7 0 0 1 14 0 M8.5 12.5a3.5 3.5 0 0 1 7 0 M12 12.5v6',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
