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
      { id: crypto.randomUUID(), date: today(), quantity: 1, pricePerUnit: 0, returnedQuantity: 0, returnReason: null },
    ])
  }

  function setReturnReason(sale: Sale, reason: ReturnReason | null) {
    if (reason === null) {
      updateSale(sale.id, { returnedQuantity: 0, returnReason: null })
    } else {
      updateSale(sale.id, { returnReason: reason, returnedQuantity: sale.returnedQuantity || sale.quantity })
    }
  }

  function setReturnedQuantity(sale: Sale, quantity: number) {
    const clamped = Math.max(0, Math.min(quantity, sale.quantity))
    updateSale(sale.id, {
      returnedQuantity: clamped,
      returnReason: clamped === 0 ? null : (sale.returnReason ?? 'damaged'),
    })
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
            className={`flex flex-col gap-2 rounded-lg p-2 ${sale.returnedQuantity > 0 ? 'bg-rose-500/5' : ''}`}
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
              <span className="text-slate-500">זיכוי/החזרה:</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="כמות מוחזרת"
                value={sale.returnedQuantity === 0 ? '' : sale.returnedQuantity}
                onChange={(e) => setReturnedQuantity(sale, Number(e.target.value) || 0)}
                className="w-20 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
              />
              <span className="text-slate-500">מתוך {sale.quantity}</span>
              <button
                onClick={() => setReturnReason(sale, 'restocked')}
                disabled={sale.returnedQuantity === 0}
                className={`rounded-full border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 ${
                  sale.returnReason === 'restocked'
                    ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300'
                    : 'border-white/10 text-slate-500 hover:bg-emerald-500/10'
                }`}
              >
                חזרה למלאי
              </button>
              <button
                onClick={() => setReturnReason(sale, 'damaged')}
                disabled={sale.returnedQuantity === 0}
                className={`rounded-full border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 ${
                  sale.returnReason === 'damaged'
                    ? 'border-rose-800 bg-rose-950/30 text-rose-300'
                    : 'border-white/10 text-slate-500 hover:bg-rose-500/10'
                }`}
              >
                בלאי
              </button>
              {sale.returnedQuantity > 0 && (
                <button onClick={() => setReturnReason(sale, null)} className="text-slate-500 hover:text-slate-300">
                  בטל החזרה
                </button>
              )}
              {sale.returnedQuantity > 0 && (
                <span className="w-full text-slate-500">
                  {sale.returnReason === 'restocked'
                    ? `${sale.returnedQuantity} יח' חזרו למלאי וזוכו, ${sale.quantity - sale.returnedQuantity} נשארו כמכירה. הרכישה המקורית נשמרה בהיסטוריה.`
                    : `${sale.returnedQuantity} יח' זוכו כבלאי (לא חוזרות למלאי), ${sale.quantity - sale.returnedQuantity} נשארו כמכירה. הרכישה המקורית נשמרה בהיסטוריה.`}
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
