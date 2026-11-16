import type { BusinessType, Doc, DocType, Expense, PaymentMethod } from '../types'
import { round2 } from './format'

interface DocMeta {
  label: string
  group: 'income' | 'ops'
  hasItems: boolean
  hasPayments: boolean
  /** Documents that leave an open balance until paid. */
  awaitsPayment: boolean
}

export const DOC_META: Record<DocType, DocMeta> = {
  tax_invoice: { label: 'חשבונית מס', group: 'income', hasItems: true, hasPayments: false, awaitsPayment: true },
  tax_invoice_receipt: { label: 'חשבונית מס/קבלה', group: 'income', hasItems: true, hasPayments: true, awaitsPayment: false },
  credit_invoice: { label: 'חשבונית זיכוי', group: 'income', hasItems: true, hasPayments: false, awaitsPayment: false },
  receipt: { label: 'קבלה', group: 'income', hasItems: false, hasPayments: true, awaitsPayment: false },
  deal_invoice: { label: 'חשבון עסקה', group: 'ops', hasItems: true, hasPayments: false, awaitsPayment: true },
  quote: { label: 'הצעת מחיר', group: 'ops', hasItems: true, hasPayments: false, awaitsPayment: false },
}

export const DOC_TYPE_ORDER: DocType[] = [
  'tax_invoice',
  'tax_invoice_receipt',
  'credit_invoice',
  'receipt',
  'deal_invoice',
  'quote',
]

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  licensed: 'עוסק מורשה',
  exempt: 'עוסק פטור',
  company: 'חברה בע״מ',
}

const VAT_DOCS: DocType[] = ['tax_invoice', 'tax_invoice_receipt', 'credit_invoice']

export function allowedDocTypes(bt: BusinessType): DocType[] {
  if (bt === 'exempt') return DOC_TYPE_ORDER.filter((t) => !VAT_DOCS.includes(t))
  return DOC_TYPE_ORDER
}

export function docChargesVat(type: DocType, bt: BusinessType): boolean {
  return bt !== 'exempt' && type !== 'receipt'
}

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; installments?: boolean; refLabel?: string }[] = [
  { id: 'cash', label: 'מזומן' },
  { id: 'credit', label: 'כרטיס אשראי', installments: true, refLabel: '4 ספרות אחרונות' },
  { id: 'bit', label: 'Bit', refLabel: 'אסמכתא' },
  { id: 'paybox', label: 'PayBox', refLabel: 'אסמכתא' },
  { id: 'apple_pay', label: 'Apple Pay', installments: true },
  { id: 'google_pay', label: 'Google Pay', installments: true },
  { id: 'transfer', label: 'העברה בנקאית', refLabel: 'אסמכתא' },
  { id: 'check', label: 'צ׳ק', refLabel: 'מספר צ׳ק' },
  { id: 'other', label: 'אחר', refLabel: 'פירוט' },
]

export const paymentLabel = (m: PaymentMethod) => PAYMENT_METHODS.find((p) => p.id === m)?.label ?? m

export interface Totals {
  /** Sum of lines before discount, as entered. */
  lines: number
  discount: number
  net: number
  vat: number
  total: number
  paid: number
}

export function computeTotals(doc: Pick<Doc, 'type' | 'items' | 'pricesIncludeVat' | 'vatRate' | 'discountPercent' | 'payments'>): Totals {
  const paid = round2(doc.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  if (!DOC_META[doc.type].hasItems) {
    return { lines: paid, discount: 0, net: paid, vat: 0, total: paid, paid }
  }
  const lines = round2(doc.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0))
  const discount = round2((lines * (Number(doc.discountPercent) || 0)) / 100)
  const afterDiscount = lines - discount
  const rate = (Number(doc.vatRate) || 0) / 100
  let net: number
  let vat: number
  let total: number
  if (doc.pricesIncludeVat) {
    total = round2(afterDiscount)
    net = round2(total / (1 + rate))
    vat = round2(total - net)
  } else {
    net = round2(afterDiscount)
    vat = round2(net * rate)
    total = round2(net + vat)
  }
  return { lines, discount, net, vat, total, paid }
}

export function nextDocNumber(docs: Doc[], type: DocType, startNumbers: Partial<Record<DocType, number>>): number {
  const issued = docs.filter((d) => d.type === type && d.status === 'issued' && d.number != null)
  const start = startNumbers[type] ?? 1
  if (issued.length === 0) return start
  return Math.max(start - 1, ...issued.map((d) => d.number!)) + 1
}

/**
 * Tax invoices to a VAT-registered customer above the threshold need an allocation
 * number (מספר הקצאה) from the Tax Authority.
 */
export function needsAllocation(doc: Doc, bt: BusinessType, threshold: number): boolean {
  if (bt === 'exempt') return false
  if (doc.type !== 'tax_invoice' && doc.type !== 'tax_invoice_receipt') return false
  if (!doc.customer.taxId.trim()) return false
  return computeTotals(doc).net >= threshold
}

export function isOpen(doc: Doc): boolean {
  return doc.status === 'issued' && DOC_META[doc.type].awaitsPayment && !doc.closed
}

/** Income recognized by a document (before VAT for VAT-registered businesses). */
export function incomeOf(doc: Doc, bt: BusinessType): number {
  if (doc.status !== 'issued') return 0
  const t = computeTotals(doc)
  if (bt === 'exempt') return doc.type === 'receipt' ? t.total : 0
  if (doc.type === 'tax_invoice' || doc.type === 'tax_invoice_receipt') return t.net
  if (doc.type === 'credit_invoice') return -t.net
  return 0
}

/** Money actually received by a document. */
export function receivedOf(doc: Doc): number {
  if (doc.status !== 'issued') return 0
  if (doc.type !== 'receipt' && doc.type !== 'tax_invoice_receipt') return 0
  return computeTotals(doc).paid
}

export function inRange(dateISO: string, from: string, to: string): boolean {
  const d = dateISO.slice(0, 10)
  return d >= from && d <= to
}

export function expenseNet(e: Expense): number {
  return round2(e.amount - e.vat)
}

export const EXPENSE_CATEGORIES = [
  'ציוד ומלאי',
  'משלוחים',
  'שיווק ופרסום',
  'רכב ודלק',
  'תקשורת ואינטרנט',
  'תוכנה ומנויים',
  'שכירות ומשרד',
  'שירותים מקצועיים',
  'כיבוד ואירוח',
  'אחר',
]

export function docTitle(doc: Doc): string {
  const label = DOC_META[doc.type].label
  return doc.status === 'issued' ? `${label} ${doc.number}` : `${label} (טיוטה)`
}
