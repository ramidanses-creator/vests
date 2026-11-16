// Report calculations, kept free of UI so they can be tested and reused for the accountant ZIP.
import type { AppData, Doc, DocType } from '../types'
import { DOC_META, DOC_TYPE_ORDER, allowedDocTypes, computeTotals, expenseNet, incomeOf, isApproved, paymentLabel } from './docs'
import { HEBREW_MONTHS, fmtDate, monthLabel, round2, shiftMonth } from './format'

// ---------- periods ----------
// "2026-11" = a month, "2026-11b" = the two-month VAT period that contains it
// (Jan–Feb, Mar–Apr, …), "2026" = a whole year.

export type PeriodMode = 'month' | 'bimonth' | 'year'

export interface Range {
  from: string
  to: string
  label: string
}

export function periodMode(p: string): PeriodMode {
  return p.length === 4 ? 'year' : p.endsWith('b') ? 'bimonth' : 'month'
}

function bimonthStart(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${y}-${String(m % 2 === 0 ? m - 1 : m).padStart(2, '0')}`
}

export function periodRange(p: string): Range {
  const mode = periodMode(p)
  if (mode === 'year') return { from: `${p}-01-01`, to: `${p}-12-31`, label: `שנת ${p}` }
  if (mode === 'bimonth') {
    const start = bimonthStart(p.slice(0, 7))
    const end = shiftMonth(start, 1)
    const [y, m] = start.split('-').map(Number)
    return { from: `${start}-01`, to: `${end}-31`, label: `${HEBREW_MONTHS[m - 1]}–${HEBREW_MONTHS[m]} ${y}` }
  }
  return { from: `${p}-01`, to: `${p}-31`, label: monthLabel(p) }
}

export function shiftPeriod(p: string, delta: number): string {
  const mode = periodMode(p)
  if (mode === 'year') return String(Number(p) + delta)
  if (mode === 'bimonth') return shiftMonth(bimonthStart(p.slice(0, 7)), delta * 2) + 'b'
  return shiftMonth(p, delta)
}

export function toMode(p: string, mode: PeriodMode, today: string): string {
  const ym = periodMode(p) === 'year' ? `${p}-${today.slice(5, 7)}` : p.slice(0, 7)
  if (mode === 'year') return ym.slice(0, 4)
  if (mode === 'bimonth') return bimonthStart(ym) + 'b'
  return ym
}

export const inRange = (date: string, r: Range) => date.slice(0, 10) >= r.from && date.slice(0, 10) <= r.to

/** Months (YYYY-MM) covered by a range. */
function monthsOf(r: Range): string[] {
  const out: string[] = []
  for (let m = r.from.slice(0, 7); m <= r.to.slice(0, 7); m = shiftMonth(m, 1)) out.push(m)
  return out
}

// ---------- reports ----------

export type ReportKind = 'income' | 'expenses' | 'pnl' | 'vat' | 'advances' | 'cashbook' | 'sequence'

export const REPORTS: { kind: ReportKind; title: string; text: string; strip: string; group: 'books' | 'authorities'; vatOnly?: boolean }[] = [
  { kind: 'income', title: 'דוח הכנסות', text: 'כל הקבלות והחשבוניות שהפקת בתקופה.', strip: 'bg-mint', group: 'books' },
  { kind: 'expenses', title: 'דוח הוצאות', text: 'כל ההוצאות שאושרו בתקופה, לפי סוג.', strip: 'bg-orange', group: 'books' },
  { kind: 'pnl', title: 'דוח רווח והפסד', text: 'הכנסות פחות הוצאות — כמה העסק הרוויח (או הפסיד) בתקופה.', strip: 'bg-[#f5b82e]', group: 'books' },
  { kind: 'vat', title: 'דוח מע״מ', text: 'מע״מ עסקאות פחות מע״מ תשומות — כמה מע״מ לשלם (או לקבל).', strip: 'bg-[#f43f6b]', group: 'books', vatOnly: true },
  { kind: 'advances', title: 'דוח מקדמות מס הכנסה', text: 'המקדמה לתשלום לפי המחזור ושיעור המקדמות שלך.', strip: 'bg-[#7c3aed]', group: 'books' },
  { kind: 'cashbook', title: 'ספר תקבולים ותשלומים', text: 'כל הכסף שנכנס ויצא, לפי סדר התאריכים.', strip: 'bg-indigo', group: 'authorities' },
  { kind: 'sequence', title: 'דוח רציפות מסמכים', text: 'בדיקה שמספור כל סוגי המסמכים רציף ואין מספרים חסרים.', strip: 'bg-indigo', group: 'authorities' },
]

export type Cell = string | number

export interface Report {
  title: string
  /** Headline figures shown above the table. */
  summary: { label: string; value: number; strong?: boolean; percent?: boolean }[]
  columns: string[]
  /** Columns (by index) holding money, right-aligned and formatted. */
  moneyCols: number[]
  rows: Cell[][]
  note?: string
}

const sign = (d: Doc) => (d.type === 'credit_invoice' ? -1 : 1)

export function incomeDocsIn(data: AppData, r: Range): Doc[] {
  const exempt = data.business.type === 'exempt'
  return data.docs
    .filter((d) => d.status === 'issued' && inRange(d.date, r))
    .filter((d) => (exempt ? d.type === 'receipt' : d.type === 'tax_invoice' || d.type === 'tax_invoice_receipt' || d.type === 'credit_invoice'))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.number ?? 0) - (b.number ?? 0))
}

export function approvedExpensesIn(data: AppData, r: Range) {
  return data.expenses.filter((e) => isApproved(e) && inRange(e.date, r)).sort((a, b) => a.date.localeCompare(b.date))
}

function totals(data: AppData, r: Range) {
  const exempt = data.business.type === 'exempt'
  const docs = incomeDocsIn(data, r)
  const expenses = approvedExpensesIn(data, r)
  return {
    docs,
    expenses,
    income: round2(docs.reduce((s, d) => s + incomeOf(d, data.business.type), 0)),
    outputVat: round2(docs.reduce((s, d) => s + sign(d) * computeTotals(d).vat, 0)),
    spent: round2(expenses.reduce((s, e) => s + (exempt ? e.amount : expenseNet(e)), 0)),
    inputVat: exempt ? 0 : round2(expenses.reduce((s, e) => s + e.vat, 0)),
  }
}

export function buildReport(kind: ReportKind, data: AppData, r: Range): Report {
  const exempt = data.business.type === 'exempt'
  const t = totals(data, r)
  const title = REPORTS.find((x) => x.kind === kind)!.title

  switch (kind) {
    case 'income':
      return {
        title,
        summary: [{ label: exempt ? 'סה״כ הכנסות' : 'סה״כ הכנסות לפני מע״מ', value: t.income, strong: true }],
        columns: ['תאריך', 'סוג מסמך', 'מספר', 'לקוח', 'ח.פ. לקוח', 'לפני מע״מ', 'מע״מ', 'סה״כ'],
        moneyCols: [5, 6, 7],
        rows: t.docs.map((d) => {
          const c = computeTotals(d)
          return [fmtDate(d.date), DOC_META[d.type].label, d.number ?? '', d.customer.name, d.customer.taxId, sign(d) * c.net, sign(d) * c.vat, sign(d) * c.total]
        }),
      }

    case 'expenses':
      return {
        title,
        summary: [{ label: exempt ? 'סה״כ הוצאות' : 'סה״כ הוצאות לפני מע״מ', value: t.spent, strong: true }],
        columns: ['תאריך', 'ספק', 'סוג הוצאה', 'תיאור', 'לפני מע״מ', 'מע״מ', 'סה״כ'],
        moneyCols: [4, 5, 6],
        rows: t.expenses.map((e) => [fmtDate(e.date), e.supplier, e.category, e.description, expenseNet(e), e.vat, e.amount]),
      }

    case 'pnl': {
      const byCat = new Map<string, number>()
      for (const e of t.expenses) byCat.set(e.category, (byCat.get(e.category) ?? 0) + (exempt ? e.amount : expenseNet(e)))
      return {
        title,
        summary: [
          { label: 'הכנסות', value: t.income },
          { label: 'הוצאות', value: -t.spent },
          { label: t.income - t.spent >= 0 ? 'רווח' : 'הפסד', value: round2(t.income - t.spent), strong: true },
        ],
        columns: ['סעיף', 'סכום'],
        moneyCols: [1],
        rows: [
          ['הכנסות', t.income],
          ...[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]): Cell[] => [`הוצאות: ${c}`, -round2(v)]),
          [t.income - t.spent >= 0 ? 'רווח' : 'הפסד', round2(t.income - t.spent)],
        ],
        note: exempt ? undefined : 'הסכומים לפני מע״מ. לא כולל הוצאות פחת והתאמות שרו״ח מבצע בדוח השנתי.',
      }
    }

    case 'vat': {
      const rows = monthsOf(r).map((m): Cell[] => {
        const mt = totals(data, { from: `${m}-01`, to: `${m}-31`, label: m })
        return [monthLabel(m), mt.income, mt.outputVat, mt.spent, mt.inputVat, round2(mt.outputVat - mt.inputVat)]
      })
      const due = round2(t.outputVat - t.inputVat)
      return {
        title,
        summary: [
          { label: 'עסקאות חייבות (לפני מע״מ)', value: t.income },
          { label: 'מע״מ עסקאות', value: t.outputVat },
          { label: 'מע״מ תשומות', value: -t.inputVat },
          { label: due >= 0 ? 'מע״מ לתשלום' : 'מע״מ להחזר', value: Math.abs(due), strong: true },
        ],
        columns: ['חודש', 'עסקאות', 'מע״מ עסקאות', 'תשומות', 'מע״מ תשומות', 'הפרש'],
        moneyCols: [1, 2, 3, 4, 5],
        rows,
        note: 'הערכה לפי המסמכים וההוצאות המאושרות באפליקציה. הדיווח הרשמי — דרך רו״ח או אתר רשות המסים.',
      }
    }

    case 'advances': {
      const rate = data.business.incomeTaxAdvanceRate || 0
      const rows = monthsOf(r).map((m): Cell[] => {
        const turnover = totals(data, { from: `${m}-01`, to: `${m}-31`, label: m }).income
        return [monthLabel(m), turnover, round2((turnover * rate) / 100)]
      })
      return {
        title,
        summary: [
          { label: 'מחזור עסקאות', value: t.income },
          { label: 'שיעור מקדמות', value: rate, percent: true },
          { label: 'מקדמה לתשלום', value: round2((t.income * rate) / 100), strong: true },
        ],
        columns: ['חודש', 'מחזור', 'מקדמה'],
        moneyCols: [1, 2],
        rows,
        note: rate ? 'לפני ניכויים במקור. השיעור נקבע בהגדרות העסק.' : 'שיעור המקדמות לא הוגדר — אפשר לקבוע אותו בפרטי העסק ← הגדרות מס.',
      }
    }

    case 'cashbook': {
      type Line = { date: string; kind: string; details: string; ref: string; inAmt: number; outAmt: number }
      const lines: Line[] = []
      for (const d of data.docs) {
        if (d.status !== 'issued' || !DOC_META[d.type].hasPayments) continue
        for (const p of d.payments) {
          const date = p.date || d.date
          if (inRange(date, r))
            lines.push({ date, kind: 'תקבול', details: `${d.customer.name} · ${paymentLabel(p.method)}`, ref: `${DOC_META[d.type].label} ${d.number}`, inAmt: p.amount, outAmt: 0 })
        }
      }
      for (const e of t.expenses) lines.push({ date: e.date, kind: 'תשלום', details: `${e.supplier || e.description || 'הוצאה'} · ${e.category}`, ref: '', inAmt: 0, outAmt: e.amount })
      lines.sort((a, b) => a.date.localeCompare(b.date) || b.inAmt - a.inAmt)
      let balance = 0
      const rows = lines.map((l): Cell[] => {
        balance = round2(balance + l.inAmt - l.outAmt)
        return [fmtDate(l.date), l.kind, l.details, l.ref, l.inAmt || '', l.outAmt || '', balance]
      })
      const inSum = round2(lines.reduce((s, l) => s + l.inAmt, 0))
      const outSum = round2(lines.reduce((s, l) => s + l.outAmt, 0))
      return {
        title,
        summary: [
          { label: 'תקבולים', value: inSum },
          { label: 'תשלומים', value: -outSum },
          { label: 'יתרה לתקופה', value: round2(inSum - outSum), strong: true },
        ],
        columns: ['תאריך', 'סוג', 'פרטים', 'אסמכתא', 'תקבול', 'תשלום', 'יתרה'],
        moneyCols: [4, 5, 6],
        rows,
      }
    }

    case 'sequence': {
      const rows: Cell[][] = []
      let gapsTotal = 0
      for (const type of allowedDocTypes(data.business.type)) {
        const nums = data.docs.filter((d) => d.type === type && d.status === 'issued' && d.number != null).map((d) => d.number!)
        if (nums.length === 0) continue
        const g = sequenceGaps(nums)
        gapsTotal += g.missing.length + g.duplicates.length
        rows.push([
          DOC_META[type].label,
          Math.min(...nums),
          Math.max(...nums),
          nums.length,
          g.missing.length || g.duplicates.length ? [g.missing.length ? `חסרים: ${compactList(g.missing)}` : '', g.duplicates.length ? `כפולים: ${compactList(g.duplicates)}` : ''].filter(Boolean).join(' · ') : 'תקין ✓',
        ])
      }
      return {
        title,
        summary: [{ label: gapsTotal ? 'נמצאו בעיות במספור' : 'המספור רציף', value: gapsTotal, strong: true }],
        columns: ['סוג מסמך', 'מספר ראשון', 'מספר אחרון', 'כמות', 'מצב'],
        moneyCols: [],
        rows,
        note: 'הבדיקה כוללת את כל המסמכים שהופקו אי פעם, לא רק בתקופה שנבחרה.',
      }
    }
  }
}

export function sequenceGaps(numbers: number[]): { missing: number[]; duplicates: number[] } {
  const sorted = [...numbers].sort((a, b) => a - b)
  const missing: number[] = []
  const duplicates: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) duplicates.push(sorted[i])
    for (let n = sorted[i - 1] + 1; n < sorted[i]; n++) missing.push(n)
  }
  return { missing, duplicates: [...new Set(duplicates)] }
}

function compactList(nums: number[]): string {
  return nums.length > 8 ? `${nums.slice(0, 8).join(', ')} ועוד ${nums.length - 8}` : nums.join(', ')
}

export function reportToCsv(rep: Report): string {
  const lines: Cell[][] = [[rep.title], ...rep.summary.map((s): Cell[] => [s.label, s.value]), [], rep.columns, ...rep.rows]
  return '﻿' + lines.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
}

export const docTypeOrder: DocType[] = DOC_TYPE_ORDER
