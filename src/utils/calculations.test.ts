import { describe, expect, it } from 'vitest'
import { createDefaultProduct } from '../defaultProduct'
import type { Sale } from '../types'
import { amountInIls, calculateProductTotals, countInventoryAlerts, isProductLate, saleNetRevenue } from './calculations'

function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: crypto.randomUUID(),
    date: '2026-01-15',
    quantity: 10,
    pricePerUnit: 100,
    returnedQuantity: 0,
    returnReason: null,
    discountType: null,
    discountValue: 0,
    invoiceNumber: '',
    notes: '',
    customerId: null,
    ...overrides,
  }
}

describe('saleNetRevenue', () => {
  it('returns gross revenue with no discount or returns', () => {
    expect(saleNetRevenue(makeSale({ quantity: 5, pricePerUnit: 20 }))).toBe(100)
  })

  it('deducts returned units before applying anything else', () => {
    expect(saleNetRevenue(makeSale({ quantity: 10, pricePerUnit: 10, returnedQuantity: 3 }))).toBe(70)
  })

  it('applies a percent discount on the post-return gross', () => {
    expect(
      saleNetRevenue(makeSale({ quantity: 10, pricePerUnit: 10, discountType: 'percent', discountValue: 10 })),
    ).toBe(90)
  })

  it('applies a fixed-amount discount', () => {
    expect(saleNetRevenue(makeSale({ quantity: 10, pricePerUnit: 10, discountType: 'amount', discountValue: 25 }))).toBe(75)
  })

  it('never goes below zero even if the discount exceeds revenue', () => {
    expect(saleNetRevenue(makeSale({ quantity: 1, pricePerUnit: 10, discountType: 'amount', discountValue: 999 }))).toBe(0)
  })
})

describe('amountInIls', () => {
  it('passes ILS amounts through unchanged', () => {
    expect(amountInIls(50, 'ILS', 3.7)).toBe(50)
  })

  it('converts USD using the given rate', () => {
    expect(amountInIls(10, 'USD', 3.5)).toBe(35)
  })

  it('treats a missing rate as zero for USD amounts', () => {
    expect(amountInIls(10, 'USD', null)).toBe(0)
  })

  it('treats non-finite amounts as zero', () => {
    expect(amountInIls(NaN, 'ILS', 3.7)).toBe(0)
  })
})

describe('calculateProductTotals', () => {
  it('computes cost per unit and suggested price from purchase + expenses', () => {
    const product = createDefaultProduct(3.5)
    product.purchaseCurrency = 'ILS'
    product.purchasePricePerUnit = 10
    product.targetProfitPercent = 50
    product.shipments = [{ id: '1', quantity: 100, arrived: true, expectedDate: '' }]
    product.expenses = [{ id: '2', label: 'משלוח', amount: 500, currency: 'ILS' }]

    const totals = calculateProductTotals(product, null)
    // purchaseTotal = 100*10 = 1000, + 500 expenses = 1500 total cost, /100 units = 15/unit
    expect(totals.totalCost).toBe(1500)
    expect(totals.costPerUnit).toBe(15)
    expect(totals.suggestedSalePrice).toBe(22.5)
  })

  it('excludes restocked-return quantity from quantitySold', () => {
    const product = createDefaultProduct()
    product.shipments = [{ id: '1', quantity: 20, arrived: true, expectedDate: '' }]
    product.sales = [makeSale({ quantity: 10, returnedQuantity: 4, returnReason: 'restocked' })]

    const totals = calculateProductTotals(product, null)
    expect(totals.quantitySold).toBe(6)
  })

  it('counts a damaged return as sold (not restocked)', () => {
    const product = createDefaultProduct()
    product.shipments = [{ id: '1', quantity: 20, arrived: true, expectedDate: '' }]
    product.sales = [makeSale({ quantity: 10, returnedQuantity: 4, returnReason: 'damaged' })]

    const totals = calculateProductTotals(product, null)
    expect(totals.quantitySold).toBe(10)
  })
})

describe('isProductLate', () => {
  it('is false when every shipment has arrived', () => {
    const product = createDefaultProduct()
    product.shipments = [{ id: '1', quantity: 5, arrived: true, expectedDate: '2000-01-01' }]
    expect(isProductLate(product)).toBe(false)
  })

  it('is true for a pending shipment whose expected date is in the past', () => {
    const product = createDefaultProduct()
    product.shipments = [{ id: '1', quantity: 5, arrived: false, expectedDate: '2000-01-01' }]
    expect(isProductLate(product)).toBe(true)
  })

  it('is false for a pending shipment with no expected date set', () => {
    const product = createDefaultProduct()
    product.shipments = [{ id: '1', quantity: 5, arrived: false, expectedDate: '' }]
    expect(isProductLate(product)).toBe(false)
  })
})

describe('countInventoryAlerts', () => {
  it('flags a product with low remaining stock', () => {
    const product = createDefaultProduct()
    product.shipments = [{ id: '1', quantity: 3, arrived: true, expectedDate: '' }]
    expect(countInventoryAlerts([product], null)).toBe(1)
  })

  it('does not flag a healthy-stock product with no late shipments', () => {
    const product = createDefaultProduct()
    product.shipments = [{ id: '1', quantity: 100, arrived: true, expectedDate: '' }]
    expect(countInventoryAlerts([product], null)).toBe(0)
  })
})
