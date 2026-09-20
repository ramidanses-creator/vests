import type { Product, ProductTotals } from '../types'

export function expenseAmountInIls(amount: number, currency: 'ILS' | 'USD', usdToIlsRate: number | null): number {
  if (!Number.isFinite(amount)) return 0
  if (currency === 'USD') return amount * (usdToIlsRate ?? 0)
  return amount
}

export function calculateProductTotals(product: Product, usdToIlsRate: number | null): ProductTotals {
  const totalCost = product.expenses.reduce(
    (sum, e) => sum + expenseAmountInIls(e.amount, e.currency, usdToIlsRate),
    0,
  )
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
