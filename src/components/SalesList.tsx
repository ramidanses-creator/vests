import type { Sale } from '../types'

interface Props {
  sales: Sale[]
  onChange: (sales: Sale[]) => void
  disabled?: boolean
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function SalesList({ sales, onChange, disabled }: Props) {
  function updateSale(id: string, patch: Partial<Sale>) {
    onChange(sales.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function addSale() {
    onChange([...sales, { id: crypto.randomUUID(), date: today(), quantity: 1, pricePerUnit: 0 }])
  }

  function removeSale(id: string) {
    onChange(sales.filter((s) => s.id !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">מכירות</h3>
        <button
          onClick={addSale}
          disabled={disabled}
          className="rounded-full border border-dashed border-slate-400 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-40"
        >
          + מכירה
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {sales.map((sale) => (
          <div key={sale.id} className="flex items-center gap-2">
            <input
              type="date"
              value={sale.date}
              disabled={disabled}
              onChange={(e) => updateSale(sale.id, { date: e.target.value })}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
            />
            <input
              type="number"
              placeholder="כמות"
              min={1}
              value={sale.quantity === 0 ? '' : sale.quantity}
              disabled={disabled}
              onChange={(e) => updateSale(sale.id, { quantity: Number(e.target.value) || 0 })}
              className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
            />
            <input
              type="number"
              placeholder="מחיר ליחידה"
              value={sale.pricePerUnit === 0 ? '' : sale.pricePerUnit}
              disabled={disabled}
              onChange={(e) => updateSale(sale.id, { pricePerUnit: Number(e.target.value) || 0 })}
              className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
            />
            <button
              onClick={() => removeSale(sale.id)}
              disabled={disabled}
              className="rounded border border-slate-200 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40"
            >
              מחק
            </button>
          </div>
        ))}
        {sales.length === 0 && <p className="text-xs text-slate-400">אין מכירות עדיין.</p>}
      </div>
    </div>
  )
}
