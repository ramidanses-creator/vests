import { go } from '../router'
import type { Doc } from '../types'
import { DOC_META, computeTotals, isOpen } from '../utils/docs'
import { fmtDate, ils } from '../utils/format'

const TYPE_TONE: Record<Doc['type'], string> = {
  tax_invoice: 'bg-sky',
  tax_invoice_receipt: 'bg-lime',
  credit_invoice: 'bg-peach',
  receipt: 'bg-lavender',
  deal_invoice: 'bg-sky',
  quote: 'bg-mist',
}

export function DocRow({ doc }: { doc: Doc }) {
  const t = computeTotals(doc)
  const draft = doc.status === 'draft'
  return (
    <button
      onClick={() => go(draft ? `/edit/${doc.id}` : `/doc/${doc.id}`)}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-right transition hover:bg-mist"
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-bold text-ink ${TYPE_TONE[doc.type]}`}>
        {draft ? '—' : doc.number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{doc.customer.name || 'ללא לקוח'}</span>
        <span className="block truncate text-sm text-ink-soft">
          {DOC_META[doc.type].label} · {fmtDate(doc.date)}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className={`font-semibold ${doc.type === 'credit_invoice' ? 'text-orange' : 'text-ink'}`}>
          {doc.type === 'credit_invoice' ? '−' : ''}
          {ils(t.total)}
        </span>
        {draft && <span className="rounded-md bg-mist px-2 py-0.5 text-xs text-ink-soft">טיוטה</span>}
        {isOpen(doc) && <span className="rounded-md bg-peach px-2 py-0.5 text-xs text-orange">פתוח</span>}
      </span>
    </button>
  )
}
