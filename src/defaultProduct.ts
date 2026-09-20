import type { Product } from './types'

export function createDefaultProduct(): Product {
  return {
    id: crypto.randomUUID(),
    name: '',
    category: '',
    quantityImported: 0,
    purchasePricePerUnit: 0,
    purchaseCurrency: 'USD',
    targetProfitPercent: 20,
    status: 'active',
    hasArrived: true,
    expectedArrivalDate: '',
    expenses: [
      { id: crypto.randomUUID(), label: 'משלוח', amount: 0, currency: 'ILS' },
      { id: crypto.randomUUID(), label: 'מכס', amount: 0, currency: 'ILS' },
    ],
    sales: [],
    notes: '',
  }
}
