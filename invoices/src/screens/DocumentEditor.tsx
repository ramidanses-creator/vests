import { useMemo, useRef, useState } from 'react'
import { CustomerField } from '../components/CustomerField'
import { Button, Card, Field, Icon, NumberInput, Radio, Sheet, TopBar, Toggle, inputCls } from '../components/ui'
import { back, replace } from '../router'
import { emptyDoc, useStore } from '../store'
import type { CatalogItem, Doc, DocType, LineItem, Payment, PaymentMethod } from '../types'
import {
  DOC_META,
  PAYMENT_METHODS,
  allowedDocTypes,
  DEPOSIT_DOC_TYPES,
  computeTotals,
  depositDeductionLines,
  depositStatus,
  docChargesVat,
  docTitle,
  needsAllocation,
} from '../utils/docs'
import { compressImage, readAsDataUrl } from '../utils/fileStore'
import { fmt, ils, round2, todayISO, uid } from '../utils/format'

interface Props {
  mode: 'new' | 'edit'
  param?: string
  query: URLSearchParams
}

function newPayment(amount = 0): Payment {
  return { id: uid(), method: 'cash', amount, date: todayISO(), reference: '', installments: 1 }
}

function buildInitial(props: Props, docs: Doc[], data: ReturnType<typeof useStore>['data']): Doc | null {
  const { business, customers } = data
  if (props.mode === 'edit') {
    const d = docs.find((x) => x.id === props.param)
    return d && d.status === 'draft' ? structuredClone(d) : null
  }
  const type = props.param as DocType
  if (!allowedDocTypes(business.type).includes(type)) return null
  let doc = emptyDoc(type, business)

  const customerId = props.query.get('customer')
  const cust = customers.find((c) => c.id === customerId)
  if (cust) {
    doc.customerId = cust.id
    doc.customer = { name: cust.name, taxId: cust.taxId, phone: cust.phone, email: cust.email, address: cust.address }
  }

  const from = docs.find((d) => d.id === props.query.get('from'))
  const how = props.query.get('how')
  if (from) {
    const base = {
      customer: { ...from.customer },
      customerId: from.customerId,
      relatedDocId: from.id,
    }
    const ft = computeTotals(from)
    if (how === 'duplicate') {
      doc = { ...structuredClone(from), id: uid(), status: 'draft', number: undefined, issuedAt: undefined, date: todayISO(), payments: [], relatedDocId: undefined, closed: false, allocationNumber: '', createdAt: new Date().toISOString() }
    } else if (how === 'deposit') {
      const { remaining } = depositStatus(docs, from)
      const label = `מקדמה עבור ${docTitle(from)}`
      doc = { ...doc, ...base, isDeposit: true, description: label }
      if (DOC_META[type].hasItems) {
        doc.items = [{ id: uid(), description: label, quantity: 1, unitPrice: remaining }]
        doc.pricesIncludeVat = true
      } else doc.payments = [newPayment(remaining)]
    } else if (type === 'receipt') {
      const paidBefore = docs
        .filter((d) => d.status === 'issued' && d.relatedDocId === from.id)
        .reduce((s, d) => s + computeTotals(d).total, 0)
      doc = { ...doc, ...base, description: `תשלום עבור ${docTitle(from)}`, payments: [newPayment(round2(Math.max(0, ft.total - paidBefore)))] }
    } else {
      doc = {
        ...doc,
        ...base,
        items: from.items.map((i) => ({ ...i, id: uid() })),
        pricesIncludeVat: from.pricesIncludeVat,
        discountPercent: from.discountPercent,
        description: type === 'credit_invoice' ? `זיכוי עבור ${docTitle(from)}` : from.description,
        notes: from.notes,
      }
      // Final bill after a deposit: subtract what was already paid up front.
      if (type !== 'credit_invoice') doc.items = [...doc.items, ...depositDeductionLines(docs, from, doc, uid)]
    }
  }

  if (DOC_META[type].hasPayments && doc.payments.length === 0) doc.payments = [newPayment()]
  return doc
}

