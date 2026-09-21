import { useState } from 'react'
import type { Product } from '../types'
import { calculateProductTotals } from '../utils/calculations'
import { ShipmentsList } from './ShipmentsList'

interface Props {
  products: Product[]
  onChange: (product: Product) => void
  usdToIlsRate: number | null
}

function nextExpectedArrival(product: Product): string | null {
  const pending = product.shipments
    .filter((s) => !s.arrived && s.expectedDate)
    .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate))
  if (pending.length === 0) return null
  return new Date(pending[0].expectedDate).toLocaleDateString('he-IL')
}

export function InventoryPage({ products, onChange, usdToIlsRate }: Props) {
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
          const arrival = nextExpectedArrival(product)
          const isExpanded = expandedId === product.id
          return (
            <button
              key={product.id}
              onClick={() => setExpandedId(isExpanded ? null : product.id)}
              className={`flex flex-col items-start gap-1.5 rounded-xl border border-white/10 bg-[#1a1b20] p-3 text-right transition-transform duration-200 ease-out ${
                isExpanded ? 'scale-105 ring-2 ring-amber-400/60' : 'scale-100 hover:scale-[1.02]'
              }`}
            >
              <h3 className="line-clamp-2 text-sm font-semibold text-slate-100">{product.name || 'מוצר ללא שם'}</h3>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                <span>
                  הוזמן: <span className="font-semibold text-slate-200">{totals.quantityImported}</span>
                </span>
                <span>
                  הגיע: <span className="font-semibold text-emerald-400">{totals.quantityArrived}</span>
                </span>
                <span>
                  ממתין: <span className="font-semibold text-amber-400">{totals.quantityPending}</span>
                </span>
                <span>
                  במלאי: <span className="font-semibold text-slate-200">{totals.quantityRemaining}</span>
                </span>
              </div>
              {arrival && (
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                  צפוי: {arrival}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {expandedProduct && (
        <div className="animate-[grow_200ms_ease-out] rounded-xl border border-white/10 bg-[#1a1b20] p-4 origin-top">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-100">{expandedProduct.name || 'מוצר ללא שם'}</h3>
            <button onClick={() => setExpandedId(null)} className="text-xs text-slate-500 hover:text-slate-300">
              סגור
            </button>
          </div>
          <ShipmentsList
            shipments={expandedProduct.shipments}
            onChange={(shipments) => onChange({ ...expandedProduct, shipments })}
          />
        </div>
      )}
    </div>
  )
}
