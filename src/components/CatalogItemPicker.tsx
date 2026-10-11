import { useState } from 'react'
import type { CatalogItem } from '../types'

interface Props {
  catalog: CatalogItem[]
  value: string
  placeholder?: string
  onPick: (item: CatalogItem) => void
  onChangeText: (text: string) => void
  className?: string
}

// A free-text input that also offers autocomplete against the saved catalog
// (by SKU or name). Picking a match fills the line's price from the catalog's
// current price; typing a name with no match just keeps the typed text, so
// ad-hoc items that aren't in the catalog still work.
export function CatalogItemPicker({ catalog, value, placeholder, onPick, onChangeText, className }: Props) {
  const [open, setOpen] = useState(false)

  const q = value.trim().toLowerCase()
  const matches = q ? catalog.filter((c) => c.sku.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) : catalog

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChangeText(e.target.value)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={className}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full min-w-[200px] overflow-y-auto rounded-lg border border-white/10 bg-[#1a1b20] shadow-lg">
          {matches.slice(0, 8).map((item) => (
            <button
              key={item.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(item)
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
