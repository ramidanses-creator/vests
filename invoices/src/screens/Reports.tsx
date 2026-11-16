import { useMemo } from 'react'
import { Card, Icon, Segmented, TopBar } from '../components/ui'
import { go, replace } from '../router'
import { useStore } from '../store'
import type { AppData, Doc } from '../types'
import { DOC_META, computeTotals, expenseNet, incomeOf } from '../utils/docs'
import { fmtDate, ils, monthLabel, round2, shiftMonth, todayISO } from '../utils/format'

/** "2026-11" → that month; "2026" → whole year. */
function periodLabel(p: string) {
  return p.length === 4 ? `שנת ${p}` : monthLabel(p)
}

function shiftPeriod(p: string, delta: number) {
  return p.length === 4 ? String(Number(p) + delta) : shiftMonth(p, delta)
}

function incomeDocs(data: AppData, period: string): Doc[] {
  const exempt = data.business.type === 'exempt'
  return data.docs
    .filter((d) => d.status === 'issued' && d.date.startsWith(period))
    .filter((d) => (exempt ? d.type === 'receipt' : ['tax_invoice', 'tax_invoice_receipt', 'credit_invoice'].includes(d.type)))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.number ?? 0) - (b.number ?? 0))
}

function summarize(data: AppData, period: string) {
  const docs = incomeDocs(data, period)
  const sign = (d: Doc) => (d.type === 'credit_invoice' ? -1 : 1)
  const income = docs.reduce((s, d) => s + incomeOf(d, data.business.type), 0)
  const outputVat = docs.reduce((s, d) => s + sign(d) * computeTotals(d).vat, 0)
  const expenses = data.expenses.filter((e) => e.date.startsWith(period))
  const spent = expenses.reduce((s, e) => s + (data.business.type === 'exempt' ? e.amount : expenseNet(e)), 0)
  const inputVat = expenses.reduce((s, e) => s + e.vat, 0)
  return { docs, expenses, income: round2(income), outputVat: round2(outputVat), spent: round2(spent), inputVat: round2(inputVat) }
}

function PeriodPicker({ period, onChange }: { period: string; onChange: (p: string) => void }) {
  const isYear = period.length === 4
  return (
    <div className="space-y-3">
      <Segmented
        value={isYear ? 'year' : 'month'}
        onChange={(v) => onChange(v === 'year' ? period.slice(0, 4) : `${period.slice(0, 4)}-${todayISO().slice(5, 7)}`)}
        options={[
          { value: 'month', label: 'חודשי' },
          { value: 'year', label: 'שנתי' },
        ]}
      />
      <div className="flex items-center justify-between rounded-2xl bg-white p-2">
        <button onClick={() => onChange(shiftPeriod(period, -1))} className="grid h-10 w-10 place-items-center rounded-full hover:bg-mist" aria-label="הקודם">
          <Icon name="arrow-back" />
        </button>
        <span className="text-lg font-semibold">{periodLabel(period)}</span>
        <button onClick={() => onChange(shiftPeriod(period, 1))} className="grid h-10 w-10 place-items-center rounded-full hover:bg-mist" aria-label="הבא">
          <Icon name="arrow-forward" />
        </button>
      </div>
    </div>
  )
}