export function DocumentEditor(props: Props) {
  const { data, saveDraft, issueDoc, deleteDraft } = useStore()
  const { business } = data
  const [doc, setDoc] = useState<Doc | null>(() => buildInitial(props, data.docs, data))
  // While on, the single payment of a tax invoice/receipt follows the total.
  const [autoPay, setAutoPay] = useState(() => props.mode === 'new' && doc?.type === 'tax_invoice_receipt')
  const [errors, setErrors] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const totals = useMemo(() => (doc ? computeTotals(doc) : null), [doc])

  if (!doc || !totals) {
    return (
      <div>
        <TopBar title="מסמך" />
        <p className="p-8 text-center text-ink-soft">המסמך לא נמצא או שכבר הופק ואינו ניתן לעריכה.</p>
      </div>
    )
  }

  const meta = DOC_META[doc.type]
  const chargesVat = docChargesVat(doc.type, business.type)
  const allocationNeeded = needsAllocation(doc, business.type, business.allocationThreshold)
  const effectiveTotals = autoPay ? { ...totals, paid: totals.total } : totals

  function update(patch: Partial<Doc>) {
    setDoc((d) => (d ? { ...d, ...patch } : d))
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    setDoc((d) => (d ? { ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) } : d))
  }

  function updatePayment(id: string, patch: Partial<Payment>) {
    if ('amount' in patch) setAutoPay(false)
    setDoc((d) => (d ? { ...d, payments: d.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)) } : d))
  }

  function switchType(type: DocType) {
    setDoc((d) => {
      if (!d) return d
      const next = { ...d, type, vatRate: docChargesVat(type, business.type) ? business.vatRate : 0 }
      if (DOC_META[type].hasPayments && next.payments.length === 0) next.payments = [newPayment()]
      return next
    })
    if (type === 'tax_invoice_receipt' && doc!.payments.length <= 1) setAutoPay(true)
  }

  /** The document as it will be stored, with auto-filled payment applied. */
  function finalDoc(): Doc {
    let d = doc!
    if (!meta.hasItems) d = { ...d, items: [] }
    if (!meta.hasPayments) d = { ...d, payments: [] }
    if (autoPay && d.payments.length === 1) d = { ...d, payments: [{ ...d.payments[0], amount: totals!.total }] }
    return d
  }

  function validate(d: Doc): string[] {
    const errs: string[] = []
    const t = computeTotals(d)
    if (!d.customer.name.trim()) errs.push('יש למלא שם לקוח')
    if (!d.date) errs.push('יש לבחור תאריך')
    if (meta.hasItems) {
      const valid = d.items.filter((i) => i.description.trim() && i.quantity * i.unitPrice > 0)
      if (valid.length === 0) errs.push('יש להוסיף לפחות פריט אחד עם תיאור וסכום')
      if (d.items.some((i) => !i.description.trim() && i.unitPrice > 0)) errs.push('לכל פריט צריך תיאור')
    }
    if (meta.hasPayments) {
      if (d.payments.some((p) => !(p.amount > 0))) errs.push('לכל תשלום צריך סכום גדול מאפס')
      if (d.type === 'tax_invoice_receipt' && Math.abs(t.paid - t.total) > 0.01)
        errs.push(`סכום התשלומים (${ils(t.paid)}) צריך להיות שווה לסה״כ המסמך (${ils(t.total)})`)
    }
    return errs
  }

  function handleSaveDraft() {
    saveDraft(finalDoc())
    back('/income')
  }

  function handleIssueClick() {
    const errs = validate(finalDoc())
    setErrors(errs)
    if (errs.length === 0) setConfirmOpen(true)
    else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  function handleIssue() {
    const final = finalDoc()
    // Clean empty item rows before issuing.
    const issued = issueDoc({ ...final, items: final.items.filter((i) => i.description.trim() || i.unitPrice) })
    replace(`/doc/${issued.id}?fresh=1`)
  }

  const typeChoices = allowedDocTypes(business.type).filter((t) => DOC_META[t].group === meta.group && !doc.relatedDocId)

  return (
    <div className="min-h-dvh bg-lavender-bg pb-44">
      <TopBar
        title={props.mode === 'edit' ? `עריכת ${meta.label}` : meta.label}
        tone="plum"
        right={
          props.mode === 'edit' ? (
            <button
              onClick={() => {
                if (confirm('למחוק את הטיוטה?')) {
                  deleteDraft(doc.id)
                  back('/income')
                }
              }}
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
              aria-label="מחיקת טיוטה"
            >
              <Icon name="trash" />
            </button>
          ) : undefined
        }
      />
      <div className="h-6 bg-plum" />
      <div className="-mt-6 space-y-3 px-3">
        {typeChoices.length > 1 && (
          <Card>
            <h2 className="mb-2 text-lg font-bold">סוג מסמך</h2>
            <div className="grid grid-cols-2 gap-x-2" role="radiogroup">
              {typeChoices.map((t) => (
                <Radio key={t} checked={doc.type === t} onChange={() => switchType(t)} label={DOC_META[t].label} />
              ))}
            </div>
          </Card>
        )}

        <Card className="space-y-4">
          <h2 className="text-lg font-bold">לקוח ותאריך</h2>
          <CustomerField
            customer={doc.customer}
            customerId={doc.customerId}
            onChange={(customer, customerId) => update({ customer, customerId })}
            allowWalkIn={meta.hasPayments}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="תאריך המסמך">
              <input type="date" value={doc.date} onChange={(e) => update({ date: e.target.value })} className={inputCls} />
            </Field>
            {(doc.type === 'tax_invoice' || doc.type === 'deal_invoice' || doc.type === 'quote') && (
              <Field label={doc.type === 'quote' ? 'בתוקף עד' : 'לתשלום עד'}>
                <input type="date" value={doc.dueDate ?? ''} onChange={(e) => update({ dueDate: e.target.value || undefined })} className={inputCls} />
              </Field>
            )}
          </div>
        </Card>

        {meta.hasItems && (
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">פריטים</h2>
              <span className="text-sm text-ink-soft">{doc.items.length} שורות</span>
            </div>
            {doc.items.map((item, idx) => (
              <div key={item.id} className="space-y-2 rounded-2xl bg-mist p-3">
                <div className="flex items-center gap-2">
                  <ItemImageButton
                    index={idx}
                    image={item.image}
                    onChange={(image) => updateItem(item.id, { image })}
                  />
                  <ItemDescriptionInput
                    value={item.description}
                    onChange={(description) => updateItem(item.id, { description })}
                    onPick={(c) => updateItem(item.id, { description: c.name, unitPrice: c.price, image: c.image ?? item.image })}
                  />
                  {doc.items.length > 1 && (
                    <button
                      onClick={() => update({ items: doc.items.filter((i) => i.id !== item.id) })}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-white"
                      aria-label="הסרת פריט"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_1.4fr_1.2fr] items-end gap-2 pr-14">
                  <Field label="כמות">
                    <NumberInput value={item.quantity} onChange={(quantity) => updateItem(item.id, { quantity })} placeholder="1" />
                  </Field>
                  <Field label={`מחיר ליח׳${chargesVat ? (doc.pricesIncludeVat ? ' (כולל מע״מ)' : ' (לפני מע״מ)') : ''}`}>
                    <NumberInput value={item.unitPrice} onChange={(unitPrice) => updateItem(item.id, { unitPrice })} />
                  </Field>
                  <div className="pb-3 text-left font-semibold">{ils(item.quantity * item.unitPrice)}</div>
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => update({ items: [...doc.items, { id: uid(), description: '', quantity: 1, unitPrice: 0 }] })}
            >
              <Icon name="plus" size={18} /> הוספת פריט
            </Button>
            <div className="space-y-3 border-t border-line pt-4">
              {chargesVat && (
                <Toggle checked={doc.pricesIncludeVat} onChange={(pricesIncludeVat) => update({ pricesIncludeVat })} label="המחירים כוללים מע״מ" />
              )}
              <div className="flex items-center justify-between gap-3">
                <span>הנחה (%)</span>
                <NumberInput value={doc.discountPercent} onChange={(discountPercent) => update({ discountPercent: Math.min(100, Math.max(0, discountPercent)) })} className="max-w-28" />
              </div>
            </div>
          </Card>
        )}

        {meta.hasPayments && (
          <Card className="space-y-4">
            {!meta.hasItems && (
              <Field label="עבור">
                <input value={doc.description} onChange={(e) => update({ description: e.target.value })} placeholder="לדוגמה: תשלום עבור שיעור פרטי" className={inputCls} />
              </Field>
            )}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">בחירת אמצעי תשלום</h2>
              <CardsArt className="-my-2 -ml-2 h-16 w-24 shrink-0" />
            </div>
            {doc.payments.map((p, idx) => (
              <PaymentEditor
                key={p.id}
                payment={p}
                index={idx}
                count={doc.payments.length}
                amount={autoPay && doc.payments.length === 1 ? totals.total : p.amount}
                onChange={(patch) => updatePayment(p.id, patch)}
                onRemove={() => update({ payments: doc.payments.filter((x) => x.id !== p.id) })}
              />
            ))}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                const remaining = meta.hasItems ? round2(totals.total - effectiveTotals.paid) : 0
                if (autoPay) {
                  setAutoPay(false)
                  update({ payments: [...doc.payments.map((x) => ({ ...x, amount: totals.total })), newPayment(0)] })
                } else update({ payments: [...doc.payments, newPayment(Math.max(0, remaining))] })
              }}
            >
              <Icon name="plus" size={18} /> פיצול לאמצעי תשלום נוסף
            </Button>
          </Card>
        )}

        <Card className="space-y-4">
          <h2 className="text-lg font-bold">פרטים נוספים</h2>
          {meta.hasItems && (
            <Field label="תיאור כללי (יופיע בראש המסמך)">
              <input value={doc.description} onChange={(e) => update({ description: e.target.value })} className={inputCls} />
            </Field>
          )}
          {DEPOSIT_DOC_TYPES.includes(doc.type) && (
            <div className="space-y-2 rounded-2xl bg-lime/50 p-3">
              <Field label="מקדמה נדרשת (₪, כולל מע״מ)" hint={doc.depositAmount ? `יתרה אחרי המקדמה: ${ils(Math.max(0, totals.total - doc.depositAmount))}` : 'אופציונלי — יופיע על המסמך שהלקוח מקבל'}>
                <NumberInput value={doc.depositAmount ?? 0} onChange={(v) => update({ depositAmount: v > 0 ? round2(v) : undefined })} />
              </Field>
              <div className="flex gap-2">
                {[30, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => update({ depositAmount: round2((totals.total * pct) / 100) || undefined })}
                    className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium"
                  >
                    {pct}%
                  </button>
                ))}
                {doc.depositAmount ? (
                  <button type="button" onClick={() => update({ depositAmount: undefined })} className="px-2 text-sm text-ink-soft underline">
                    ללא מקדמה
                  </button>
                ) : null}
              </div>
            </div>
          )}
          <Field label="הערות (יופיעו בתחתית המסמך)">
            <textarea value={doc.notes} onChange={(e) => update({ notes: e.target.value })} rows={2} className={inputCls} />
          </Field>
          {(allocationNeeded || doc.allocationNumber) && (
            <Field
              label="מספר הקצאה מרשות המסים"
              hint={
                allocationNeeded
                  ? `נדרש לחשבונית מס ללקוח עוסק בסכום של ${fmt(business.allocationThreshold)} ₪ ומעלה (לפני מע״מ). מקבלים אותו באזור האישי באתר רשות המסים או דרך תוכנה מאושרת.`
                  : undefined
              }
            >
              <input value={doc.allocationNumber} onChange={(e) => update({ allocationNumber: e.target.value })} inputMode="numeric" dir="ltr" className={`${inputCls} text-right`} />
            </Field>
          )}
        </Card>

        {errors.length > 0 && (
          <div className="rounded-2xl bg-peach p-4 text-orange" role="alert">
            {errors.map((e) => (
              <p key={e}>• {e}</p>
            ))}
          </div>
        )}
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg rounded-t-3xl bg-white px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-4 shadow-[0_-8px_30px_rgba(15,27,61,0.12)]">
        <TotalsLines totals={effectiveTotals} chargesVat={chargesVat && meta.hasItems} vatRate={doc.vatRate} hasPayments={meta.hasPayments && meta.hasItems} />
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" onClick={handleSaveDraft} className="flex-1">
            שמירת טיוטה
          </Button>
          <Button onClick={handleIssueClick} className="flex-[1.6] !bg-plum">
            הפקת {meta.label}
          </Button>
        </div>
      </div>

      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title={`הפקת ${meta.label}`}>
        <div className="space-y-4">
          <div className="rounded-2xl bg-lavender p-4">
            <p className="text-ink-soft">{doc.customer.name}</p>
            <p className="mt-1 text-3xl font-semibold">{ils(totals.total)}</p>
          </div>
          {allocationNeeded && !doc.allocationNumber.trim() && (
            <p className="rounded-xl bg-peach p-3 text-sm text-orange">
              שימו לב: לא הוזן מספר הקצאה. הלקוח עלול לא להיות רשאי לקזז את המע״מ בחשבונית הזו.
            </p>
          )}
          <p className="text-ink-soft">
            לאחר ההפקה המסמך יקבל מספר רץ ולא ניתן יהיה לערוך או למחוק אותו. לתיקון מפיקים מסמך מבטל (למשל חשבונית זיכוי).
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} className="flex-1">
              חזרה לעריכה
            </Button>
            <Button onClick={handleIssue} className="flex-[1.5] !bg-plum">
              <Icon name="check" size={20} /> הפקה
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}

