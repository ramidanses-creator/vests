import { useState } from 'react'
import type { Product } from '../types'
import { calculateProductTotals, isProductLate } from '../utils/calculations'
import { ShipmentsList } from './ShipmentsList'

interface Props {
  products: Product[]
  onChange: (product: Product) => void
  usdToIlsRate: number | null
}

const LOW_STOCK_THRESHOLD = 5

type SortMode = 'default' | 'lowStock' | 'urgent'

function nextExpectedShipment(product: Product) {
  const pending = product.shipments
    .filter((s) => !s.arrived && s.expectedDate)
    .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate))
  return pending[0] ?? null
}

export function InventoryPage({ products, onChange, usdToIlsRate }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('default')

  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
        אין מוצרים עדיין.
      </p>
    )
  }

  const expandedProduct = products.find((p) => p.id === expandedId) ?? null

  const rows = products.map((product) => {
    const totals = calculateProductTotals(product, usdToIlsRate)
    const nextShipment = nextExpectedShipment(product)
    const late = isProductLate(product)
    const lowStock = totals.quantityRemaining > 0 && totals.quantityRemaining <= LOW_STOCK_THRESHOLD
    const outOfStock = totals.quantityRemaining <= 0
    return { product, totals, nextShipment, late, lowStock, outOfStock }
  })

  const sortedRows = [...rows].sort((a, b) => {
    if (sortMode === 'lowStock') return a.totals.quantityRemaining - b.totals.quantityRemaining
    if (sortMode === 'urgent') {
      if (a.late !== b.late) return a.late ? -1 : 1
      const aDate = a.nextShipment?.expectedDate ?? '9999'
      const bDate = b.nextShipment?.expectedDate ?? '9999'
      return aDate.localeCompare(bDate)
    }
    return 0
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500">מיון:</span>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-slate-200 focus:border-amber-400 focus:outline-none"
        >
          <option value="default">ברירת מחדל</option>
          <option value="lowStock">מלאי נמוך תחילה</option>
          <option value="urgent">הכי דחוף להגיע</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sortedRows.map(({ product, totals, late, lowStock, outOfStock }) => {
          const isExpanded = expandedId === product.id
          return (
            <button
              key={product.id}
              onClick={() => setExpandedId(isExpanded ? null : product.id)}
              className={`flex flex-col items-start gap-1.5 rounded-xl border bg-[#1a1b20] p-3 text-right transition-transform duration-200 ease-out ${
                late ? 'border-rose-700/60' : 'border-white/10'
              } ${isExpanded ? 'scale-105 ring-2 ring-amber-400/60' : 'scale-100 hover:scale-[1.02]'}`}
            >
              <h3 className="line-clamp-2 text-sm font-semibold text-slate-100">{product.name || 'מוצר ללא שם'}</h3>
              <span className="font-mono text-[10px] text-slate-500">{product.sku}</span>
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
              <div className="flex flex-wrap gap-1">
                {late && (
                  <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] text-rose-300">⏰ באיחור</span>
                )}
                {outOfStock && (
                  <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] text-rose-300">אזל המלאי</span>
                )}
                {!outOfStock && lowStock && (
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300">
                    מלאי נמוך
                  </span>
                )}
              </div>
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
