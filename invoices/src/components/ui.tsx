import { useEffect, type ReactNode } from 'react'
import { back } from '../router'

const PATHS: Record<string, ReactNode> = {
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
      <path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.8c1.8.6 3 2.2 3.5 4.7" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 8.5V18a2 2 0 0 0 2 2h12.5a1.5 1.5 0 0 0 1.5-1.5V10a1.5 1.5 0 0 0-1.5-1.5H6A2 2 0 0 1 4 6.5 2 2 0 0 1 6 4.5h10" />
      <path d="M15 14.2h2.5" />
    </>
  ),
  doc: (
    <>
      <path d="M6.5 3.5h7.5l5 5v10.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M14 3.5v5h5M8.5 13h7M8.5 16.5h4.5" />
    </>
  ),
  dots: (
    <>
      <circle cx="6" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="12" cy="6.5" rx="6.5" ry="2.8" />
      <path d="M5.5 6.5v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5M5.5 11.5v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2.2h5.6L16.3 7h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="12.8" r="3.3" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="9" cy="9.2" r="1.6" />
      <path d="M4.5 17l4.5-4.2 3.5 3 3-2.6 4 3.6" />
    </>
  ),
  'file-plus': (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
      <path d="M12 9v6M9 12h6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16M7 16.5v-5M12 16.5V7M17 16.5v-8" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" />
    </>
  ),
  'arrow-back': <path d="M9 5l7 7-7 7" />,
  'arrow-forward': <path d="M15 5l-7 7 7 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  share: (
    <>
      <circle cx="17.5" cy="5.5" r="2.3" />
      <circle cx="6.5" cy="12" r="2.3" />
      <circle cx="17.5" cy="18.5" r="2.3" />
      <path d="m8.5 10.9 7-4.2M8.5 13.1l7 4.2" />
    </>
  ),
  print: (
    <>
      <path d="M7 8V4h10v4M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17" />
      <path d="M7 14h10v6H7z" />
    </>
  ),
  chat: (
    <>
      <path d="M4.5 19.5l1.2-3.6A7.5 7.5 0 1 1 8.6 18.6z" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  phone: <path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7L16 13l4 1.5v3A2 2 0 0 1 18 19.5 15 15 0 0 1 4.5 6 2 2 0 0 1 6.5 4z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  trash: (
    <>
      <path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7" />
    </>
  ),
  edit: <path d="M5 19h3.5L19 8.5 15.5 5 5 15.5zM13.5 7l3.5 3.5" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-2.5-1.6-2 1.6-1.5-1.2-1.5 1.2-2-1.6L6 20.5z" />
      <path d="M9 8.5h6M9 12h6M9 15.5h3" />
    </>
  ),
  download: <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />,
  upload: <path d="M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M5 19.5h14" />,
  'chevron-down': <path d="m7 10 5 5 5-5" />,
  bolt: <path d="M13 3 6 13.5h5L10.5 21 18 10.5h-5z" />,
  logo: (
    <>
      <path d="M6.5 3.5h7.5l5 5v10.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5z" fill="currentColor" stroke="none" />
    </>
  ),
}

export function Icon({ name, size = 22, className = '', strokeWidth = 1.7 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}

/** The app's mark: a folded page with two lines. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="פנקס">
      <path d="M20 10h17l11 11v29a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="var(--color-ink)" />
      <path d="M37 10v11h11z" fill="var(--color-violet)" />
      <rect x="22" y="31" width="18" height="4" rx="2" fill="var(--color-lime)" />
      <rect x="22" y="39" width="11" height="4" rx="2" fill="var(--color-lime)" />
    </svg>
  )
}

export function TopBar({
  title,
  onBack,
  tone = 'plain',
  right,
}: {
  title: string
  onBack?: () => void
  tone?: 'plain' | 'plum'
  right?: ReactNode
}) {
  const plum = tone === 'plum'
  return (
    <header
      className={`no-print sticky top-0 z-20 flex items-center gap-2 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] ${
        plum ? 'bg-plum text-white' : 'bg-mist/90 text-ink backdrop-blur'
      }`}
    >
      <button
        onClick={onBack ?? (() => back())}
        className={`grid h-10 w-10 place-items-center rounded-full ${plum ? 'hover:bg-white/10' : 'hover:bg-ink/5'}`}
        aria-label="חזרה"
      >
        <Icon name="arrow-back" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h1>
      {right}
    </header>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button className="animate-fade absolute inset-0 bg-ink/35" onClick={onClose} aria-label="סגירה" />
      <div className="animate-sheet relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-3 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
        {title && <h2 className="mb-4 text-xl font-bold text-ink">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export const inputCls =
  'w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-violet focus:ring-4 focus:ring-violet/15'

export function Field({ label, children, hint, className = '' }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </label>
  )
}

export function NumberInput({
  value,
  onChange,
  className = '',
  placeholder,
  ...rest
}: {
  value: number
  onChange: (n: number) => void
  className?: string
  placeholder?: string
  'aria-label'?: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      dir="ltr"
      value={Number.isFinite(value) && value !== 0 ? value : ''}
      placeholder={placeholder ?? '0'}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      className={`${inputCls} text-right ${className}`}
      {...rest}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,27,61,0.04)] ${className}`}>{children}</section>
}

export function Radio({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: ReactNode }) {
  return (
    <button type="button" onClick={onChange} className="flex items-center gap-3 py-2 text-right text-base text-ink" role="radio" aria-checked={checked}>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${checked ? 'border-ink' : 'border-ink/40'}`}>
        {checked && <span className="h-3 w-3 rounded-full bg-ink" />}
      </span>
      {label}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  fill = false,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  fill?: boolean
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg py-2.5 text-sm font-medium transition ${fill ? 'flex-1 px-1.5' : 'shrink-0 px-4'} ${
            value === o.value ? 'bg-ink text-white' : 'bg-mist text-ink hover:bg-line'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'lime'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const styles = {
    primary: 'bg-ink text-white hover:bg-ink/90',
    secondary: 'bg-white text-ink ring-1 ring-line hover:bg-mist',
    ghost: 'text-ink hover:bg-ink/5',
    danger: 'bg-white text-orange ring-1 ring-orange/30 hover:bg-peach/50',
    lime: 'bg-lime text-ink hover:brightness-95',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold transition disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function ActionTile({ icon, label, tone, onClick }: { icon: string; label: string; tone: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 text-center">
      <span className={`grid h-16 w-16 place-items-center rounded-2xl ${tone} transition active:scale-95`}>
        <Icon name={icon} size={26} />
      </span>
      <span className="text-sm leading-tight text-ink">{label}</span>
    </button>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-lavender text-ink">
        <Icon name={icon} size={28} />
      </span>
      <p className="text-lg font-semibold text-ink">{title}</p>
      {text && <p className="max-w-xs text-sm text-ink-soft">{text}</p>}
      {action}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 py-1 text-right" role="switch" aria-checked={checked}>
      <span className="text-base text-ink">{label}</span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-mint' : 'bg-line'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'right-6' : 'right-1'}`} />
      </span>
    </button>
  )
}
