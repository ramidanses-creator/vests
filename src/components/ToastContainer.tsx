import type { ToastItem } from '../hooks/useToast'

interface Props {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

const KIND_STYLES: Record<ToastItem['kind'], string> = {
  success: 'border-teal-500/40 bg-teal-950/90 text-teal-100',
  error: 'border-rose-500/40 bg-rose-950/90 text-rose-100',
  info: 'border-white/20 bg-[#1a1b20]/95 text-slate-100',
}

export function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`animate-[grow_150ms_ease-out] pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-2.5 text-center text-sm font-medium shadow-lg backdrop-blur ${KIND_STYLES[t.kind]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
