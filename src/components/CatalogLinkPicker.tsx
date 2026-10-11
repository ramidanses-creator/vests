import { useState } from 'react'
import type { CatalogItem } from '../types'

interface Props {
  catalog: CatalogItem[]
  selectedId: string | null
  onSelect: (catalogItemId: string | null) => void
}

// Links an existing product (an order batch already in inventory) to a
// catalog SKU for reference/reporting — selecting one never touches the
// product's own price or quantities, it's purely an association.
export function CatalogLinkPicker({ catalog, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selected = catalog.find((c) => c.id === selectedId) ?? null
  const q = query.trim().toLowerCase()
  const matches = q ? catalog.filter((c) => c.sku.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) : catalog

  if (selected && !open) {
    return (
      <div className="flex items-center gap-2 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100">
        <span className="flex-1 truncate">
          🏷️ {selected.name} <span className="font-mono text-xs text-slate-500">{selected.sku}</span>
        </span>
        <button onClick={() => setOpen(true)} className="text-xs text-teal-300 hover:text-teal-200">
          החלפה
        </button>
        <button onClick={() => onSelect(null)} className="text-xs text-slate-500 hover:text-rose-400">
          ביטול שיוך
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={catalog.length === 0 ? 'אין עדיין מק״טים בקטלוג' : 'חיפוש מק״ט לשיוך'}
        value={query}
        disabled={catalog.length === 0}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100 disabled:opacity-50"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full min-w-[200px] overflow-y-auto rounded-lg border border-white/10 bg-[#1a1b20] shadow-lg">
          {matches.slice(0, 8).map((item) => (
            <button
              key={item.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(item.id)
                setQuery('')
                setOpen(false)
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-right text-sm text-slate-200 hover:bg-white/5"
            >
              <span>{item.name}</span>
              <span className="font-mono text-[10px] text-slate-500">{item.sku}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
