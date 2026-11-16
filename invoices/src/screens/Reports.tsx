import { useMemo, useState } from 'react'
import { Button, Card, Icon, Segmented, TopBar } from '../components/ui'
import { go, replace } from '../router'
import { useStore } from '../store'
import { buildAccountantZip, zipContents, type ZipProgress } from '../utils/accountantZip'
import { fmt, ils, todayISO } from '../utils/format'
import { downloadFile, shareFile } from '../utils/pdf'
import { REPORTS, buildReport, periodMode, periodRange, reportToCsv, shiftPeriod, toMode, type PeriodMode, type ReportKind } from '../utils/reports'

function defaultPeriod(vatPeriod: 'monthly' | 'bimonthly'): string {
  return toMode(todayISO().slice(0, 7), vatPeriod === 'bimonthly' ? 'bimonth' : 'month', todayISO())
}

function PeriodPicker({ period, onChange }: { period: string; onChange: (p: string) => void }) {
  const r = periodRange(period)
  return (
    <div className="space-y-3">
      <Segmented<PeriodMode>
        value={periodMode(period)}
        onChange={(m) => onChange(toMode(period, m, todayISO()))}
        fill
        options={[
          { value: 'month', label: 'חודשי' },
          { value: 'bimonth', label: 'דו־חודשי' },
          { value: 'year', label: 'שנתי' },
        ]}
      />
      <div className="flex items-center justify-between rounded-2xl bg-white p-2">
        <button onClick={() => onChange(shiftPeriod(period, -1))} className="grid h-10 w-10 place-items-center rounded-full hover:bg-mist" aria-label="התקופה הקודמת">
          <Icon name="arrow-back" />
        </button>
        <span className="text-lg font-semibold">{r.label}</span>
        <button onClick={() => onChange(shiftPeriod(period, 1))} className="grid h-10 w-10 place-items-center rounded-full hover:bg-mist" aria-label="התקופה הבאה">
          <Icon name="arrow-forward" />
        </button>
      </div>
    </div>
  )
}

