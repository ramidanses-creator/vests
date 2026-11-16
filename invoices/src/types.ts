export type BusinessType = 'licensed' | 'exempt' | 'company'

export type DocType =
  | 'tax_invoice'
  | 'tax_invoice_receipt'
  | 'credit_invoice'
  | 'receipt'
  | 'deal_invoice'
  | 'quote'

export type PaymentMethod =
  | 'cash'
  | 'credit'
  | 'bit'
  | 'paybox'
  | 'apple_pay'
  | 'google_pay'
  | 'transfer'
  | 'check'
  | 'other'

export interface Business {
  name: string
  ownerName: string
  type: BusinessType
  taxId: string
  address: string
  phone: string
  email: string
  logo?: string
  vatRate: number
  /** Net amount (before VAT) from which a Tax Authority allocation number is required. */
  allocationThreshold: number
  accountantEmail: string
  footerNote: string
  startNumbers: Partial<Record<DocType, number>>
  /** How often VAT and income-tax advances are reported. */
  vatPeriod: 'monthly' | 'bimonthly'
  /** Income-tax advance rate (% of turnover) set by the Tax Authority. */
  incomeTaxAdvanceRate: number
}

export interface CustomerDetails {
  name: string
  taxId: string
  phone: string
  email: string
  address: string
}

export interface Customer extends CustomerDetails {
  id: string
  createdAt: string
}

export interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  /** Small product photo (JPEG data URL), shown on the document and in its PDF. */
  image?: string
}

export interface Payment {
  id: string
  method: PaymentMethod
  amount: number
  date: string
  reference: string
  installments: number
}

export type DocStatus = 'draft' | 'issued'

export interface Doc {
  id: string
  type: DocType
  status: DocStatus
  number?: number
  issuedAt?: string
  date: string
  dueDate?: string
  customerId?: string
  customer: CustomerDetails
  items: LineItem[]
  pricesIncludeVat: boolean
  vatRate: number
  discountPercent: number
  payments: Payment[]
  description: string
  notes: string
  allocationNumber: string
  relatedDocId?: string
  /** Advance the customer is asked to pay up front (incl. VAT), on quotes / deal invoices / tax invoices. */
  depositAmount?: number
  /** This document records a deposit paid against `relatedDocId`. */
  isDeposit?: boolean
  /** For documents that await payment (tax invoice / deal invoice): marked paid. */
  closed: boolean
  createdAt: string
}

export type ExpenseStatus = 'pending' | 'approved'

export interface Expense {
  id: string
  /** Uploaded expenses wait for approval; only approved ones count in reports. Missing = approved (older data). */
  status?: ExpenseStatus
  /** Created automatically from a recurring expense type for this month (YYYY-MM). */
  recurringTypeId?: string
  recurringMonth?: string
  date: string
  supplier: string
  description: string
  category: string
  amount: number
  vat: number
  fileId?: string
  fileType?: string
  createdAt: string
}

/** A product or service kept for quick reuse on documents. */
export interface CatalogItem {
  id: string
  name: string
  price: number
  image?: string
  createdAt: string
}

export interface Supplier {
  id: string
  name: string
  taxId: string
  phone: string
  email: string
  createdAt: string
}

/** A user-defined expense category, optionally a fixed monthly expense created automatically. */
export interface ExpenseType {
  id: string
  name: string
  recurring: boolean
  monthlyAmount: number
  dayOfMonth: number
  supplier: string
  createdAt: string
}

export interface AppData {
  business: Business
  customers: Customer[]
  docs: Doc[]
  expenses: Expense[]
  items: CatalogItem[]
  suppliers: Supplier[]
  expenseTypes: ExpenseType[]
}

export type ListKey = 'customers' | 'expenses' | 'items' | 'suppliers' | 'expenseTypes'
