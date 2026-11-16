import { useCallback, useMemo, useState } from 'react'
import { Card, EmptyState, Icon, Segmented, Sheet, UnderlineTabs } from '../components/ui'
import { go, replace } from '../router'
import { useStore } from '../store'
import type { Doc, PaymentMethod } from '../types'
import { DOC_META, PAYMENT_METHODS, isOpen, paymentLabel } from '../utils/docs'
import { fmtDate, ils, monthLabel } from '../utils/format'
import { Customers } from './Customers'
import { DocList, SearchBox } from './Documents'

type Tab = 'docs' | 'customers' | 'receipts' | 'open'

const TABS: { value: Tab; label: string }[] = [
  { value: 'docs', label: 'מסמכי הכנסות' },
  { value: 'customers', label: 'לקוחות' },
  { value: 'receipts', label: 'תקבולים' },
  { value: 'open', label: 'חיובים פתוחים' },
]

export function Income({ tab, autoAddCustomer, onNewDoc }: { tab: string; autoAddCustomer: boolean; onNewDoc: () => void }) {
  const current = (TABS.some((t) => t.value === tab) ? tab : 'docs') as Tab
  const incomeDocs = useCallback((d: Doc) => d.status === 'issued' && DOC_META[d.type].group === 'income', [])
  return (
    <div className="pb-36">
      <UnderlineTabs value={current} onChange={(v) => replace(`/income?tab=${v}`)} options={TABS} accent="bg-mint" />
      {current === 'docs' && (
        <DocList
          filter={incomeDocs}
          emptyTitle="מסמכי ההכנסות שלך"
          emptyText="כאן יופיעו כל הקבלות והחשבוניות שהפקת."
          onCreate={onNewDoc}
          createLabel="הפקת מסמך"
        />
      )}
      {current === 'customers' && <Customers autoAdd={autoAddCustomer} />}
      {current === 'receipts' && <Receipts />}
      {current === 'open' && (
        <DocList filter={isOpen} emptyTitle="אין חיובים פתוחים" emptyText="חשבוניות שעוד לא שולמו יופיעו כאן עד שתפיק עליהן קבלה." />
      )}
    </div>
  )
}

interface ReceiptRow {
  key: string
  doc: Doc
  date: string
  method: PaymentMethod
  amount: number
  reference: string
  installments: number
}

/** Every payment received, from receipts and tax invoice/receipts. */
function Receipts() {
  const { data } = useStore()
  const [q, setQ] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [method, setMethod] = useState<PaymentMethod | 'all'>('all')
  const [month, setMonth] = useState<string>('all')

  const rows = useMemo(() => {
    const out: ReceiptRow[] = []
    for (const d of data.docs) {
      if (d.status !== 'issued' || !DOC_META[d.type].hasPayments) continue
      for (const p of d.payments) out.push({ key: d.id + p.id, doc: d, date: p.date || d.date, method: p.method, amount: p.amount, reference: p.reference, installments: p.installments })
    }
    return out.sort((a, b) => b.date.localeCompare(a.date))
  }, [data.docs])

  const months = useMemo(() => [...new Set(rows.map((r) => r.date.slice(0, 7)))], [rows])
  const filtered = rows.filter(
    (r) =>
      (!q.trim() || r.doc.customer.name.includes(q.trim())) &&
      (method === 'all' || r.method === method) &&
      (month === 'all' || r.date.startsWith(month)),
  )
  const total = filtered.reduce((s, r) => s + r.amount, 0)
  const filtering = method !== 'all' || month !== 'all'

  if (rows.length === 0)
    return <EmptyState icon="coins" title="עוד אין תקבולים" text="כל תשלום שתרשום בקבלה או בחשבונית מס/קבלה יופיע כאן." />

  return (
    <div className="space-y-4 px-4 pt-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchBox value={q} onChange={setQ} placeholder="חיפוש לפי לקוח" />
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className={`relative grid w-12 shrink-0 place-items-center rounded-xl border ${filtering ? 'border-mint bg-mint/10' : 'border-line bg-white'}`}
          aria-label="סינון"
        >
          <Icon name="sliders" />
          {filtering && <span className="absolute left-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-mint" />}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="space-y-3 py-8 text-center">
          <p className="text-lg font-semibold">לא מצאנו תקבולים בחיפוש שהגדרת</p>
          <p className="text-ink-soft">אולי שינוי הגדרות הסינון יעזור למצוא את התקבול שחיפשת.</p>
          <button
            onClick={() => {
              setQ('')
              setMethod('all')
              setMonth('all')
            }}
            className="rounded-full border border-ink px-8 py-3 font-medium"
          >
            חזרה לרשימה
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between rounded-2xl bg-lime px-4 py-3">
            <span>{filtered.length} תקבולים</span>
            <span className="text-xl font-bold">{ils(total)}</span>
          </div>
          <Card className="!p-2">
            {filtered.map((r) => (
              <button key={r.key} onClick={() => go(`/doc/${r.doc.id}`)} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-right hover:bg-mist">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lavender">
                  <Icon name="coins" size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.doc.customer.name}</span>
                  <span className="block truncate text-sm text-ink-soft">
                    {fmtDate(r.date)} · {paymentLabel(r.method)}
                    {r.installments > 1 ? ` · ${r.installments} תשלומים` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-left">
                  <span className="block font-semibold">{ils(r.amount)}</span>
                  <span className="block text-xs text-ink-soft">
                    {DOC_META[r.doc.type].label} {r.doc.number}
                  </span>
                </span>
              </button>
            ))}
          </Card>
        </>
      )}

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="סינון תקבולים">
        <div className="space-y-5">
          <div>
            <p className="mb-2 font-medium">חודש</p>
            <Segmented
              value={month}
              onChange={setMonth}
              options={[{ value: 'all', label: 'הכל' }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]}
            />
          </div>
          <div>
            <p className="mb-2 font-medium">אמצעי תשלום</p>
            <div className="flex flex-wrap gap-2">
              {[{ id: 'all' as const, label: 'הכל' }, ...PAYMENT_METHODS].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`rounded-lg px-3 py-2 text-sm ${method === m.id ? 'bg-ink text-white' : 'bg-mist'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setFilterOpen(false)} className="w-full rounded-xl bg-ink py-3 font-semibold text-white">
            הצגת {filtered.length} תקבולים
          </button>
        </div>
      </Sheet>
    </div>
  )
}
