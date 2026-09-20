import type { Product } from './types'

export function createDefaultProduct(usdRateOverride: number | null = null): Product {
  return {
    id: crypto.randomUUID(),
    name: '',
    category: '',
    purchasePricePerUnit: 0,
    purchaseCurrency: 'USD',
    usdRateOverride,
    targetProfitPercent: 20,
    status: 'active',
    shipments: [{ id: crypto.randomUUID(), quantity: 0, arrived: true, expectedDate: '' }],
    expenses: [
      { id: crypto.randomUUID(), label: 'משלוח', amount: 0, currency: 'ILS' },
      { id: crypto.randomUUID(), label: 'מכס', amount: 0, currency: 'ILS' },
    ],
    sales: [],
    notes: '',
  }
}
