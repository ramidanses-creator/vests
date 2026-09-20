import type { DeletedProduct } from '../types'

interface Props {
  deleted: DeletedProduct[]
  onRestore: (id: string) => void
  onPurge: (id: string) => void
}

export function DeletedProducts({ deleted, onRestore, onPurge }: Props) {
  if (deleted.length === 0) {
    return <p className="text-xs text-slate-500">אין מוצרים מחוקים.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {deleted.map(({ product, deletedAt }) => (
        <div
          key={product.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-800/60 px-3 py-2 text-sm"
        >
          <div className="flex flex-col">
            <span className="font-medium text-slate-200">{product.name || 'מוצר ללא שם'}</span>
            <span className="text-xs text-slate-500">נמחק ב-{new Date(deletedAt).toLocaleString('he-IL')}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onRestore(product.id)}
              className="rounded border border-emerald-800 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-950/50"
            >
              שחזר
            </button>
            <button
              onClick={() => onPurge(product.id)}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40"
            >
              מחק לצמיתות
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
