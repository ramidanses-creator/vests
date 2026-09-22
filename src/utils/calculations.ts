import type { Currency, Product, ProductTotals, Sale } from '../types'

export function saleNetRevenue(sale: Sale): number {
  const netQty = sale.quantity - sale.returnedQuantity
  const gross = netQty * sale.pricePerUnit
  if (!sale.discountType || sale.discountValue <= 0) return gross
  const discount = sale.discountType === 'percent' ? gross * (sale.discountValue / 100) : sale.discountValue
  return Math.max(0, gross - discount)
}

export function amountInIls(amount: number, currency: Currency, usdToIlsRate: number | null): number {
  if (!Number.isFinite(amount)) return 0
  if (currency === 'USD') return amount * (usdToIlsRate ?? 0)
  return amount
}

export const expenseAmountInIls = amountInIls

export function calculateProductTotals(product: Product, fallbackUsdToIlsRate: number | null): ProductTotals {
  const usdToIlsRate = product.usdRateOverride ?? fallbackUsdToIlsRate

  const quantityImported = product.shipments.reduce((sum, s) => sum + s.quantity, 0)
  const quantityArrived = product.shipments.reduce((sum, s) => sum + (s.arrived ? s.quantity : 0), 0)
  const quantityPending = Math.max(0, quantityImported - quantityArrived)

  const purchaseTotal = amountInIls(quantityImported * product.purchasePricePerUnit, product.purchaseCurrency, usdToIlsRate)
  const otherExpenses = product.expenses.reduce(
    (sum, e) => sum + amountInIls(e.amount, e.currency, usdToIlsRate),
    0,
  )
  const totalCost = purchaseTotal + otherExpenses
  const costPerUnit = quantityImported > 0 ? totalCost / quantityImported : 0
  const suggestedSalePrice = costPerUnit * (1 + product.targetProfitPercent / 100)
  const expectedProfit = (suggestedSalePrice - costPerUnit) * quantityImported

  const quantitySold = product.sales.reduce(
    (sum, s) => sum + (s.returnReason === 'restocked' ? s.quantity - s.returnedQuantity : s.quantity),
    0,
  )
  const totalRevenue = product.sales.reduce((sum, s) => sum + saleNetRevenue(s), 0)
  const totalCostOfSold = quantitySold * costPerUnit
  const totalProfit = totalRevenue - totalCostOfSold
  const profitPerUnit = quantitySold > 0 ? totalProfit / quantitySold : 0
  const quantityRemaining = quantityArrived - quantitySold

  return {
    quantityImported,
    quantityArrived,
    quantityPending,
    purchaseTotal,
    totalCost,
    costPerUnit,
    suggestedSalePrice,
    expectedProfit,
    quantitySold,
    quantityRemaining,
    totalRevenue,
    totalProfit,
    profitPerUnit,
  }
}

const LOW_STOCK_THRESHOLD = 5

export function isProductLate(product: Product): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return product.shipments.some((s) => !s.arrived && s.expectedDate && s.expectedDate < today)
}

export function countInventoryAlerts(products: Product[], usdToIlsRate: number | null): number {
  return products.reduce((count, product) => {
    const totals = calculateProductTotals(product, usdToIlsRate)
    const lowOrOut = totals.quantityRemaining <= LOW_STOCK_THRESHOLD
    return count + (lowOrOut || isProductLate(product) ? 1 : 0)
  }, 0)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0,
  )
}
