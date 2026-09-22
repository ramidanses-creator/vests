import { useState } from 'react'
import type { Currency, MarketingExpense, Product } from '../types'
import { amountInIls, calculateProductTotals, formatCurrency } from '../utils/calculations'

interface Props {
  products: Product[]
  usdToIlsRate: number | null
  marketingExpenses: MarketingExpense[]
  onAddMarketingExpense: (expense: MarketingExpense) => void
  onRemoveMarketingExpense: (id: string) => void
}

interface MonthStat {
  month: string
  revenue: number
  cost: number
  profit: number
  marketingSpend: number
  netProfit: number
}

function computeMonthlyStats(
  products: Product[],
  usdToIlsRate: number | null,
  marketingExpenses: MarketingExpense[],
): MonthStat[] {
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

  const marketingByMonth = new Map<string, number>()
  marketingExpenses.forEach((expense) => {
    const month = expense.date.slice(0, 7)
    if (!month) return
    const inIls = amountInIls(expense.amount, expense.currency, usdToIlsRate)
    marketingByMonth.set(month, (marketingByMonth.get(month) ?? 0) + inIls)
  })

  const months = new Set([...map.keys(), ...marketingByMonth.keys()])

  return Array.from(months)
    .map((month) => {
      const { revenue, cost } = map.get(month) ?? { revenue: 0, cost: 0 }
      const marketingSpend = marketingByMonth.get(month) ?? 0
      const profit = revenue - cost
      return { month, revenue, cost, profit, marketingSpend, netProfit: profit - marketingSpend }
    })
    .sort((a, b) => b.month.localeCompare(a.month))
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
}

export function Analytics({ products, usdToIlsRate, marketingExpenses, onAddMarketingExpense, onRemoveMarketingExpense }: Props) {
  const stats = computeMonthlyStats(products, usdToIlsRate, marketingExpenses)
  const maxRevenue = Math.max(1, ...stats.map((s) => s.revenue))

  const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0)
  const totalProfit = stats.reduce((sum, s) => sum + s.profit, 0)
  const totalMarketingSpend = marketingExpenses.reduce((sum, e) => sum + amountInIls(e.amount, e.currency, usdToIlsRate), 0)
  const totalNetProfit = totalProfit - totalMarketingSpend

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('ILS')

  const amountNum = Number(amount)
  const canSubmit = date.trim() !== '' && Number.isFinite(amountNum) && amountNum > 0

  function handleSubmit() {
    if (!canSubmit) return
    onAddMarketingExpense({
      id: crypto.randomUUID(),
      date,
      label: label.trim(),
      amount: amountNum,
      currency,
    })
    setLabel('')
    setAmount('')
  }

  const sortedExpenses = [...marketingExpenses].sort((a, b) => b.date.localeCompare(a.date))

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
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-xs text-slate-400">סה״כ תקציב פרסום ושיווק</div>
          <div className="text-lg font-bold text-amber-400">{formatCurrency(totalMarketingSpend)}</div>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-xs text-slate-400">רווח נטו אחרי פרסום</div>
          <div className={`text-lg font-bold ${totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(totalNetProfit)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#1a1b20] p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">הוספת הוצאת פרסום/שיווק</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            תאריך
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-xs text-slate-400 sm:col-span-1">
            תיאור (לא חובה)
            <input
              type="text"
              placeholder="לדוגמה: פייסבוק אדס"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            סכום
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            מטבע
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
            >
              <option value="ILS">₪ שקל</option>
              <option value="USD">$ דולר</option>
            </select>
          </label>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-3 w-full rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
        >
          הוספה
        </button>

        {sortedExpenses.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-3">
            {sortedExpenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                <div className="flex flex-col">
                  <span className="text-slate-200">{e.label || 'הוצאת פרסום'}</span>
                  <span className="text-xs text-slate-500">{e.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-amber-400">
                    {e.currency === 'USD' ? `$${e.amount.toFixed(2)}` : formatCurrency(e.amount)}
                  </span>
                  <button onClick={() => onRemoveMarketingExpense(e.id)} className="text-xs text-slate-500 hover:text-rose-400">
                    מחיקה
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {stats.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
          אין עדיין מכירות לניתוח. ברגע שיירשמו מכירות, כאן יופיע פילוח חודשי של הכנסות ורווח.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {stats.map((s) => (
            <div key={s.month} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-200">{formatMonth(s.month)}</span>
                <span className={`font-semibold ${s.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  רווח נטו: {formatCurrency(s.netProfit)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-teal-500"
                  style={{ width: `${Math.max(4, (s.revenue / maxRevenue) * 100)}%` }}
                />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400">
                <span>הכנסות: {formatCurrency(s.revenue)}</span>
                <span>רווח: {formatCurrency(s.profit)}</span>
                {s.marketingSpend > 0 && <span className="text-amber-400/80">פרסום: {formatCurrency(s.marketingSpend)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
