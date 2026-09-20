import type { Product } from '../types'
import { calculateProductTotals } from '../utils/calculations'
import { ShipmentsList } from './ShipmentsList'

interface Props {
  products: Product[]
  onChange: (product: Product) => void
  usdToIlsRate: number | null
}

export function InventoryPage({ products, onChange, usdToIlsRate }: Props) {
  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-sm text-slate-500">
        אין מוצרים עדיין.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {products.map((product) => {
        const totals = calculateProductTotals(product, usdToIlsRate)
        return (
          <div key={product.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-100">{product.name || 'מוצר ללא שם'}</h3>
              <span className="text-xs text-slate-400">
                הוזמן: <span className="font-semibold text-slate-200">{totals.quantityImported}</span> · הגיע:{' '}
                <span className="font-semibold text-emerald-400">{totals.quantityArrived}</span> · ממתין:{' '}
                <span className="font-semibold text-amber-400">{totals.quantityPending}</span> · נמכר:{' '}
                <span className="font-semibold text-slate-200">{totals.quantitySold}</span> · במלאי:{' '}
                <span className="font-semibold text-slate-200">{totals.quantityRemaining}</span>
              </span>
            </div>
            <ShipmentsList shipments={product.shipments} onChange={(shipments) => onChange({ ...product, shipments })} />
          </div>
        )
      })}
    </div>
  )
}
