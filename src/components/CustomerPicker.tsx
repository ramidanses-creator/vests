import { useState } from 'react'
import type { Customer } from '../types'

interface Props {
  customers: Customer[]
  selectedId: string | null
  onSelect: (customerId: string | null) => void
  onCreateCustomer: (customer: Customer) => void
}

export function CustomerPicker({ customers, selectedId, onSelect, onCreateCustomer }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selected = customers.find((c) => c.id === selectedId) ?? null
  const q = query.trim().toLowerCase()
  const matches = q
    ? customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q))
    : customers

  function createAndSelect() {
    const name = query.trim()
    if (!name) return
    const customer: Customer = {
      id: crypto.randomUUID(),
      name,
      phone: '',
      email: '',
      address: '',
      notes: '',
      createdAt: new Date().toISOString(),
    }
    onCreateCustomer(customer)
    onSelect(customer.id)
    setQuery('')
    setOpen(false)
  }

  if (selected && !open) {
    return (
      <div className="flex items-center gap-2 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100">
        <span className="flex-1 truncate">
          👤 {selected.name}
          {selected.phone && <span className="text-xs text-slate-500"> · {selected.phone}</span>}
        </span>
        <button onClick={() => setOpen(true)} className="text-xs text-teal-300 hover:text-teal-200">
          החלפה
        </button>
        <button onClick={() => onSelect(null)} className="text-xs text-slate-500 hover:text-rose-400">
          הסרה
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="חיפוש לקוח לפי שם/טלפון, או הקלדת שם חדש"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-48 w-full min-w-[220px] overflow-y-auto rounded-lg border border-white/10 bg-[#1a1b20] shadow-lg">
          {matches.slice(0, 8).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onSelect(c.id)
                setQuery('')
                setOpen(false)
              }}
              className="flex w-full flex-col items-start px-3 py-2 text-right text-sm text-slate-200 hover:bg-white/5"
            >
              <span>{c.name}</span>
              {c.phone && <span className="text-xs text-slate-500">{c.phone}</span>}
            </button>
          ))}
          {matches.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">לא נמצא לקוח תואם.</p>}
          {query.trim() && (
            <button
              onClick={createAndSelect}
              className="w-full border-t border-white/10 px-3 py-2 text-right text-sm text-teal-300 hover:bg-teal-500/10"
            >
              + הוספת לקוח חדש: "{query.trim()}"
            </button>
          )}
          <button onClick={() => setOpen(false)} className="w-full border-t border-white/10 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300">
            סגירה
          </button>
        </div>
      )}
    </div>
  )
}
