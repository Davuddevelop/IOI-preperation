import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { Icon, type IconName } from './Icon'
import styles from './ui.module.css'

/** Colour roles from tokens.css; a component sets data-tone and its CSS reads --tone. */
export type Tone = 'accent' | 'drone' | 'metal' | 'warn' | 'danger' | 'neutral'

interface PanelProps {
  title: string
  icon?: IconName
  /** Small element beside the title, such as a badge. */
  tag?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** No padding inside, for edge-to-edge content like maps and video. */
  flush?: boolean
}

export function Panel({ title, icon, tag, actions, children, className, bodyClassName, flush }: PanelProps) {
  const id = useId()
  return (
    <section className={cx(styles.panel, className)} aria-labelledby={id}>
      <header className={styles.panelHeader}>
        {icon && <Icon name={icon} size={16} className={styles.panelIcon} />}
        <h2 id={id} className={styles.panelTitle}>
          {title}
        </h2>
        {tag}
        {actions && <div className={styles.panelActions}>{actions}</div>}
      </header>
      <div className={cx(styles.panelBody, flush && styles.flush, bodyClassName)}>{children}</div>
    </section>
  )
}

interface StatProps {
  label: string
  value: ReactNode
  unit?: string
  tone?: Tone
  hint?: ReactNode
}

const NUMERIC = /^[\d.,%+−-]+$/

export function Stat({ label, value, unit, tone, hint }: StatProps) {
  // Numbers use the monospaced font so live values do not jitter; words read better in the normal font.
  const numeric = typeof value === 'number' || (typeof value === 'string' && NUMERIC.test(value))
  return (
    <div className={styles.stat} data-tone={tone}>
      <span className="label">{label}</span>
      <span className={cx(numeric && 'mono', styles.statValue)}>
        {value}
        {unit && <span className={styles.statUnit}>{unit}</span>}
      </span>
      {hint && <span className={styles.statHint}>{hint}</span>}
    </div>
  )
}

/** Horizontal level bar. Picks its colour from the value unless a tone is given. */
export function Meter({ value, label, tone }: { value: number; label: string; tone?: Tone }) {
  const auto: Tone = value < 15 ? 'danger' : value < 30 ? 'warn' : 'accent'
  return (
    <div
      className={styles.meter}
      data-tone={tone ?? auto}
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={styles.meterFill} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Badge({ tone = 'neutral', pulse, children }: { tone?: Tone; pulse?: boolean; children: ReactNode }) {
  return (
    <span className={cx(styles.badge, pulse && styles.pulse)} data-tone={tone}>
      {children}
    </span>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost' | 'default'
  icon?: IconName
  block?: boolean
}

export function Button({ variant = 'default', icon, block, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(styles.button, styles[variant], block && styles.block, className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
}

interface SegmentedProps<T extends string> {
  label: string
  size?: 'md' | 'sm'
  value: T
  options: { value: T; label: string; disabled?: boolean }[]
  onChange: (value: T) => void
}

export function Segmented<T extends string>({ label, size = 'md', value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className={cx(styles.segmented, size === 'sm' && styles.small)} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className={styles.empty}>{children}</p>
}
