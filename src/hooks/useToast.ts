import { useCallback, useState } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  kind: ToastKind
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, message, kind }])
      setTimeout(() => dismiss(id), 3000)
    },
    [dismiss],
  )

  return { toasts, showToast, dismiss }
}
