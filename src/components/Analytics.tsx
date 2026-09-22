import type { Product } from '../types'
import { calculateProductTotals, formatCurrency } from '../utils/calculations'

interface Props {
  products: Product[]
  usdToIlsRate: number | null
}

interface MonthStat {
  month: string
  revenue: number
  cost: number
  profit: number
}

function computeMonthlyStats(products: Product[], usdToIlsRate: number | null): MonthStat[] {
  const map = new Map<string, { revenue: number; cost: number }>()

  products.forEach((product) => {
    const totals = calculateProductTotals(product, usdToIlsRate)
    product.sales.forEach((sale) => {
      const month = sale.date.slice(0, 7)
      if (!month) return
      const netQty = sale.quantity - sale.returnedQuantity
      const entry = map.get(month) ?? { revenue: 0, cost: 0 }
      entry.revenue += netQty * sale.pricePerUnit
      entry.cost += netQty * totals.costPerUnit
      map.set(month, entry)
    })
  })

  return Array.from(map.entries())
    .map(([month, { revenue, cost }]) => ({ month, revenue, cost, profit: revenue - cost }))
    .sort((a, b) => b.month.localeCompare(a.month))
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
}

export function Analytics({ products, usdToIlsRate }: Props) {
  const stats = computeMonthlyStats(products, usdToIlsRate)
  const maxRevenue = Math.max(1, ...stats.map((s) => s.revenue))

  const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0)
  const totalProfit = stats.reduce((sum, s) => sum + s.profit, 0)

  if (stats.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
        אין עדיין מכירות לניתוח. ברגע שיירשמו מכירות, כאן יופיע פילוח חודשי של הכנסות ורווח.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-xs text-slate-400">סה״כ הכנסות (כל הזמנים)</div>
          <div className="text-lg font-bold text-slate-100">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-xs text-slate-400">סה״כ רווח (כל הזמנים)</div>
          <div className={`text-lg font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(totalProfit)}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {stats.map((s) => (
          <div key={s.month} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-200">{formatMonth(s.month)}</span>
              <span className={`font-semibold ${s.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                רווח: {formatCurrency(s.profit)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-teal-500"
                style={{ width: `${Math.max(4, (s.revenue / maxRevenue) * 100)}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-slate-400">הכנסות: {formatCurrency(s.revenue)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
