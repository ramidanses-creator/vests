import { useState } from 'react'
import type { Product } from '../types'
import { amountInIls, calculateProductTotals, formatCurrency } from '../utils/calculations'

interface Props {
  products: Product[]
  usdToIlsRate: number | null
}

export function SummaryPanel({ products, usdToIlsRate }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const rows = products
    .map((product) => ({ product, totals: calculateProductTotals(product, usdToIlsRate) }))
    .sort((a, b) => b.totals.totalCost - a.totals.totalCost)

  const totalCost = rows.reduce((sum, r) => sum + r.totals.totalCost, 0)
  const totalRevenue = rows.reduce((sum, r) => sum + r.totals.totalRevenue, 0)
  const totalProfit = rows.reduce((sum, r) => sum + r.totals.totalProfit, 0)
  const costRows = rows.filter((r) => r.totals.totalCost > 0)

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <div className="border-b border-white/10 bg-[#17181d] px-4 pb-2 pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">סיכום כללי</h2>
      </div>
      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-white/10 bg-[#1a1b20] text-sm">
        <button
          onClick={() => setShowBreakdown((v) => !v)}
          className="flex flex-col items-start gap-1 p-4 text-right hover:bg-white/[0.03]"
        >
          <span className="flex items-center gap-1 text-xs text-amber-300">
            סה״כ הוצאות <span className="text-slate-500">{showBreakdown ? '︿' : '﹀'}</span>
          </span>
          <span className="text-lg font-bold text-slate-100">{formatCurrency(totalCost)}</span>
        </button>
        <div className="flex flex-col gap-1 p-4">
          <span className="text-xs text-sky-300">סה״כ הכנסות</span>
          <span className="text-lg font-bold text-slate-100">{formatCurrency(totalRevenue)}</span>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <span className={`text-xs ${totalProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>סה״כ רווח</span>
          <span className={`text-lg font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(totalProfit)}
          </span>
        </div>
      </div>

      {showBreakdown && (
        <div className="animate-[grow_150ms_ease-out] origin-top border-t border-white/10 bg-[#15161b] p-3">
          {costRows.length === 0 ? (
            <p className="p-2 text-center text-xs text-slate-500">אין עדיין הוצאות רשומות.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {costRows.map(({ product, totals }) => (
                <div key={product.id} className="rounded-lg bg-white/[0.02] p-2.5 text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-slate-200">{product.name || 'מוצר ללא שם'}</span>
                    <span className="font-semibold text-amber-300">{formatCurrency(totals.totalCost)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 pr-2 text-slate-400">
                    {totals.purchaseTotal > 0 && (
                      <div className="flex items-center justify-between">
                        <span>רכישה ({totals.quantityImported} יח׳)</span>
                        <span>{formatCurrency(totals.purchaseTotal)}</span>
                      </div>
                    )}
                    {product.expenses
                      .filter((e) => e.amount > 0)
                      .map((e) => (
                        <div key={e.id} className="flex items-center justify-between">
                          <span>{e.label || 'הוצאה'}</span>
                          <span>{formatCurrency(amountInIls(e.amount, e.currency, usdToIlsRate))}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
