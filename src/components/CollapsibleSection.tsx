import { useState, type ReactNode } from 'react'

interface Props {
  title: string
  icon?: string
  defaultOpen?: boolean
  accent?: 'teal' | 'amber' | 'violet' | 'rose' | 'sky'
  children: ReactNode
}

const ACCENT_BORDER: Record<NonNullable<Props['accent']>, string> = {
  teal: 'border-teal-500',
  amber: 'border-amber-400',
  violet: 'border-violet-500',
  rose: 'border-rose-500',
  sky: 'border-sky-400',
}

export function CollapsibleSection({ title, icon, defaultOpen = false, accent = 'teal', children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`rounded-xl border border-white/10 border-r-2 bg-[#1a1b20] ${ACCENT_BORDER[accent]}`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-4 text-right">
        <span className="text-sm font-semibold text-slate-100">
          {icon ? `${icon} ` : ''}
          {title}
        </span>
        <span className="text-slate-500">{open ? '︿' : '﹀'}</span>
      </button>
      {open && <div className="border-t border-white/10 p-4 pt-4">{children}</div>}
    </div>
  )
}
