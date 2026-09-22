export type Currency = 'ILS' | 'USD'
export type ProductStatus = 'active' | 'standby'
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'הזמנה חדשה',
  standby: 'רשומים במערכת',
}

export interface Expense {
  id: string
  label: string
  amount: number
  currency: Currency
}

export type ReturnReason = 'restocked' | 'damaged'
export type DiscountType = 'amount' | 'percent'

export interface Sale {
  id: string
  date: string
  quantity: number
  pricePerUnit: number
  returnedQuantity: number
  returnReason: ReturnReason | null
  discountType: DiscountType | null
  discountValue: number
  invoiceNumber: string
  notes: string
}

export interface Shipment {
  id: string
  quantity: number
  arrived: boolean
  expectedDate: string
}

export interface Product {
  id: string
  sku: string
  name: string
  category: string
  purchasePricePerUnit: number
  purchaseCurrency: Currency
  usdRateOverride: number | null
  targetProfitPercent: number
  status: ProductStatus
  shipments: Shipment[]
  expenses: Expense[]
  sales: Sale[]
  notes: string
}

export interface DeletedProduct {
  product: Product
  deletedAt: string
}

export interface MarketingExpense {
  id: string
  date: string
  label: string
  amount: number
  currency: Currency
}

export interface ProductTotals {
  quantityImported: number
  quantityArrived: number
  quantityPending: number
  purchaseTotal: number
  totalCost: number
  costPerUnit: number
  suggestedSalePrice: number
  expectedProfit: number
  quantitySold: number
  quantityRemaining: number
  totalRevenue: number
  totalProfit: number
  profitPerUnit: number
}
