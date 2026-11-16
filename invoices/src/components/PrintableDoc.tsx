import type { Business, Doc } from '../types'
import { BUSINESS_TYPE_LABELS, DOC_META, computeTotals, docChargesVat, paymentLabel } from '../utils/docs'
import { fmt, fmtDate, ils } from '../utils/format'

export function PrintableDoc({ doc, business, relatedTitle, flat = false }: { doc: Doc; business: Business; relatedTitle?: string; flat?: boolean }) {
  const meta = DOC_META[doc.type]
  const t = computeTotals(doc)
  const vat = docChargesVat(doc.type, business.type) && meta.hasItems
  const draft = doc.status === 'draft'

  return (
    <article
      className={`print-sheet relative mx-auto overflow-hidden bg-white text-[13px] leading-relaxed text-ink ${
        flat ? 'w-[794px] p-12' : 'max-w-[800px] rounded-3xl p-6 shadow-sm sm:p-10'
      }`}
    >
      {draft && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-7xl font-black text-ink/5 -rotate-12">טיוטה</div>
      )}
      <header className="flex items-start justify-between gap-4 border-b-2 border-ink pb-5">
        <div className="flex items-start gap-3">
          {business.logo && <img src={business.logo} alt="" className="h-16 w-16 rounded-xl object-contain" />}
          <div>
            <h2 className="text-xl font-bold">{business.name}</h2>
            <p>
              {BUSINESS_TYPE_LABELS[business.type]} {business.taxId}
            </p>
            {business.address && <p>{business.address}</p>}
            <p dir="ltr" className="text-right">
              {[business.phone, business.email].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left">
          <p className="text-lg font-bold">{meta.label}</p>
          <p className="text-2xl font-bold">{draft ? '—' : `מס׳ ${doc.number}`}</p>
          <p className="mt-1 inline-block rounded-md bg-mist px-2 text-xs">{draft ? 'טיוטה — לא בתוקף' : 'מקור'}</p>
        </div>
      </header>

      <section className="mt-5 flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-ink-soft">לכבוד</p>
          <p className="text-base font-semibold">{doc.customer.name}</p>
          {doc.customer.taxId && <p>ח.פ./ע.מ.: {doc.customer.taxId}</p>}
          {doc.customer.address && <p>{doc.customer.address}</p>}
          {(doc.customer.phone || doc.customer.email) && (
            <p dir="ltr" className="text-right">
              {[doc.customer.phone, doc.customer.email].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="text-left">
          <p>תאריך: {fmtDate(doc.date)}</p>
          {doc.dueDate && <p>{doc.type === 'quote' ? 'בתוקף עד' : 'לתשלום עד'}: {fmtDate(doc.dueDate)}</p>}
          {relatedTitle && <p>מסמך מקושר: {relatedTitle}</p>}
        </div>
      </section>

      {doc.description && <p className="mt-4 rounded-xl bg-mist px-4 py-2 font-medium">{doc.description}</p>}

      {meta.hasItems && (
        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr className="border-b border-line text-ink-soft">
              <th className="py-2 text-right font-medium">#</th>
              <th className="py-2 text-right font-medium">תיאור</th>
              <th className="py-2 text-center font-medium">כמות</th>
              <th className="py-2 text-left font-medium">מחיר</th>
              <th className="py-2 text-left font-medium">סה״כ</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((i, idx) => (
              <tr key={i.id} className="border-b border-line/70 align-top">
                <td className="py-2">{idx + 1}</td>
                <td className="py-2">{i.description}</td>
                <td className="py-2 text-center">{fmt(i.quantity)}</td>
                <td className="py-2 text-left">{ils(i.unitPrice)}</td>
                <td className="py-2 text-left">{ils(i.quantity * i.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {meta.hasItems && (
        <div className="mr-auto mt-4 w-full max-w-72 space-y-1">
          {vat && doc.pricesIncludeVat && <p className="text-xs text-ink-soft">המחירים כוללים מע״מ</p>}
          {t.discount > 0 && <Row label={`הנחה ${fmt(doc.discountPercent)}%`} value={`−${ils(t.discount)}`} />}
          {vat && <Row label="סה״כ לפני מע״מ" value={ils(t.net)} />}
          {vat && <Row label={`מע״מ ${doc.vatRate}%`} value={ils(t.vat)} />}
          <div className="flex justify-between border-t-2 border-ink pt-2 text-base font-bold">
            <span>{doc.type === 'credit_invoice' ? 'סה״כ זיכוי' : 'סה״כ'}</span>
            <span>{ils(t.total)}</span>
          </div>
        </div>
      )}

      {meta.hasPayments && doc.payments.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 font-bold">פירוט תקבולים</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th className="py-2 text-right font-medium">אמצעי תשלום</th>
                <th className="py-2 text-right font-medium">פרטים</th>
                <th className="py-2 text-right font-medium">תאריך</th>
                <th className="py-2 text-left font-medium">סכום</th>
              </tr>
            </thead>
            <tbody>
              {doc.payments.map((p) => (
                <tr key={p.id} className="border-b border-line/70">
                  <td className="py-2">{paymentLabel(p.method)}</td>
                  <td className="py-2">
                    {[p.reference, p.installments > 1 ? `${p.installments} תשלומים` : ''].filter(Boolean).join(' · ')}
                  </td>
                  <td className="py-2">{fmtDate(p.date)}</td>
                  <td className="py-2 text-left">{ils(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mr-auto mt-2 flex w-full max-w-72 justify-between border-t-2 border-ink pt-2 text-base font-bold">
            <span>סה״כ שולם</span>
            <span>{ils(t.paid)}</span>
          </div>
        </section>
      )}

      {doc.allocationNumber && (
        <p className="mt-5">
          מספר הקצאה: <span dir="ltr">{doc.allocationNumber}</span>
        </p>
      )}
      {doc.notes && <p className="mt-4 whitespace-pre-wrap rounded-xl border border-line p-3">{doc.notes}</p>}
      {business.footerNote && <p className="mt-4 whitespace-pre-wrap text-ink-soft">{business.footerNote}</p>}

      <footer className="mt-8 flex justify-between border-t border-line pt-3 text-xs text-ink-soft">
        <span>מסמך ממוחשב</span>
        {doc.issuedAt && <span>הופק {new Date(doc.issuedAt).toLocaleString('he-IL')}</span>}
      </footer>
    </article>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-soft">{label}</span>
      <span>{value}</span>
    </div>
  )
}
