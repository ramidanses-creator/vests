import type { Product } from '../types'
import { calculateProductTotals } from '../utils/calculations'

interface Props {
  products: Product[]
  usdToIlsRate: number | null
}

export function InventoryByCategory({ products, usdToIlsRate }: Props) {
  const byCategory = new Map<string, { imported: number; remaining: number }>()

  products.forEach((product) => {
    const category = product.category.trim() || 'ללא קטגוריה'
    const totals = calculateProductTotals(product, usdToIlsRate)
    const entry = byCategory.get(category) ?? { imported: 0, remaining: 0 }
    entry.imported += totals.quantityImported
    entry.remaining += totals.quantityRemaining
    byCategory.set(category, entry)
  })

  const rows = Array.from(byCategory.entries()).sort((a, b) => a[0].localeCompare(b[0], 'he'))

  if (rows.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {rows.map(([category, { imported, remaining }]) => (
        <div
          key={category}
          className="flex flex-wrap items-center justify-between gap-1 rounded-lg bg-white/5 px-3 py-2 text-sm"
        >
          <span className="font-medium text-slate-200">{category}</span>
          <span className="text-slate-400">
            במלאי: <span className="font-semibold text-slate-100">{remaining}</span> מתוך {imported}
          </span>
        </div>
      ))}
    </div>
  )
}
