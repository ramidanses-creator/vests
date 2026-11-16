// Builds the monthly folder for the accountant: every approved expense file, a PDF of
// every document issued in the period, and the reports as Excel-friendly CSV files.
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { fetchCloudFile } from '../cloud'
import { PrintableDoc } from '../components/PrintableDoc'
import type { AppData, Doc } from '../types'
import { DOC_META, docTitle } from './docs'
import { getFile } from './fileStore'
import { renderPdf } from './pdf'
import { approvedExpensesIn, buildReport, inRange, reportToCsv, type Range, type ReportKind } from './reports'

const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }

/** Draws one document off-screen and turns it into a PDF. */
async function docPdf(doc: Doc, data: AppData): Promise<Uint8Array> {
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;top:0;left:-10000px;pointer-events:none'
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    const related = data.docs.find((d) => d.id === doc.relatedDocId)
    root.render(createElement(PrintableDoc, { doc, business: data.business, relatedTitle: related ? docTitle(related) : undefined, flat: true }))
    await new Promise((r) => setTimeout(r, 60))
    await Promise.all([...host.querySelectorAll('img')].map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))))
    const file = await renderPdf(host.firstElementChild as HTMLElement, 'doc.pdf')
    return new Uint8Array(await file.arrayBuffer())
  } finally {
    root.unmount()
    host.remove()
  }
}

export interface ZipProgress {
  done: number
  total: number
}

export function zipContents(data: AppData, range: Range) {
  const expenses = approvedExpensesIn(data, range)
  const docs = data.docs
    .filter((d) => d.status === 'issued' && inRange(d.date, range))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.number ?? 0) - (b.number ?? 0))
  const pending = data.expenses.filter((e) => e.status === 'pending' && inRange(e.date, range)).length
  return { expenses, docs, pending, files: expenses.filter((e) => e.fileId).length }
}

export async function buildAccountantZip(data: AppData, range: Range, onProgress: (p: ZipProgress) => void): Promise<File> {
  const { zipSync, strToU8 } = await import('fflate')
  const { expenses, docs } = zipContents(data, range)
  const entries: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {}
  const used = new Set<string>()
  const add = (path: string, bytes: Uint8Array, store: boolean) => {
    let name = path
    for (let i = 2; used.has(name); i++) name = path.replace(/(\.[^.]+)$/, ` (${i})$1`)
    used.add(name)
    entries[name] = store ? [bytes, { level: 0 }] : bytes
  }

  const withFiles = expenses.filter((e) => e.fileId)
  const total = withFiles.length + docs.length
  let done = 0
  onProgress({ done, total })

  for (const e of withFiles) {
    const blob = (await getFile(e.fileId!).catch(() => undefined)) ?? (await fetchCloudFile(e.fileId!).catch(() => undefined))
    if (blob) {
      const ext = EXT[blob.type] ?? 'jpg'
      add(`הוצאות/${e.date} ${clean(e.supplier || e.category)} ${e.amount}₪.${ext}`, new Uint8Array(await blob.arrayBuffer()), true)
    }
    onProgress({ done: ++done, total })
  }

  for (const d of docs) {
    const folder = DOC_META[d.type].group === 'income' ? 'מסמכי הכנסות' : 'מסמכי ניהול שוטף'
    add(`${folder}/${d.date} ${clean(DOC_META[d.type].label)} ${d.number} ${clean(d.customer.name)}.pdf`, await docPdf(d, data), true)
    onProgress({ done: ++done, total })
  }

  const kinds: ReportKind[] = data.business.type === 'exempt' ? ['income', 'expenses', 'pnl', 'cashbook'] : ['income', 'expenses', 'vat', 'pnl', 'cashbook']
  for (const k of kinds) {
    const rep = buildReport(k, data, range)
    add(`דוחות/${rep.title}.csv`, strToU8(reportToCsv(rep)), false)
  }

  const zipped = zipSync(entries as Parameters<typeof zipSync>[0])
  const name = `תיקיית רו״ח - ${clean(range.label)} - ${clean(data.business.name)}.zip`
  return new File([zipped], name, { type: 'application/zip' })
}
