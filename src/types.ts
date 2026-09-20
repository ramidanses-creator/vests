export type Currency = 'ILS' | 'USD'
export type ProductStatus = 'active' | 'standby'
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'פעילים',
  standby: 'רשומים במערכת',
}

export interface Expense {
  id: string
  label: string
  amount: number
  currency: Currency
}

export interface Sale {
  id: string
  date: string
  quantity: number
  pricePerUnit: number
}

export interface Product {
  id: string
  name: string
  category: string
  quantityImported: number
  purchasePricePerUnit: number
  purchaseCurrency: Currency
  targetProfitPercent: number
  status: ProductStatus
  expenses: Expense[]
  sales: Sale[]
  notes: string
}

export interface ProductTotals {
  purchaseTotal: number
  totalCost: number
  costPerUnit: number
  suggestedSalePrice: number
  quantitySold: number
  quantityRemaining: number
  totalRevenue: number
  totalProfit: number
  profitPerUnit: number
}
