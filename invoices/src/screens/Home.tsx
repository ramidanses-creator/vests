import { useMemo, useState } from 'react'
import { DocRow } from '../components/DocRow'
import { InstallCard } from '../install'
import { ActionTile, Card, Icon, Segmented, Sheet } from '../components/ui'
import { go } from '../router'
import { useStore } from '../store'
import { computeTotals, expenseNet, incomeOf, inRange, isApproved, isOpen, receivedOf } from '../utils/docs'
import { greeting, ils, localISO, todayISO } from '../utils/format'

type Period = 'week' | 'month' | 'year'

function periodStart(p: Period): string {
  const d = new Date()
  if (p === 'week') d.setDate(d.getDate() - 6)
  else if (p === 'month') d.setDate(d.getDate() - 29)
  else d.setFullYear(d.getFullYear() - 1)
  return localISO(d)
}

export function Home() {
  const { data } = useStore()
  const { business, docs, expenses } = data
  const [period, setPeriod] = useState<Period>('week')
  const [moreOpen, setMoreOpen] = useState(false)

  const today = todayISO()
  const monthStart = today.slice(0, 7) + '-01'

  const stats = useMemo(() => {
    const open = docs.filter(isOpen)
    return {
      openCount: open.length,
      openSum: open.reduce((s, d) => s + computeTotals(d).total, 0),
      receivedMonth: docs.filter((d) => inRange(d.date, monthStart, today)).reduce((s, d) => s + receivedOf(d), 0),
      receiptsMonth: docs.filter((d) => d.status === 'issued' && inRange(d.date, monthStart, today) && receivedOf(d) > 0).length,
      drafts: docs.filter((d) => d.status === 'draft').length,
    }
  }, [docs, monthStart, today])

  const summary = useMemo(() => {
    const from = periodStart(period)
    const income = docs.filter((d) => inRange(d.date, from, today)).reduce((s, d) => s + incomeOf(d, business.type), 0)
    const spent = expenses
      .filter((e) => isApproved(e) && inRange(e.date, from, today))
      .reduce((s, e) => s + (business.type === 'exempt' ? e.amount : expenseNet(e)), 0)
    return { income, spent }
  }, [docs, expenses, period, today, business.type])

  const recent = useMemo(
    () => [...docs].sort((a, b) => (b.issuedAt ?? b.createdAt).localeCompare(a.issuedAt ?? a.createdAt)).slice(0, 5),
    [docs],
  )

  const max = Math.max(summary.income, summary.spent, 1)

  return (
    <div className="pb-32">

      <h1 className="px-5 pt-4 text-3xl font-semibold text-ink">
        {greeting()} {business.ownerName.split(' ')[0]}
      </h1>

      <InstallCard />

      <div className="no-scrollbar mt-6 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
        <button onClick={() => go('/income?tab=open')} className="flex min-h-40 w-[72%] max-w-72 shrink-0 snap-start flex-col justify-between rounded-3xl bg-lime p-5 text-right">
          <Icon name="doc" size={30} />
          <span>
            <span className="block text-4xl font-semibold tracking-tight">{ils(stats.openSum)}</span>
            <span className="mt-1 block text-lg">חיובים פתוחים ({stats.openCount})</span>
          </span>
        </button>
        <button onClick={() => go('/income?tab=receipts')} className="flex min-h-40 w-[60%] max-w-64 shrink-0 snap-start flex-col justify-between rounded-3xl bg-lavender p-5 text-right">
          <Icon name="coins" size={30} />
          <span>
            <span className="block text-4xl font-semibold tracking-tight">{ils(stats.receivedMonth)}</span>
            <span className="mt-1 block text-lg">תקבולים החודש ({stats.receiptsMonth})</span>
          </span>
        </button>
        <button onClick={() => go('/ops?tab=drafts')} className="flex min-h-40 w-[48%] max-w-56 shrink-0 snap-start flex-col justify-between rounded-3xl bg-sky p-5 text-right">
          <Icon name="edit" size={30} />
          <span>
            <span className="block text-4xl font-semibold tracking-tight">{stats.drafts}</span>
            <span className="mt-1 block text-lg">טיוטות</span>
          </span>
        </button>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2 px-5">
        <ActionTile icon="user" label="הוספת לקוח" tone="bg-sky" onClick={() => go('/income?tab=customers&add=1')} />
        <ActionTile icon="wallet" label="העלאת הוצאה" tone="bg-peach" onClick={() => go('/expenses?add=1')} />
        <ActionTile icon="doc" label="דוח הכנסות" tone="bg-lavender" onClick={() => go('/report/income')} />
        <ActionTile icon="dots" label="פעולות נוספות" tone="bg-slate-tile text-white" onClick={() => setMoreOpen(true)} />
      </div>

      <Card className="mx-5 mt-8">
        <h2 className="text-xl font-bold">סך הכנסות והוצאות</h2>
        <div className="mt-4">
          <Segmented
            value={period}
            onChange={setPeriod}
            fill
            options={[
              { value: 'week', label: 'בשבוע האחרון' },
              { value: 'month', label: '30 ימים אחרונים' },
              { value: 'year', label: 'בשנה האחרונה' },
            ]}
          />
        </div>
        <div className="mt-5 space-y-4">
          {[
            { label: 'הכנסות', value: summary.income, color: 'bg-mint' },
            { label: 'הוצאות', value: summary.spent, color: 'bg-orange' },
          ].map((row) => (
            <div key={row.label}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-ink-soft">{row.label}</span>
                <span className="text-lg font-semibold">{ils(row.value)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-mist">
                <div className={`h-full rounded-full ${row.color} transition-all`} style={{ width: `${Math.max(0, (row.value / max) * 100)}%` }} />
              </div>
            </div>
          ))}
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <span className="font-medium">רווח</span>
            <span className={`text-xl font-bold ${summary.income - summary.spent < 0 ? 'text-orange' : 'text-mint'}`}>
              {ils(summary.income - summary.spent)}
            </span>
          </div>
          {business.type !== 'exempt' && <p className="text-xs text-ink-soft">הסכומים לפני מע״מ</p>}
        </div>
      </Card>

      <Card className="mx-5 mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">מסמכים אחרונים</h2>
          {recent.length > 0 && (
            <button onClick={() => go('/income')} className="text-sm font-medium text-indigo">
              לכל המסמכים
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-ink-soft">עוד לא הופקו מסמכים. לחצו על + כדי להתחיל.</p>
        ) : (
          recent.map((d) => <DocRow key={d.id} doc={d} />)
        )}
      </Card>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="פעולות נוספות">
        <div className="grid grid-cols-3 gap-y-6">
          <ActionTile icon="doc" label="הצעת מחיר" tone="bg-mist" onClick={() => go('/new/quote')} />
          <ActionTile icon="receipt" label="חשבון עסקה" tone="bg-sky" onClick={() => go('/new/deal_invoice')} />
          <ActionTile icon="chart" label="דוח הוצאות" tone="bg-peach" onClick={() => go('/report/expenses')} />
          <ActionTile icon="users" label="לקוחות" tone="bg-lavender" onClick={() => go('/income?tab=customers')} />
          <ActionTile icon="settings" label="פרטי העסק" tone="bg-lime" onClick={() => go('/settings')} />
          <ActionTile icon="download" label="גיבוי נתונים" tone="bg-slate-tile text-white" onClick={() => go('/settings?section=backup')} />
        </div>
      </Sheet>
    </div>
  )
}