/** Report list inside שוטף ← דוחות. */
export function Reports({ month }: { month?: string }) {
  const { data } = useStore()
  const period = month ?? defaultPeriod(data.business.vatPeriod)
  const vatRegistered = data.business.type !== 'exempt'
  const list = REPORTS.filter((r) => vatRegistered || !r.vatOnly)

  const card = (r: (typeof REPORTS)[number]) => (
    <button
      key={r.kind}
      onClick={() => go(`/report/${r.kind}?m=${period}`)}
      className="flex w-full overflow-hidden rounded-2xl border border-line bg-white text-right shadow-sm transition active:scale-[0.99]"
    >
      <span className="flex-1 p-4">
        <span className="block text-lg font-bold">{r.title}</span>
        <span className="mt-1 block text-sm text-ink-soft">{r.text}</span>
      </span>
      <span className={`grid w-16 shrink-0 place-items-center ${r.strip} text-white`}>
        <Icon name="arrow-forward" size={24} />
      </span>
    </button>
  )

  return (
    <div className="space-y-4 px-4 pt-4">
      <PeriodPicker period={period} onChange={(p) => replace(`/ops?tab=reports&m=${p}`)} />
      <AccountantFolder period={period} />
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold">דוחות חשבונאיים</h2>
        <button onClick={() => go('/settings')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white" aria-label="הגדרות מס">
          <Icon name="settings" />
        </button>
      </div>
      {list.filter((r) => r.group === 'books').map(card)}
      <h2 className="pt-2 text-xl font-bold">דוחות לרשויות</h2>
      {list.filter((r) => r.group === 'authorities').map(card)}
    </div>
  )
}

/** One-tap ZIP of the period for the accountant. */
function AccountantFolder({ period }: { period: string }) {
  const { data } = useStore()
  const range = useMemo(() => periodRange(period), [period])
  const info = useMemo(() => zipContents(data, range), [data, range])
  const [progress, setProgress] = useState<ZipProgress | null>(null)
  const [file, setFile] = useState<{ period: string; file: File } | null>(null)
  const [error, setError] = useState('')
  const ready = file?.period === period ? file.file : null
  const message = `שלום, מצורפת תיקיית ${data.business.name} ל${range.label}: ${info.docs.length} מסמכים שהופקו ו־${info.expenses.length} הוצאות.`

  async function build() {
    setError('')
    try {
      const f = await buildAccountantZip(data, range, setProgress)
      setFile({ period, file: f })
    } catch {
      setError('לא הצלחתי להכין את הקובץ. נסו שוב.')
    } finally {
      setProgress(null)
    }
  }

  async function send() {
    if (!ready) return
    const r = await shareFile(ready, message)
    if (r === 'unsupported') {
      downloadFile(ready)
      if (data.business.accountantEmail)
        window.location.href = `mailto:${data.business.accountantEmail}?subject=${encodeURIComponent(`${data.business.name} — ${range.label}`)}&body=${encodeURIComponent(message + '\n(הקובץ ירד למחשב — צרפו אותו למייל.)')}`
    }
  }

  return (
    <div className="rounded-3xl bg-lime p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white">
          <Icon name="download" />
        </span>
        <div>
          <h2 className="text-xl font-bold">תיקיית רו״ח — {range.label}</h2>
          <p className="text-sm">
            {info.docs.length} מסמכים שהפקת · {info.expenses.length} הוצאות מאושרות ({info.files} עם קובץ) · דוחות באקסל
          </p>
        </div>
      </div>
      {info.pending > 0 && (
        <button onClick={() => go('/expenses')} className="mt-3 w-full rounded-xl bg-white/70 p-2.5 text-right text-sm">
          יש {info.pending} הוצאות בתקופה שעוד לא אושרו — הן לא ייכללו. <span className="font-semibold underline">לאישור</span>
        </button>
      )}
      <div className="mt-4">
        {progress ? (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-white/70">
              <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 100}%` }} />
            </div>
            <p className="text-center text-sm">
              מכין את התיקייה… {progress.done}/{progress.total}
            </p>
          </div>
        ) : ready ? (
          <div className="flex gap-2">
            <Button onClick={send} className="flex-[2]">
              <Icon name="share" size={18} /> שליחה לרו״ח
            </Button>
            <Button onClick={() => downloadFile(ready)} variant="secondary" className="flex-1">
              הורדה
            </Button>
          </div>
        ) : (
          <Button onClick={build} className="w-full" disabled={info.docs.length + info.expenses.length === 0}>
            הכנת קובץ ZIP לרו״ח
          </Button>
        )}
        {error && <p className="mt-2 text-sm text-orange">{error}</p>}
      </div>
    </div>
  )
}

export function ReportDetail({ kind, month }: { kind: ReportKind; month?: string }) {
  const { data } = useStore()
  const period = month ?? defaultPeriod(data.business.vatPeriod)
  const range = useMemo(() => periodRange(period), [period])
  const rep = useMemo(() => buildReport(kind, data, range), [kind, data, range])
  const [notice, setNotice] = useState('')

  const fileName = `${rep.title} - ${range.label}.csv`
  const csvFile = () => new File([reportToCsv(rep)], fileName, { type: 'text/csv' })

  async function sendToAccountant() {
    const f = csvFile()
    const r = await shareFile(f, `${rep.title} — ${range.label} — ${data.business.name}`)
    if (r === 'unsupported') {
      downloadFile(f)
      setNotice('הקובץ ירד למכשיר.')
    }
  }

  const fmtCell = (c: string | number, j: number) => (typeof c === 'number' && rep.moneyCols.includes(j) ? ils(c) : c)

  return (
    <div className="print-wrap min-h-dvh pb-16">
      <TopBar title={rep.title} />
      <div className="space-y-4 px-4">
        <div className="no-print">
          <PeriodPicker period={period} onChange={(p) => replace(`/report/${kind}?m=${p}`)} />
        </div>

        <div className="rounded-3xl bg-white p-5">
          <p className="text-ink-soft">
            {data.business.name} · {range.label}
          </p>
          <div className="mt-2 space-y-1.5">
            {rep.summary.map((s) => (
              <div key={s.label} className={`flex items-baseline justify-between ${s.strong ? 'border-t border-line pt-2 text-xl font-bold' : ''}`}>
                <span>{s.label}</span>
                <span>{s.percent ? `${fmt(s.value)}%` : kind === 'sequence' ? (s.value ? s.value : '✓') : ils(s.value)}</span>
              </div>
            ))}
          </div>
          {rep.note && <p className="mt-3 text-xs text-ink-soft">{rep.note}</p>}
        </div>

        <div className="no-print grid grid-cols-3 gap-2">
          <button onClick={sendToAccountant} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white py-3 text-xs font-medium">
            <Icon name="share" /> שליחה לרו״ח
          </button>
          <button onClick={() => downloadFile(csvFile())} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white py-3 text-xs font-medium">
            <Icon name="download" /> קובץ אקסל
          </button>
          <button onClick={() => window.print()} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white py-3 text-xs font-medium">
            <Icon name="print" /> הדפסה / PDF
          </button>
        </div>
        {notice && <p className="no-print rounded-xl bg-lime p-3 text-sm">{notice}</p>}

        <Card className="print-sheet overflow-x-auto !p-3">
          {rep.rows.length === 0 ? (
            <p className="p-6 text-center text-ink-soft">אין נתונים לתקופה הזו.</p>
          ) : (
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-ink-soft">
                  {rep.columns.map((h) => (
                    <th key={h} className="px-2 py-2 text-right font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rep.rows.map((r, i) => (
                  <tr key={i} className="border-b border-line/60">
                    {r.map((c, j) => (
                      <td key={j} className={`whitespace-nowrap px-2 py-2 ${rep.moneyCols.includes(j) ? 'text-left' : ''}`}>
                        {fmtCell(c, j)}
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
