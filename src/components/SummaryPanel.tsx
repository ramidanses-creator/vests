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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">סיכום כללי</h2>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500">סה״כ הוצאות</span>
          <span className="font-semibold text-slate-900">{formatCurrency(totalCost)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-500">סה״כ הכנסות</span>
          <span className="font-semibold text-slate-900">{formatCurrency(totalRevenue)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-500">סה״כ רווח</span>
          <span className={`font-semibold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(totalProfit)}
          </span>
        </div>
      </div>
    </div>
  )
}
