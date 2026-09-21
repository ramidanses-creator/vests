import type { ReturnReason, Sale } from '../types'

interface Props {
  sales: Sale[]
  onChange: (sales: Sale[]) => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function SalesList({ sales, onChange }: Props) {
  function updateSale(id: string, patch: Partial<Sale>) {
    onChange(sales.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function addSale() {
    onChange([
      ...sales,
      { id: crypto.randomUUID(), date: today(), quantity: 1, pricePerUnit: 0, returned: false, returnReason: null },
    ])
  }

  function setReturn(id: string, reason: ReturnReason | null) {
    updateSale(id, reason === null ? { returned: false, returnReason: null } : { returned: true, returnReason: reason })
  }

  function removeSale(id: string) {
    onChange(sales.filter((s) => s.id !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">מכירות</h3>
        <button
          onClick={addSale}
          className="rounded-full border border-dashed border-amber-500/40 px-3 py-1 text-xs text-amber-300 hover:bg-amber-500/10"
        >
          + מכירה
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {sales.map((sale) => (
          <div
            key={sale.id}
            className={`flex flex-col gap-2 rounded-lg p-2 ${sale.returned ? 'bg-rose-500/5' : ''}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={sale.date}
                onChange={(e) => updateSale(sale.id, { date: e.target.value })}
                className="rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="כמות"
                value={sale.quantity === 0 ? '' : sale.quantity}
                onChange={(e) => updateSale(sale.id, { quantity: Number(e.target.value) || 0 })}
                className="w-20 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="מחיר ליחידה"
                value={sale.pricePerUnit === 0 ? '' : sale.pricePerUnit}
                onChange={(e) => updateSale(sale.id, { pricePerUnit: Number(e.target.value) || 0 })}
                className="w-28 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
              />
              <button
                onClick={() => removeSale(sale.id)}
                className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
              >
                מחק
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">החזרה:</span>
              <button
                onClick={() => setReturn(sale.id, null)}
                className={`rounded-full border px-2 py-1 ${
                  !sale.returned
                    ? 'border-white/10 bg-white/5 text-slate-300'
                    : 'border-white/10 text-slate-500 hover:bg-white/5'
                }`}
              >
                לא הוחזר
              </button>
              <button
                onClick={() => setReturn(sale.id, 'restocked')}
                className={`rounded-full border px-2 py-1 ${
                  sale.returned && sale.returnReason === 'restocked'
                    ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300'
                    : 'border-white/10 text-slate-500 hover:bg-emerald-500/10'
                }`}
              >
                זיכוי + חזרה למלאי
              </button>
              <button
                onClick={() => setReturn(sale.id, 'damaged')}
                className={`rounded-full border px-2 py-1 ${
                  sale.returned && sale.returnReason === 'damaged'
                    ? 'border-rose-800 bg-rose-950/30 text-rose-300'
                    : 'border-white/10 text-slate-500 hover:bg-rose-500/10'
                }`}
              >
                זיכוי בלאי
              </button>
              {sale.returned && (
                <span className="text-slate-500">
                  {sale.returnReason === 'restocked' ? 'הכמות חזרה למלאי, הרכישה נשמרה בהיסטוריה.' : 'הכמות לא חוזרת למלאי (בלאי), הרכישה נשמרה בהיסטוריה.'}
                </span>
              )}
            </div>
          </div>
        ))}
        {sales.length === 0 && <p className="text-xs text-slate-500">אין מכירות עדיין.</p>}
      </div>
    </div>
  )
}
