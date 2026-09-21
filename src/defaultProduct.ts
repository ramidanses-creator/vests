import type { Product } from './types'

export function generateSku(): string {
  const date = new Date()
  const datePart = `${date.getFullYear().toString().slice(2)}${String(date.getMonth() + 1).padStart(2, '0')}`
  const randomPart = crypto.randomUUID().slice(0, 4).toUpperCase()
  return `M-${datePart}-${randomPart}`
}

export function createDefaultProduct(usdRateOverride: number | null = null): Product {
  return {
    id: crypto.randomUUID(),
    sku: generateSku(),
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
