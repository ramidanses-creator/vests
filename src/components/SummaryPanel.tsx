import type { Product } from '../types'
import { calculateProductTotals, formatCurrency } from '../utils/calculations'

interface Props {
  products: Product[]
  usdToIlsRate: number | null
}

export function SummaryPanel({ products, usdToIlsRate }: Props) {
  const totals = products.map((p) => calculateProductTotals(p, usdToIlsRate))
  const totalCost = totals.reduce((sum, t) => sum + t.totalCost, 0)
  const totalRevenue = totals.reduce((sum, t) => sum + t.totalRevenue, 0)
  const totalProfit = totals.reduce((sum, t) => sum + t.totalProfit, 0)

  return (
    <div className="overflow-hidden rounded-2xl shadow-lg shadow-black/20">
      <div className="bg-gradient-to-l from-teal-600/25 via-violet-600/15 to-amber-500/15 px-4 pb-2 pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">סיכום כללי</h2>
      </div>
      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-white/10 bg-white/[0.04] text-sm">
        <div className="flex flex-col gap-1 p-4">
          <span className="text-xs text-amber-300">סה״כ הוצאות</span>
          <span className="text-lg font-bold text-slate-100">{formatCurrency(totalCost)}</span>
        </div>
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
    </div>
  )
}