function PaymentEditor({
  payment,
  index,
  count,
  amount,
  onChange,
  onRemove,
}: {
  payment: Payment
  index: number
  count: number
  amount: number
  onChange: (patch: Partial<Payment>) => void
  onRemove: () => void
}) {
  const method = PAYMENT_METHODS.find((m) => m.id === payment.method)!
  return (
    <div className={`space-y-3 ${count > 1 ? 'rounded-2xl bg-mist p-3' : ''}`}>
      {count > 1 && (
        <div className="flex items-center justify-between">
          <span className="font-semibold">תשלום {index + 1}</span>
          <button onClick={onRemove} className="text-sm text-orange">
            הסרה
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-2" role="radiogroup" aria-label="אמצעי תשלום">
        {PAYMENT_METHODS.map((m) => (
          <Radio key={m.id} checked={payment.method === m.id} onChange={() => onChange({ method: m.id as PaymentMethod, installments: 1 })} label={m.label} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="סכום">
          <NumberInput value={amount} onChange={(v) => onChange({ amount: v })} />
        </Field>
        <Field label="תאריך התשלום">
          <input type="date" value={payment.date} onChange={(e) => onChange({ date: e.target.value })} className={inputCls} />
        </Field>
        {method.installments && (
          <Field label="מספר תשלומים">
            <div className="relative">
              <select
                value={payment.installments}
                onChange={(e) => onChange({ installments: Number(e.target.value) })}
                className={`${inputCls} appearance-none`}
              >
                {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </Field>
        )}
        {method.refLabel && (
          <Field label={method.refLabel}>
            <input value={payment.reference} onChange={(e) => onChange({ reference: e.target.value })} dir="ltr" className={`${inputCls} text-right`} />
          </Field>
        )}
      </div>
    </div>
  )
}

export function TotalsLines({
  totals,
  chargesVat,
  vatRate,
  hasPayments,
}: {
  totals: ReturnType<typeof computeTotals>
  chargesVat: boolean
  vatRate: number
  hasPayments: boolean
}) {
  return (
    <div className="space-y-1 text-sm">
      {totals.discount > 0 && (
        <div className="flex justify-between text-ink-soft">
          <span>הנחה</span>
          <span>−{ils(totals.discount)}</span>
        </div>
      )}
      {chargesVat && (
        <>
          <div className="flex justify-between text-ink-soft">
            <span>לפני מע״מ</span>
            <span>{ils(totals.net)}</span>
          </div>
          <div className="flex justify-between text-ink-soft">
            <span>מע״מ {vatRate}%</span>
            <span>{ils(totals.vat)}</span>
          </div>
        </>
      )}
      <div className="flex items-baseline justify-between text-ink">
        <span className="text-base font-semibold">סה״כ לתשלום</span>
        <span className="text-2xl font-bold">{ils(totals.total)}</span>
      </div>
      {hasPayments && Math.abs(totals.paid - totals.total) > 0.01 && (
        <div className="flex justify-between text-orange">
          <span>שולם</span>
          <span>{ils(totals.paid)}</span>
        </div>
      )}
    </div>
  )
}

function CardsArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 100" className={className} aria-hidden="true">
      <g transform="rotate(-22 60 50)">
        <rect x="10" y="20" width="90" height="56" rx="8" fill="#c9bff7" />
        <rect x="10" y="32" width="90" height="10" fill="#7a2266" />
      </g>
      <g transform="rotate(-12 95 60)">
        <rect x="48" y="34" width="92" height="58" rx="8" fill="#fff4bf" />
        <rect x="112" y="44" width="18" height="13" rx="3" fill="#ffd84d" />
        <rect x="60" y="78" width="26" height="4" rx="2" fill="#ffd84d" />
      </g>
    </svg>
  )
}

/** Square button at the start of an item row: adds a product photo, or shows it with options to replace/remove. */
function ItemImageButton({ index, image, onChange }: { index: number; image?: string; onChange: (image: string | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [menu, setMenu] = useState(false)
  const [busy, setBusy] = useState(false)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      onChange(await readAsDataUrl(await compressImage(f, 400, 0.7)))
    } finally {
      setBusy(false)
      setMenu(false)
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => (image ? setMenu((v) => !v) : input.current?.click())}
        className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-ink/20 bg-white text-ink-soft"
        aria-label={image ? `תמונת פריט ${index + 1}` : `הוספת תמונה לפריט ${index + 1}`}
      >
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : busy ? (
          <span className="text-xs">…</span>
        ) : (
          <Icon name="camera" size={20} />
        )}
      </button>
      {menu && image && (
        <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          <button type="button" onClick={() => input.current?.click()} className="block w-full px-3 py-2.5 text-right text-sm hover:bg-mist">
            החלפת תמונה
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(undefined)
              setMenu(false)
            }}
            className="block w-full px-3 py-2.5 text-right text-sm text-orange hover:bg-mist"
          >
            הסרת תמונה
          </button>
        </div>
      )}
      <input ref={input} type="file" accept="image/*" onChange={pick} className="hidden" />
    </div>
  )
}

/** Item description with suggestions from the saved items catalog. */
function ItemDescriptionInput({ value, onChange, onPick }: { value: string; onChange: (v: string) => void; onPick: (c: CatalogItem) => void }) {
  const { data } = useStore()
  const [focused, setFocused] = useState(false)
  const q = value.trim()
  const matches = data.items.filter((c) => !q || (c.name.includes(q) && c.name !== q)).slice(0, 6)
  return (
    <div className="relative min-w-0 flex-1">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => {
          setFocused(true)
          // Make room for the suggestions above the totals bar at the bottom.
          if (data.items.length) e.currentTarget.scrollIntoView({ block: 'start', behavior: 'smooth' })
        }}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        style={{ scrollMarginTop: 90 }}
        placeholder={data.items.length ? 'תיאור, או בחירה מהפריטים' : 'תיאור הפריט / השירות'}
        className={inputCls}
        aria-label="תיאור"
        autoComplete="off"
      />
      {focused && matches.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-white shadow-lg">
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(c)
                setFocused(false)
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-right hover:bg-mist"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-lavender">
                {c.image ? <img src={c.image} alt="" className="h-full w-full object-cover" /> : <Icon name="receipt" size={16} />}
              </span>
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span className="text-sm font-medium">{ils(c.price)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
