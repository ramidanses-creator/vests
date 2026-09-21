import { useState } from 'react'
import type { Product } from '../types'
import { calculateProductTotals, formatCurrency } from '../utils/calculations'
import { SalesList } from './SalesList'

interface Props {
  products: Product[]
  onChange: (product: Product) => void
  usdToIlsRate: number | null
}

export function SalesCenter({ products, onChange, usdToIlsRate }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
        אין מוצרים עדיין.
      </p>
    )
  }

  const expandedProduct = products.find((p) => p.id === expandedId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {products.map((product) => {
          const totals = calculateProductTotals(product, usdToIlsRate)
          const isExpanded = expandedId === product.id
          return (
            <button
              key={product.id}
              onClick={() => setExpandedId(isExpanded ? null : product.id)}
              className={`flex flex-col items-start gap-1.5 rounded-xl border border-white/10 bg-[#1a1b20] p-3 text-right transition-transform duration-200 ease-out ${
                isExpanded ? 'scale-105 ring-2 ring-rose-400/60' : 'scale-100 hover:scale-[1.02]'
              }`}
            >
              <h3 className="line-clamp-2 text-sm font-semibold text-slate-100">{product.name || 'מוצר ללא שם'}</h3>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                <span>
                  נמכר: <span className="font-semibold text-slate-200">{totals.quantitySold}</span>
                </span>
                <span>
                  במלאי: <span className="font-semibold text-slate-200">{totals.quantityRemaining}</span>
                </span>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                  totals.totalRevenue > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-slate-400'
                }`}
              >
                הכנסות: {formatCurrency(totals.totalRevenue)}
              </span>
            </button>
          )
        })}
      </div>

      {expandedProduct && (
        <div className="animate-[grow_200ms_ease-out] origin-top rounded-xl border border-white/10 bg-[#1a1b20] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-100">{expandedProduct.name || 'מוצר ללא שם'}</h3>
            <button onClick={() => setExpandedId(null)} className="text-xs text-slate-500 hover:text-slate-300">
              סגור
            </button>
          </div>
          <SalesList sales={expandedProduct.sales} onChange={(sales) => onChange({ ...expandedProduct, sales })} />
        </div>
      )}
    </div>
  )
}
