import { describe, expect, it } from 'vitest'
import type { Doc } from '../types'
import { computeTotals, depositDeductionLines, depositStatus, incomeOf, isOpen, needsAllocation, nextDocNumber } from './docs'

function makeDoc(over: Partial<Doc> = {}): Doc {
  return {
    id: 'd',
    type: 'tax_invoice',
    status: 'issued',
    number: 1,
    date: '2026-11-01',
    customer: { name: 'לקוח', taxId: '', phone: '', email: '', address: '' },
    items: [{ id: 'i', description: 'x', quantity: 2, unitPrice: 50 }],
    pricesIncludeVat: false,
    vatRate: 18,
    discountPercent: 0,
    payments: [],
    description: '',
    notes: '',
    allocationNumber: '',
    closed: false,
    createdAt: '',
    ...over,
  }
}

describe('computeTotals', () => {
  it('adds VAT on top when prices exclude VAT', () => {
    expect(computeTotals(makeDoc())).toMatchObject({ net: 100, vat: 18, total: 118 })
  })

  it('extracts VAT when prices include it', () => {
    const t = computeTotals(makeDoc({ pricesIncludeVat: true, items: [{ id: 'i', description: '', quantity: 1, unitPrice: 118 }] }))
    expect(t).toMatchObject({ net: 100, vat: 18, total: 118 })
  })

  it('applies a percentage discount before VAT', () => {
    expect(computeTotals(makeDoc({ discountPercent: 10 }))).toMatchObject({ discount: 10, net: 90, vat: 16.2, total: 106.2 })
  })

  it('uses the payments as the total for a receipt', () => {
    const t = computeTotals(
      makeDoc({
        type: 'receipt',
        payments: [
          { id: 'p', method: 'cash', amount: 70, date: '', reference: '', installments: 1 },
          { id: 'q', method: 'bit', amount: 30.5, date: '', reference: '', installments: 1 },
        ],
      }),
    )
    expect(t).toMatchObject({ total: 100.5, vat: 0, paid: 100.5 })
  })
})

describe('nextDocNumber', () => {
  it('starts at the configured start number', () => {
    expect(nextDocNumber([], 'receipt', { receipt: 1000 })).toBe(1000)
  })

  it('numbers each document type separately and ignores drafts', () => {
    const docs = [
      makeDoc({ type: 'receipt', number: 1000 }),
      makeDoc({ type: 'receipt', number: 1001 }),
      makeDoc({ type: 'tax_invoice', number: 7 }),
      makeDoc({ type: 'receipt', status: 'draft', number: undefined }),
    ]
    expect(nextDocNumber(docs, 'receipt', { receipt: 1000 })).toBe(1002)
    expect(nextDocNumber(docs, 'tax_invoice', {})).toBe(8)
  })
})

describe('needsAllocation', () => {
  const big = makeDoc({ items: [{ id: 'i', description: '', quantity: 1, unitPrice: 6000 }] })
  it('requires an allocation number for a business customer above the threshold', () => {
    expect(needsAllocation({ ...big, customer: { ...big.customer, taxId: '515555555' } }, 'licensed', 5000)).toBe(true)
  })
  it('does not require one for a private customer, an exempt business or a small amount', () => {
    expect(needsAllocation(big, 'licensed', 5000)).toBe(false)
    expect(needsAllocation({ ...big, customer: { ...big.customer, taxId: '1' } }, 'exempt', 5000)).toBe(false)
    expect(needsAllocation({ ...makeDoc(), customer: { ...big.customer, taxId: '1' } }, 'licensed', 5000)).toBe(false)
  })
})

describe('income and open balances', () => {
  it('counts credit invoices as negative income', () => {
    expect(incomeOf(makeDoc({ type: 'credit_invoice' }), 'licensed')).toBe(-100)
  })
  it('counts only receipts for an exempt business', () => {
    expect(incomeOf(makeDoc(), 'exempt')).toBe(0)
  })
  it('keeps a tax invoice open until it is closed', () => {
    expect(isOpen(makeDoc())).toBe(true)
    expect(isOpen(makeDoc({ closed: true }))).toBe(false)
    expect(isOpen(makeDoc({ type: 'quote' }))).toBe(false)
  })
})

describe('deposits', () => {
  const quote = makeDoc({ id: 'q', type: 'quote', depositAmount: 6000, items: [{ id: 'i', description: 'x', quantity: 1, unitPrice: 20000 }], pricesIncludeVat: true })
  const paid = makeDoc({
    id: 'r',
    type: 'tax_invoice_receipt',
    isDeposit: true,
    relatedDocId: 'q',
    number: 5,
    pricesIncludeVat: true,
    items: [{ id: 'i', description: 'מקדמה', quantity: 1, unitPrice: 4000 }],
  })

  it('tracks how much of the deposit was paid', () => {
    expect(depositStatus([quote, paid], quote)).toEqual({ required: 6000, paid: 4000, remaining: 2000 })
  })

  it('subtracts paid deposits on the final bill, matching its VAT mode', () => {
    const withVat = depositDeductionLines([quote, paid], quote, { pricesIncludeVat: true, vatRate: 18 }, () => 'n')
    expect(withVat).toHaveLength(1)
    expect(withVat[0].unitPrice).toBe(-4000)
    expect(withVat[0].description).toContain('חשבונית מס/קבלה 5')
    const beforeVat = depositDeductionLines([quote, paid], quote, { pricesIncludeVat: false, vatRate: 18 }, () => 'n')
    expect(beforeVat[0].unitPrice).toBe(-3389.83)
  })

  it('ignores ordinary payments and drafts', () => {
    const draft = { ...paid, id: 'd', status: 'draft' as const }
    const normal = { ...paid, id: 'p', isDeposit: false }
    expect(depositStatus([quote, draft, normal], quote).paid).toBe(0)
  })
})
