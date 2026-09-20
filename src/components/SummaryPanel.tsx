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
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20">
      <h2 className="mb-3 text-sm font-semibold text-slate-200">סיכום כללי</h2>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400">סה״כ הוצאות</span>
          <span className="font-semibold text-slate-100">{formatCurrency(totalCost)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-400">סה״כ הכנסות</span>
          <span className="font-semibold text-slate-100">{formatCurrency(totalRevenue)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-400">סה״כ רווח</span>
          <span className={`font-semibold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(totalProfit)}
          </span>
        </div>
      </div>
    </div>
  )
}
