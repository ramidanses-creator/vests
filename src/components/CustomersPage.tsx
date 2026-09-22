import { useMemo, useState } from 'react'
import type { Customer, Product } from '../types'
import { formatCurrency, saleNetRevenue } from '../utils/calculations'

interface Props {
  customers: Customer[]
  products: Product[]
  onAdd: (customer: Customer) => void
  onUpdate: (customer: Customer) => void
  onRemove: (id: string) => void
}

interface PurchaseRow {
  productName: string
  date: string
  quantity: number
  total: number
  invoiceNumber: string
}

function emptyDraft(): Customer {
  return {
    id: crypto.randomUUID(),
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    createdAt: new Date().toISOString(),
  }
}

export function CustomersPage({ customers, products, onAdd, onUpdate, onRemove }: Props) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      q
        ? customers.filter(
            (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q),
          )
        : customers,
    [customers, q],
  )
  const sortedCustomers = useMemo(() => [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'he')), [filtered])

  const selectedCustomer = customers.find((c) => c.id === selectedId) ?? null

  const purchaseHistory: PurchaseRow[] = useMemo(() => {
    if (!selectedCustomer) return []
    const rows: PurchaseRow[] = []
    products.forEach((product) => {
      product.sales
        .filter((s) => s.customerId === selectedCustomer.id)
        .forEach((s) => {
          rows.push({
            productName: product.name || 'מוצר ללא שם',
            date: s.date,
            quantity: s.quantity - s.returnedQuantity,
            total: saleNetRevenue(s),
            invoiceNumber: s.invoiceNumber,
          })
        })
    })
    return rows.sort((a, b) => b.date.localeCompare(a.date))
  }, [selectedCustomer, products])

  const totalSpent = purchaseHistory.reduce((sum, r) => sum + r.total, 0)

  function startNew() {
    setEditing(emptyDraft())
    setSelectedId(null)
  }

  function startEdit(customer: Customer) {
    setEditing({ ...customer })
    setSelectedId(null)
  }

  function saveEdit() {
    if (!editing || editing.name.trim() === '') return
    const isNew = !customers.some((c) => c.id === editing.id)
    if (isNew) onAdd(editing)
    else onUpdate(editing)
    setSelectedId(editing.id)
    setEditing(null)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#1a1b20] p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            {customers.some((c) => c.id === editing.id) ? 'עריכת לקוח' : 'לקוח חדש'}
          </h3>
          <button onClick={() => setEditing(null)} className="text-xs text-slate-500 hover:text-slate-300">
            ביטול
          </button>
        </div>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          שם *
          <input
            type="text"
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          טלפון
          <input
            type="text"
            value={editing.phone}
            onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
            className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          אימייל
          <input
            type="email"
            value={editing.email}
            onChange={(e) => setEditing({ ...editing, email: e.target.value })}
            className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          כתובת למשלוח
          <input
            type="text"
            value={editing.address}
            onChange={(e) => setEditing({ ...editing, address: e.target.value })}
            className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          הערות
          <textarea
            value={editing.notes}
            onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
            rows={3}
            className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <button
          onClick={saveEdit}
          disabled={editing.name.trim() === ''}
          className="rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
        >
          שמירה
        </button>
      </div>
    )
  }

  if (selectedCustomer) {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={() => setSelectedId(null)} className="self-start text-xs text-teal-300 hover:text-teal-200">
          ← חזרה לרשימת לקוחות
        </button>
        <div className="rounded-xl border border-white/10 bg-[#1a1b20] p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">{selectedCustomer.name}</h3>
            <div className="flex gap-2">
              <button onClick={() => startEdit(selectedCustomer)} className="text-xs text-teal-300 hover:text-teal-200">
                עריכה
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`למחוק את הלקוח "${selectedCustomer.name}"?`)) {
                    onRemove(selectedCustomer.id)
                    setSelectedId(null)
                  }
                }}
                className="text-xs text-slate-500 hover:text-rose-400"
              >
                מחיקה
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm text-slate-300">
            {selectedCustomer.phone && <p>📞 {selectedCustomer.phone}</p>}
            {selectedCustomer.email && <p>✉️ {selectedCustomer.email}</p>}
            {selectedCustomer.address && <p>📍 {selectedCustomer.address}</p>}
            {selectedCustomer.notes && <p className="text-slate-400">{selectedCustomer.notes}</p>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#1a1b20] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">היסטוריית רכישות</h3>
            <span className="text-sm font-semibold text-emerald-400">סה״כ: {formatCurrency(totalSpent)}</span>
          </div>
          {purchaseHistory.length === 0 ? (
            <p className="text-xs text-slate-500">הלקוח הזה עדיין לא ביצע רכישות.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {purchaseHistory.map((row, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                  <div className="flex flex-col">
                    <span className="text-slate-200">{row.productName}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(row.date).toLocaleDateString('he-IL')} · {row.quantity} יח׳
                      {row.invoiceNumber && ` · #${row.invoiceNumber}`}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-200">{formatCurrency(row.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לקוח לפי שם, טלפון או אימייל"
          className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
        />
        <button
          onClick={startNew}
          className="whitespace-nowrap rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
        >
          + לקוח חדש
        </button>
      </div>

      {sortedCustomers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
          {query.trim() ? 'לא נמצאו לקוחות תואמים.' : 'אין עדיין לקוחות רשומים.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedCustomers.map((c) => {
            const purchaseCount = products.reduce(
              (sum, p) => sum + p.sales.filter((s) => s.customerId === c.id).length,
              0,
            )
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-right hover:bg-white/5"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-100">{c.name}</span>
                  <span className="text-xs text-slate-500">{c.phone || c.email || 'אין פרטי קשר'}</span>
                </div>
                {purchaseCount > 0 && (
                  <span className="rounded-md bg-teal-500/15 px-2 py-0.5 text-[11px] font-medium text-teal-300">
                    {purchaseCount} רכישות
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
