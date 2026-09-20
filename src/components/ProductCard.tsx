import type { Product } from '../types'
import { calculateProductTotals, formatCurrency } from '../utils/calculations'
import { ExpensesList } from './ExpensesList'
import { SalesList } from './SalesList'

interface Props {
  product: Product
  onChange: (product: Product) => void
  onRemove: () => void
  usdToIlsRate: number | null
}

export function ProductCard({ product, onChange, onRemove, usdToIlsRate }: Props) {
  const totals = calculateProductTotals(product, usdToIlsRate)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="שם המוצר"
            value={product.name}
            onChange={(e) => onChange({ ...product, name: e.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2 text-lg font-semibold"
          />
        </div>
        <button
          onClick={onRemove}
          className="rounded border border-slate-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
        >
          מחק מוצר
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          כמות שיובאה
          <input
            type="number"
            min={0}
            value={product.quantityImported === 0 ? '' : product.quantityImported}
            onChange={(e) => onChange({ ...product, quantityImported: Number(e.target.value) || 0 })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ExpensesList
          expenses={product.expenses}
          onChange={(expenses) => onChange({ ...product, expenses })}
          usdToIlsRate={usdToIlsRate}
        />
        <SalesList sales={product.sales} onChange={(sales) => onChange({ ...product, sales })} />
      </div>

      <textarea
        placeholder="הערות"
        value={product.notes}
        onChange={(e) => onChange({ ...product, notes: e.target.value })}
        className="mt-4 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        rows={2}
      />

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-4">
        <Stat label="סה״כ עלות ייבוא" value={formatCurrency(totals.totalCost)} />
        <Stat label="עלות ליחידה" value={formatCurrency(totals.costPerUnit)} />
        <Stat label="נמכרו / נותרו" value={`${totals.quantitySold} / ${totals.quantityRemaining}`} />
        <Stat label="סה״כ הכנסות" value={formatCurrency(totals.totalRevenue)} />
        <Stat
          label="רווח כולל"
          value={formatCurrency(totals.totalProfit)}
          highlight={totals.totalProfit >= 0 ? 'positive' : 'negative'}
        />
        <Stat label="רווח ליחידה" value={formatCurrency(totals.profitPerUnit)} />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'positive' | 'negative'
}) {
  const color =
    highlight === 'positive' ? 'text-emerald-600' : highlight === 'negative' ? 'text-red-600' : 'text-slate-900'
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )
}
