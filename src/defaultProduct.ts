import type { Product } from './types'

export function createDefaultProduct(): Product {
  return {
    id: crypto.randomUUID(),
    name: '',
    quantityImported: 0,
    expenses: [
      { id: crypto.randomUUID(), label: 'עלות רכישה', amount: 0 },
      { id: crypto.randomUUID(), label: 'משלוח', amount: 0 },
      { id: crypto.randomUUID(), label: 'מכס', amount: 0 },
    ],
    sales: [],
    notes: '',
  }
}
