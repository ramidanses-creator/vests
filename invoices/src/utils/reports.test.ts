import { describe, expect, it } from 'vitest'
import type { AppData, Doc } from '../types'
import { buildReport, periodRange, sequenceGaps, shiftPeriod, toMode } from './reports'

const business: AppData['business'] = { name: 'ע', ownerName: '', type: 'licensed', taxId: '1', address: '', phone: '', email: '', vatRate: 18, allocationThreshold: 5000, accountantEmail: '', footerNote: '', startNumbers: {}, vatPeriod: 'bimonthly', incomeTaxAdvanceRate: 5 }

function doc(o: Partial<Doc>): Doc {
  const date = o.date ?? '2026-11-05'
  return { id: Math.random().toString(), type: 'tax_invoice_receipt', status: 'issued', number: 1, date: '2026-11-05', customer: { name: 'לקוח', taxId: '', phone: '', email: '', address: '' }, items: [{ id: 'i', description: 'x', quantity: 1, unitPrice: 1180 }], pricesIncludeVat: true, vatRate: 18, discountPercent: 0, payments: [{ id: 'p', method: 'cash', amount: 1180, date, reference: '', installments: 1 }], description: '', notes: '', allocationNumber: '', closed: false, createdAt: '', ...o }
}

const data: AppData = {
  business,
  customers: [],
  docs: [doc({}), doc({ number: 2, date: '2026-12-01' }), doc({ number: 4, date: '2026-11-20' })],
  expenses: [
    { id: 'e1', date: '2026-11-10', supplier: 'ספק', description: '', category: 'משלוחים', amount: 236, vat: 36, createdAt: '' },
    { id: 'e2', date: '2026-11-11', supplier: 'ספק', description: '', category: 'משלוחים', amount: 999, vat: 0, createdAt: '', status: 'pending' },
  ],
  items: [],
  suppliers: [],
  expenseTypes: [],
}

describe('periods', () => {
  it('maps a month to its two-month VAT period', () => {
    expect(toMode('2026-12', 'bimonth', '2026-12-01')).toBe('2026-11b')
    expect(periodRange('2026-11b')).toMatchObject({ from: '2026-11-01', to: '2026-12-31', label: 'נובמבר–דצמבר 2026' })
    expect(shiftPeriod('2026-11b', 1)).toBe('2027-01b')
    expect(shiftPeriod('2026-01b', -1)).toBe('2025-11b')
  })
})

describe('reports', () => {
  const nov = periodRange('2026-11')
  it('VAT: output minus input, approved expenses only', () => {
    const rep = buildReport('vat', data, nov)
    expect(rep.summary.find((s) => s.strong)).toMatchObject({ label: 'מע״מ לתשלום', value: 360 - 36 })
  })
  it('income-tax advances use the configured rate on turnover', () => {
    const rep = buildReport('advances', data, nov)
    expect(rep.summary.at(-1)!.value).toBe(100) // 2,000 turnover × 5%
  })
  it('cashbook keeps a running balance', () => {
    const rep = buildReport('cashbook', data, nov)
    expect(rep.rows.map((r) => r.at(-1))).toEqual([1180, 944, 2124]) // 5/11 in, 10/11 out, 20/11 in; the December receipt is outside the period
  })
  it('sequence report finds the missing number', () => {
    const rep = buildReport('sequence', data, nov)
    expect(String(rep.rows[0][4])).toContain('חסרים: 3')
    expect(sequenceGaps([1, 2, 2, 5])).toEqual({ missing: [3, 4], duplicates: [2] })
  })
})
