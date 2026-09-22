import { createDefaultProduct, generateSku } from '../defaultProduct'
import type { Customer, DeletedProduct, MarketingExpense, Product } from '../types'

export const STORAGE_KEY = 'import-tracker-products'
export const TRASH_KEY = 'import-tracker-deleted-products'
export const SEEN_REMOTE_IDS_KEY = 'import-tracker-seen-remote-ids'
export const MARKETING_KEY = 'import-tracker-marketing-expenses'
export const CUSTOMERS_KEY = 'import-tracker-customers'
export const AUTO_BACKUP_KEY_PREFIX = 'import-tracker-auto-backup-'
export const AUTO_BACKUP_DAYS_KEPT = 7

export function loadSeenRemoteIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_REMOTE_IDS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function saveSeenRemoteIds(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_REMOTE_IDS_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // ignore storage failures
  }
}

export function normalizeProduct(
  raw: Partial<Product> & { quantityImported?: number; hasArrived?: boolean; expectedArrivalDate?: string },
): Product {
  const fallback = createDefaultProduct()
  const shipments =
    raw.shipments ??
    (raw.quantityImported !== undefined
      ? [
          {
            id: crypto.randomUUID(),
            quantity: raw.quantityImported,
            arrived: raw.hasArrived ?? true,
            expectedDate: raw.expectedArrivalDate ?? '',
          },
        ]
      : fallback.shipments)
  return {
    ...fallback,
    ...raw,
    sku: raw.sku ?? generateSku(),
    category: raw.category ?? fallback.category,
    purchasePricePerUnit: raw.purchasePricePerUnit ?? fallback.purchasePricePerUnit,
    purchaseCurrency: raw.purchaseCurrency ?? fallback.purchaseCurrency,
    usdRateOverride: raw.usdRateOverride ?? null,
    targetProfitPercent: raw.targetProfitPercent ?? fallback.targetProfitPercent,
    status: raw.status ?? fallback.status,
    shipments,
    expenses: raw.expenses ?? fallback.expenses,
    sales: (raw.sales ?? fallback.sales).map((s) => {
      const legacy = s as typeof s & { returned?: boolean }
      return {
        ...s,
        returnedQuantity: s.returnedQuantity ?? (legacy.returned ? s.quantity : 0),
        returnReason: s.returnReason ?? null,
        discountType: s.discountType ?? null,
        discountValue: s.discountValue ?? 0,
        invoiceNumber: s.invoiceNumber ?? '',
        notes: s.notes ?? '',
        customerId: s.customerId ?? null,
      }
    }),
  }
}

export function normalizeMarketingExpense(raw: Partial<MarketingExpense>): MarketingExpense {
  return {
    id: raw.id ?? crypto.randomUUID(),
    date: raw.date ?? '',
    label: raw.label ?? '',
    amount: raw.amount ?? 0,
    currency: raw.currency ?? 'ILS',
    recurring: raw.recurring ?? false,
  }
}

export function normalizeCustomer(raw: Partial<Customer>): Customer {
  return {
    id: raw.id ?? crypto.randomUUID(),
    name: raw.name ?? '',
    phone: raw.phone ?? '',
    email: raw.email ?? '',
    address: raw.address ?? '',
    notes: raw.notes ?? '',
    createdAt: raw.createdAt ?? new Date().toISOString(),
  }
}

export function isEmptyDraft(p: Product): boolean {
  return (
    p.name.trim() === '' &&
    p.category.trim() === '' &&
    p.purchasePricePerUnit === 0 &&
    p.notes.trim() === '' &&
    p.sales.length === 0 &&
    p.shipments.every((s) => s.quantity === 0) &&
    p.expenses.every((e) => e.amount === 0)
  )
}

// Untouched "new order" drafts are never persisted — only kept in memory
// until the user either fills them in or navigates away.
export function withoutEmptyDrafts(products: Product[]): Product[] {
  return products.filter((p) => !isEmptyDraft(p))
}

export function loadProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<Product>[]
    return parsed.map(normalizeProduct)
  } catch {
    return []
  }
}

export function saveProducts(products: Product[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutEmptyDrafts(products)))
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
}

export function loadDeleted(): DeletedProduct[] {
  try {
    const raw = localStorage.getItem(TRASH_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { product: Partial<Product>; deletedAt: string }[]
    return parsed.map((d) => ({ product: normalizeProduct(d.product), deletedAt: d.deletedAt }))
  } catch {
    return []
  }
}

export function saveDeleted(deleted: DeletedProduct[]) {
  try {
    localStorage.setItem(TRASH_KEY, JSON.stringify(deleted))
  } catch {
    // ignore storage failures
  }
}

export function loadMarketingExpenses(): MarketingExpense[] {
  try {
    const raw = localStorage.getItem(MARKETING_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<MarketingExpense>[]
    return parsed.map(normalizeMarketingExpense)
  } catch {
    return []
  }
}

export function saveMarketingExpenses(expenses: MarketingExpense[]) {
  try {
    localStorage.setItem(MARKETING_KEY, JSON.stringify(expenses))
  } catch {
    // ignore storage failures
  }
}

export function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<Customer>[]
    return parsed.map(normalizeCustomer)
  } catch {
    return []
  }
}

export function saveCustomers(customers: Customer[]) {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers))
  } catch {
    // ignore storage failures
  }
}

// Keeps one rotating snapshot per calendar day (last AUTO_BACKUP_DAYS_KEPT days)
// so a bad edit or a sync mishap can be recovered from without any server round-trip.
export function writeAutoBackupIfNeeded(
  products: Product[],
  deleted: DeletedProduct[],
  marketingExpenses: MarketingExpense[],
  customers: Customer[],
) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const todayKey = `${AUTO_BACKUP_KEY_PREFIX}${today}`
    if (localStorage.getItem(todayKey)) return
    localStorage.setItem(
      todayKey,
      JSON.stringify({ products: withoutEmptyDrafts(products), deleted, marketingExpenses, customers, savedAt: Date.now() }),
    )
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(AUTO_BACKUP_KEY_PREFIX))
    keys
      .sort()
      .slice(0, Math.max(0, keys.length - AUTO_BACKUP_DAYS_KEPT))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore storage failures
  }
}

export function latestAutoBackupDate(): string | null {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(AUTO_BACKUP_KEY_PREFIX))
    if (keys.length === 0) return null
    return keys.sort().at(-1)!.slice(AUTO_BACKUP_KEY_PREFIX.length)
  } catch {
    return null
  }
}
