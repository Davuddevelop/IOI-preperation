import { Children, useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { Icon, type IconName } from './Icon'
import styles from './ui.module.css'

/**
 * The four signal roles from tokens.css. A component sets data-tone and its
 * CSS reads var(--tone). Normal state is 'neutral' — most things should be.
 */
export type Tone = 'neutral' | 'friendly' | 'warn' | 'danger'

/**
 * Every signal colour comes with a shape, borrowed from military map
 * symbology: circle = ours, triangle = caution, diamond = danger. The
 * pairing keeps meaning intact for colour-blind operators and in grayscale.
 */
export function Glyph({ tone }: { tone: Tone }) {
  if (tone === 'neutral') return null
  return <span className={styles.glyph} data-tone={tone} aria-hidden="true" />
}

interface PanelProps {
  title: string
  /** Quiet text beside the title. */
  tag?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** No padding inside, for edge-to-edge content like maps and video. */
  flush?: boolean
}

export function Panel({ title, tag, actions, children, className, bodyClassName, flush }: PanelProps) {
  const id = useId()
  return (
    <section className={cx(styles.panel, className)} aria-labelledby={id}>
      <header className={styles.panelHeader}>
        <h2 id={id} className={styles.panelTitle}>
          {title}
        </h2>
        {tag && <span className={styles.panelTag}>{tag}</span>}
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
  /** Leave unset for normal values; colour is for values that need attention. */
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
        {tone && <Glyph tone={tone} />}
        {value}
        {unit && <span className={styles.statUnit}>{unit}</span>}
      </span>
      {hint && <span className={styles.statHint}>{hint}</span>}
    </div>
  )
}

/**
 * Stats laid out as a hairline table. The rules between cells are 1px gaps
 * over a line-coloured background, so there are no boxes inside boxes.
 * Two columns, or four once the container is wide enough; keep the number of
 * children even so no cell is left empty.
 */
export function StatGrid({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 }) {
  return (
    // The wrapper is the size container: a container query cannot react to the element it styles.
    <div className={styles.statGridWrap}>
      <div className={styles.statGrid} data-columns={columns}>
        {Children.map(children, (child) => child && <div className={styles.statCell}>{child}</div>)}
      </div>
    </div>
  )
}

interface MeterProps {
  /** 0–100. */
  value: number
  label: string
  /** Below this the bar turns amber. */
  warnBelow?: number
  /** Below this the bar turns red. */
  dangerBelow?: number
  /** Force a tone instead of deriving it from the thresholds. */
  tone?: Tone
}

/**
 * A level bar in the style of a control-room analog indicator: gray while the
 * value is in its normal range, with tick marks showing where the warning and
 * danger bands begin, so the operator sees how close a value is to trouble.
 */
export function Meter({ value, label, warnBelow, dangerBelow, tone }: MeterProps) {
  const derived: Tone =
    dangerBelow !== undefined && value < dangerBelow
      ? 'danger'
      : warnBelow !== undefined && value < warnBelow
        ? 'warn'
        : 'neutral'
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={styles.meter}
      data-tone={tone ?? derived}
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={styles.meterFill} style={{ width: `${clamped}%` }} />
      {[warnBelow, dangerBelow].map(
        (t) => t !== undefined && <span key={t} className={styles.meterTick} style={{ left: `${t}%` }} />,
      )}
    </div>
  )
}

/** A short status word with its signal glyph. `blink` is for unacknowledged alarms only. */
export function Badge({ tone = 'neutral', blink, children }: { tone?: Tone; blink?: boolean; children: ReactNode }) {
  return (
    <span className={cx(styles.badge, blink && styles.blink)} data-tone={tone}>
      <Glyph tone={tone} />
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
    <button type="button" className={cx(styles.button, styles[variant], block && styles.block, className)} {...rest}>
      {icon && <Icon name={icon} size={16} />}
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
