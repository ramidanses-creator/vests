import { useMemo } from 'react'
import { Card, EmptyState } from '../components/ui'
import { go } from '../router'
import { useStore } from '../store'
import { incomeOf } from '../utils/docs'
import { HEBREW_MONTHS, ils, round2, shiftMonth, todayISO } from '../utils/format'

/** Sales overview: income by month, best customers and best-selling items over the last 12 months. */
export function Sales() {
  const { data } = useStore()
  const bt = data.business.type
  const thisMonth = todayISO().slice(0, 7)
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => shiftMonth(thisMonth, i - 11)), [thisMonth])
  const from = months[0] + '-01'

  const stats = useMemo(() => {
    const byMonth = new Map(months.map((m) => [m, 0]))
    const byCustomer = new Map<string, { name: string; id?: string; total: number; count: number }>()
    const byItem = new Map<string, { name: string; qty: number; total: number }>()
    let count = 0
    for (const d of data.docs) {
      const income = incomeOf(d, bt)
      if (!income || d.date < from) continue
      count++
      const m = d.date.slice(0, 7)
      byMonth.set(m, (byMonth.get(m) ?? 0) + income)
      const ck = d.customerId ?? d.customer.name
      const c = byCustomer.get(ck) ?? { name: d.customer.name, id: d.customerId, total: 0, count: 0 }
      c.total += income
      c.count++
      byCustomer.set(ck, c)
      const sign = d.type === 'credit_invoice' ? -1 : 1
      for (const it of d.items) {
        if (it.unitPrice <= 0 || !it.description.trim()) continue
        const k = it.description.trim()
        const row = byItem.get(k) ?? { name: k, qty: 0, total: 0 }
        row.qty += sign * it.quantity
        row.total += sign * it.quantity * it.unitPrice
        byItem.set(k, row)
      }
    }
    const year = [...byMonth.values()].reduce((s, v) => s + v, 0)
    return {
      byMonth,
      year,
      count,
      avg: count ? year / count : 0,
      customers: [...byCustomer.values()].sort((a, b) => b.total - a.total).slice(0, 5),
      items: [...byItem.values()].filter((i) => i.qty > 0).sort((a, b) => b.total - a.total).slice(0, 5),
    }
  }, [data.docs, bt, months, from])

  const max = Math.max(1, ...stats.byMonth.values())
  const current = stats.byMonth.get(thisMonth) ?? 0
  const previous = stats.byMonth.get(shiftMonth(thisMonth, -1)) ?? 0
  const change = previous ? Math.round(((current - previous) / previous) * 100) : null
  const vatNote = bt === 'exempt' ? '' : ' · לפני מע״מ'

  if (stats.count === 0)
    return (
      <div className="pb-36">
        <EmptyState icon="chart" title="סקירת המכירות שלך" text="אחרי שתפיק חשבוניות או קבלות, תראה כאן את המכירות לפי חודש, את הלקוחות המובילים ואת המוצרים הנמכרים." />
      </div>
    )

  return (
    <div className="space-y-4 px-4 pb-36 pt-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-lime p-4">
          <p className="text-sm">מכירות החודש</p>
          <p className="text-2xl font-semibold">{ils(round2(current))}</p>
          {change !== null && (
            <p className="mt-1 text-sm">
              {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% מהחודש שעבר
            </p>
          )}
        </div>
        <div className="rounded-3xl bg-lavender p-4">
          <p className="text-sm">12 חודשים אחרונים</p>
          <p className="text-2xl font-semibold">{ils(round2(stats.year))}</p>
          <p className="mt-1 text-sm">{stats.count} מסמכים · ממוצע {ils(round2(stats.avg))}</p>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-bold">מכירות לפי חודש</h2>
        <p className="text-xs text-ink-soft">12 חודשים אחרונים{vatNote}</p>
        <div className="mt-4 flex h-40 items-end gap-1.5" dir="ltr">
          {months.map((m) => {
            const v = stats.byMonth.get(m) ?? 0
            return (
              <div key={m} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${ils(round2(v))}`}>
                <div
                  className={`w-full rounded-t-md ${m === thisMonth ? 'bg-mint' : 'bg-violet/60'}`}
                  style={{ height: `${Math.max(v > 0 ? 3 : 0, (v / max) * 100)}%` }}
                />
                <span className="text-[10px] text-ink-soft">{HEBREW_MONTHS[Number(m.slice(5)) - 1].slice(0, 3)}</span>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-bold">לקוחות מובילים</h2>
        {stats.customers.map((c, i) => (
          <button
            key={c.id ?? c.name}
            onClick={() => c.id && go(`/customer/${c.id}`)}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-right hover:bg-mist"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky text-sm font-semibold">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{c.name}</span>
            <span className="text-sm text-ink-soft">{c.count} מסמכים</span>
            <span className="font-semibold">{ils(round2(c.total))}</span>
          </button>
        ))}
      </Card>

      {stats.items.length > 0 && (
        <Card>
          <h2 className="mb-2 text-lg font-bold">מוצרים נמכרים</h2>
          {stats.items.map((it) => (
            <div key={it.name} className="flex items-center gap-3 p-2">
              <span className="min-w-0 flex-1 truncate">{it.name}</span>
              <span className="text-sm text-ink-soft">{round2(it.qty)} יח׳</span>
              <span className="font-semibold">{ils(round2(it.total))}</span>
            </div>
          ))}
          <p className="px-2 text-xs text-ink-soft">לפי המחירים שנרשמו בשורות המסמכים</p>
        </Card>
      )}
    </div>
  )
}
