import type { Product, ProductTotals } from '../types'

export function calculateProductTotals(product: Product): ProductTotals {
  const totalCost = product.expenses.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0)
  const costPerUnit = product.quantityImported > 0 ? totalCost / product.quantityImported : 0

  const quantitySold = product.sales.reduce((sum, s) => sum + s.quantity, 0)
  const totalRevenue = product.sales.reduce((sum, s) => sum + s.quantity * s.pricePerUnit, 0)
  const totalCostOfSold = quantitySold * costPerUnit
  const totalProfit = totalRevenue - totalCostOfSold
  const profitPerUnit = quantitySold > 0 ? totalProfit / quantitySold : 0
  const quantityRemaining = product.quantityImported - quantitySold

  return {
    totalCost,
    costPerUnit,
    quantitySold,
    quantityRemaining,
    totalRevenue,
    totalProfit,
    profitPerUnit,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0,
  )
}
