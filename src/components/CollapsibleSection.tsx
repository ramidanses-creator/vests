import { useState, type ReactNode } from 'react'

interface Props {
  title: string
  icon?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function CollapsibleSection({ title, icon, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-4 text-right">
        <span className="text-sm font-semibold text-slate-200">
          {icon ? `${icon} ` : ''}
          {title}
        </span>
        <span className="text-slate-500">{open ? '︿' : '﹀'}</span>
      </button>
      {open && <div className="border-t border-slate-800 p-4 pt-4">{children}</div>}
    </div>
  )
}