export function Reports({ month }: { month?: string }) {
  const { data } = useStore()
  const period = month ?? todayISO().slice(0, 7)
  const s = useMemo(() => summarize(data, period), [data, period])
  const vatRegistered = data.business.type !== 'exempt'

  const cards = [
    { kind: 'income', title: 'דוח הכנסות', strip: 'bg-mint', value: s.income, sub: `${s.docs.length} מסמכים` },
    { kind: 'expenses', title: 'דוח הוצאות', strip: 'bg-orange', value: s.spent, sub: `${s.expenses.length} הוצאות` },
  ]

  return (
    <div className="pb-36">
      <header className="px-5 pt-[max(env(safe-area-inset-top),20px)]">
        <h1 className="text-3xl font-semibold">דוחות</h1>
        <p className="mt-1 text-ink-soft">להעביר ברגע דוחות לרו״ח, בכל זמן ומכל מקום</p>
      </header>
      <div className="mt-4 space-y-4 px-5">
        <PeriodPicker period={period} onChange={(p) => replace(`/reports?m=${p}`)} />

        <h2 className="pt-2 text-xl font-bold">דוחות חשבונאיים</h2>
        {cards.map((c) => (
          <button
            key={c.kind}
            onClick={() => go(`/report/${c.kind}?m=${period}`)}
            className="flex w-full overflow-hidden rounded-2xl border border-line bg-white text-right shadow-sm transition active:scale-[0.99]"
          >
            <span className="flex-1 p-5">
              <span className="block text-xl font-bold">{c.title}</span>
              <span className="mt-2 block text-3xl font-semibold">{ils(c.value)}</span>
              <span className="mt-2 inline-block rounded-md bg-slate-tile/70 px-2.5 py-1 text-sm text-white">{c.sub}</span>
              {vatRegistered && <span className="mr-2 text-xs text-ink-soft">לפני מע״מ</span>}
            </span>
            <span className={`grid w-20 place-items-center ${c.strip} text-white`}>
              <Icon name="arrow-forward" size={28} />
            </span>
          </button>
        ))}

        {vatRegistered && (
          <Card>
            <h2 className="text-xl font-bold">סיכום מע״מ — {periodLabel(period)}</h2>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-soft">מע״מ עסקאות</span>
                <span>{ils(s.outputVat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">מע״מ תשומות</span>
                <span>−{ils(s.inputVat)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-lg font-bold">
                <span>{s.outputVat - s.inputVat >= 0 ? 'מע״מ לתשלום' : 'מע״מ להחזר'}</span>
                <span>{ils(Math.abs(s.outputVat - s.inputVat))}</span>
              </div>
              <p className="text-xs text-ink-soft">הערכה בלבד לפי המסמכים וההוצאות שהוזנו. הדיווח הרשמי — דרך רו״ח או אתר רשות המסים.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function toCsv(rows: (string | number)[][]): string {
  return '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
}

export function ReportDetail({ kind, month }: { kind: 'income' | 'expenses'; month?: string }) {
  const { data } = useStore()
  const period = month ?? todayISO().slice(0, 7)
  const s = useMemo(() => summarize(data, period), [data, period])
  const vatRegistered = data.business.type !== 'exempt'
  const title = kind === 'income' ? 'דוח הכנסות' : 'דוח הוצאות'

  const rows: (string | number)[][] =
    kind === 'income'
      ? [
          ['תאריך', 'סוג מסמך', 'מספר', 'לקוח', 'ח.פ. לקוח', 'לפני מע״מ', 'מע״מ', 'סה״כ'],
          ...s.docs.map((d) => {
            const t = computeTotals(d)
            const sign = d.type === 'credit_invoice' ? -1 : 1
            return [fmtDate(d.date), DOC_META[d.type].label, d.number ?? '', d.customer.name, d.customer.taxId, sign * t.net, sign * t.vat, sign * t.total]
          }),
        ]
      : [
          ['תאריך', 'ספק', 'קטגוריה', 'תיאור', 'לפני מע״מ', 'מע״מ', 'סה״כ'],
          ...s.expenses
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((e) => [fmtDate(e.date), e.supplier, e.category, e.description, expenseNet(e), e.vat, e.amount]),
        ]

  const fileName = `${kind === 'income' ? 'income' : 'expenses'}-${period}.csv`

  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  async function sendToAccountant() {
    const file = new File([toCsv(rows)], fileName, { type: 'text/csv' })
    const text = `${title} — ${periodLabel(period)} — ${data.business.name}`
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: text, text })
        return
      } catch {
        return
      }
    }
    download()
    window.location.href = `mailto:${data.business.accountantEmail}?subject=${encodeURIComponent(text)}&body=${encodeURIComponent('מצורף הדוח (הקובץ ירד למכשיר — יש לצרף אותו למייל).')}`
  }

  const byCategory = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of s.expenses) m.set(e.category, (m.get(e.category) ?? 0) + e.amount)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [s.expenses])

  const total = kind === 'income' ? s.income : s.spent

  return (
    <div className="print-wrap min-h-dvh pb-16">
      <TopBar title={title} />
      <div className="space-y-4 px-4">
        <div className="no-print">
          <PeriodPicker period={period} onChange={(p) => replace(`/report/${kind}?m=${p}`)} />
        </div>

        <div className={`rounded-3xl p-5 ${kind === 'income' ? 'bg-lime' : 'bg-peach'}`}>
          <p className="text-ink-soft">
            {data.business.name} · {periodLabel(period)}
          </p>
          <p className="mt-1 text-4xl font-semibold">{ils(total)}</p>
          <p className="mt-1">{vatRegistered ? 'סה״כ לפני מע״מ' : 'סה״כ'}</p>
        </div>

        <div className="no-print grid grid-cols-3 gap-2">
          <button onClick={sendToAccountant} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white py-3 text-xs font-medium">
            <Icon name="share" /> שליחה לרו״ח
          </button>
          <button onClick={download} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white py-3 text-xs font-medium">
            <Icon name="download" /> קובץ אקסל (CSV)
          </button>
          <button onClick={() => window.print()} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white py-3 text-xs font-medium">
            <Icon name="print" /> הדפסה / PDF
          </button>
        </div>

        {kind === 'expenses' && byCategory.length > 0 && (
          <Card>
            <h2 className="mb-3 font-bold">לפי קטגוריה</h2>
            <div className="space-y-2">
              {byCategory.map(([cat, sum]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm">
                    <span>{cat}</span>
                    <span className="font-medium">{ils(sum)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-mist">
                    <div className="h-full rounded-full bg-orange" style={{ width: `${(sum / byCategory[0][1]) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="print-sheet overflow-x-auto !p-3">
          {rows.length <= 1 ? (
            <p className="p-6 text-center text-ink-soft">אין נתונים לתקופה הזו.</p>
          ) : (
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-ink-soft">
                  {rows[0].map((h) => (
                    <th key={String(h)} className="px-2 py-2 text-right font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((r, i) => (
                  <tr key={i} className="border-b border-line/60">
                    {r.map((c, j) => (
                      <td key={j} className={`px-2 py-2 ${typeof c === 'number' ? 'text-left' : ''}`}>
                        {typeof c === 'number' && j >= rows[0].length - 3 ? ils(c) : c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}
