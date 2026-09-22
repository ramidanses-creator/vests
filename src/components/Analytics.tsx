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

function monthsBetween(start: string, end: string): string[] {
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  const months: string[] = []
  let y = sy
  let m = sm
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return months
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

  const oneOffByMonth = new Map<string, number>()
  const recurring: { month: string; amountIls: number }[] = []
  marketingExpenses.forEach((expense) => {
    const month = expense.date.slice(0, 7)
    if (!month) return
    const inIls = amountInIls(expense.amount, expense.currency, usdToIlsRate)
    if (expense.recurring) {
      recurring.push({ month, amountIls: inIls })
    } else {
      oneOffByMonth.set(month, (oneOffByMonth.get(month) ?? 0) + inIls)
    }
  })

  const allMonths = [...map.keys(), ...oneOffByMonth.keys(), ...recurring.map((r) => r.month)]
  if (allMonths.length === 0) return []
  const sortedMonths = [...allMonths].sort()
  const fullRange = monthsBetween(sortedMonths[0], sortedMonths[sortedMonths.length - 1])

  return fullRange
    .map((month) => {
      const { revenue, cost } = map.get(month) ?? { revenue: 0, cost: 0 }
      const oneOff = oneOffByMonth.get(month) ?? 0
      const recurringForMonth = recurring
        .filter((r) => r.month <= month)
        .reduce((sum, r) => sum + r.amountIls, 0)
      const marketingSpend = oneOff + recurringForMonth
      const profit = revenue - cost
      return { month, revenue, cost, profit, marketingSpend, netProfit: profit - marketingSpend }
    })
    .filter((s) => s.revenue > 0 || s.cost > 0 || s.marketingSpend > 0)
    .sort((a, b) => b.month.localeCompare(a.month))
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function MonthlyChart({ stats }: { stats: MonthStat[] }) {
  const chartStats = [...stats].sort((a, b) => a.month.localeCompare(b.month))
  const maxAbs = Math.max(1, ...chartStats.flatMap((s) => [Math.abs(s.revenue), Math.abs(s.netProfit)]))
  const barWidth = 22
  const gap = 14
  const chartHeight = 140
  const width = Math.max(chartStats.length * (barWidth * 2 + gap), 200)

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={chartHeight + 30} className="min-w-full">
        {chartStats.map((s, i) => {
          const x = i * (barWidth * 2 + gap) + gap / 2
          const revenueH = Math.max(2, (Math.abs(s.revenue) / maxAbs) * chartHeight)
          const netH = Math.max(2, (Math.abs(s.netProfit) / maxAbs) * chartHeight)
          return (
            <g key={s.month}>
              <rect x={x} y={chartHeight - revenueH} width={barWidth} height={revenueH} fill="#2dd4bf" rx={3} />
              <rect
                x={x + barWidth + 4}
                y={s.netProfit >= 0 ? chartHeight - netH : chartHeight}
                width={barWidth}
                height={netH}
                fill={s.netProfit >= 0 ? '#34d399' : '#fb7185'}
                rx={3}
              />
              <text
                x={x + barWidth}
                y={chartHeight + 16}
                fontSize="9"
                fill="#94a3b8"
                textAnchor="middle"
              >
                {formatMonth(s.month).split(' ')[0].slice(0, 3)}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-teal-400" /> הכנסות
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-emerald-400" /> רווח נטו
        </span>
      </div>
    </div>
  )
}

export function Analytics({ products, usdToIlsRate, marketingExpenses, onAddMarketingExpense, onRemoveMarketingExpense }: Props) {
  const stats = computeMonthlyStats(products, usdToIlsRate, marketingExpenses)
  const maxRevenue = Math.max(1, ...stats.map((s) => s.revenue))

  const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0)
  const totalProfit = stats.reduce((sum, s) => sum + s.profit, 0)
  const totalMarketingSpend = stats.reduce((sum, s) => sum + s.marketingSpend, 0)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('ILS')
  const [recurring, setRecurring] = useState(false)

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
      recurring,
    })
    setLabel('')
    setAmount('')
    setRecurring(false)
  }

  function handleExportCsv() {
    downloadCsv('אנליטיקה-חודשית.csv', [
      ['חודש', 'הכנסות', 'עלות', 'רווח', 'תקציב פרסום', 'רווח נטו'],
      ...[...stats].sort((a, b) => a.month.localeCompare(b.month)).map((s) => [
        formatMonth(s.month),
        s.revenue.toFixed(2),
        s.cost.toFixed(2),
        s.profit.toFixed(2),
        s.marketingSpend.toFixed(2),
        s.netProfit.toFixed(2),
      ]),
    ])
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
          <div className={`text-lg font-bold ${totalProfit - totalMarketingSpend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(totalProfit - totalMarketingSpend)}
          </div>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#1a1b20] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">הכנסות מול רווח נטו לפי חודש</h3>
            <button onClick={handleExportCsv} className="text-xs font-medium text-teal-300 hover:text-teal-200">
              ⬇️ ייצוא CSV
            </button>
          </div>
          <MonthlyChart stats={stats} />
        </div>
      )}

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
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4 rounded" />
          הוצאה חודשית קבועה (תחזור אוטומטית כל חודש החל מהתאריך שנבחר)
        </label>
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
                  <span className="text-slate-200">
                    {e.label || 'הוצאת פרסום'}
                    {e.recurring && <span className="mr-1 rounded bg-teal-500/15 px-1.5 py-0.5 text-[10px] text-teal-300">חודשי</span>}
                  </span>
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
