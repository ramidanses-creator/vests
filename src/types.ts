export interface Expense {
  id: string
  label: string
  amount: number
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
  quantityImported: number
  expenses: Expense[]
  sales: Sale[]
  notes: string
}

export interface ProductTotals {
  totalCost: number
  costPerUnit: number
  quantitySold: number
  quantityRemaining: number
  totalRevenue: number
  totalProfit: number
  profitPerUnit: number
}
