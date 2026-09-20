import type { Product } from '../types'
import { calculateProductTotals, formatCurrency } from '../utils/calculations'
import { ExpensesList } from './ExpensesList'
import { SalesList } from './SalesList'

interface Props {
  product: Product
  onChange: (product: Product) => void
  onRemove: () => void
  usdToIlsRate: number | null
  categoryOptions: string[]
}

export function ProductCard({ product, onChange, onRemove, usdToIlsRate, categoryOptions }: Props) {
  const totals = calculateProductTotals(product, usdToIlsRate)
  const inSystem = product.status === 'standby'

  function toggleStatus() {
    onChange({ ...product, status: inSystem ? 'active' : 'standby' })
  }

  function toggleArrived() {
    onChange({ ...product, hasArrived: !product.hasArrived })
  }

  return (
    <div className={`rounded-xl border p-4 shadow-lg shadow-black/20 ${inSystem ? 'border-sky-800 bg-sky-950/20' : 'border-slate-800 bg-slate-900'}`}>
      {!product.hasArrived && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-800 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
          <span>🚚 טרם הגיע לארץ</span>
          {product.expectedArrivalDate && <span>· צפי הגעה: {product.expectedArrivalDate}</span>}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="שם המוצר"
            value={product.name}
            onChange={(e) => onChange({ ...product, name: e.target.value })}
            className="w-full flex-1 rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-lg font-semibold text-slate-100"
          />
          <input
            type="text"
            list="category-options"
            placeholder="קטגוריה"
            value={product.category}
            onChange={(e) => onChange({ ...product, category: e.target.value })}
            className="w-full rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 sm:w-40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleArrived}
            className={`whitespace-nowrap rounded border px-3 py-2 text-xs ${
              product.hasArrived
                ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50'
                : 'border-amber-800 bg-amber-950/30 text-amber-300 hover:bg-amber-950/50'
            }`}
          >
            {product.hasArrived ? '✓ הגיע לארץ' : 'טרם הגיע — סמנו כשהגיע'}
          </button>
          {!product.hasArrived && (
            <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
              צפי הגעה
              <input
                type="date"
                value={product.expectedArrivalDate}
                onChange={(e) => onChange({ ...product, expectedArrivalDate: e.target.value })}
                className="bg-transparent text-slate-100"
              />
            </label>
          )}
          <button
            onClick={toggleStatus}
            className={`whitespace-nowrap rounded border px-3 py-2 text-xs ${
              inSystem
                ? 'border-sky-800 bg-sky-950/30 text-sky-300 hover:bg-sky-950/50'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {inSystem ? '✓ רשום במערכת — לחצו להחזיר לפעילים' : 'סמן כרשום במערכת'}
          </button>
          <button
            onClick={onRemove}
            className="rounded border border-slate-700 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40"
          >
            מחק מוצר
          </button>
        </div>
      </div>

      <datalist id="category-options">
        {categoryOptions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          כמות שיובאה
          <input
            type="number"
            min={0}
            value={product.quantityImported === 0 ? '' : product.quantityImported}
            onChange={(e) => onChange({ ...product, quantityImported: Number(e.target.value) || 0 })}
            className="rounded border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          מחיר רכישה ליחידה
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              value={product.purchasePricePerUnit === 0 ? '' : product.purchasePricePerUnit}
              onChange={(e) => onChange({ ...product, purchasePricePerUnit: Number(e.target.value) || 0 })}
              className="w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100"
            />
            <div className="flex overflow-hidden rounded border border-slate-700 text-xs">
              <button
                onClick={() => onChange({ ...product, purchaseCurrency: 'ILS' })}
                className={`px-2 py-1.5 ${product.purchaseCurrency === 'ILS' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'}`}
              >
                ₪
              </button>
              <button
                onClick={() => onChange({ ...product, purchaseCurrency: 'USD' })}
                className={`px-2 py-1.5 ${product.purchaseCurrency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'}`}
              >
                $
              </button>
            </div>
          </div>
        </label>
        <div className="flex flex-col gap-1 text-xs text-slate-400">
          סה״כ עלות רכישה
          <div className="rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5 text-sm font-semibold text-slate-100">
            {formatCurrency(totals.purchaseTotal)}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          רווח רצוי (%)
          <input
            type="number"
            min={0}
            value={product.targetProfitPercent === 0 ? '' : product.targetProfitPercent}
            onChange={(e) => onChange({ ...product, targetProfitPercent: Number(e.target.value) || 0 })}
            className="rounded border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100"
          />
        </label>
      </div>

      <div className="mb-4 rounded-md border border-emerald-900 bg-emerald-950/20 p-3 text-sm">
        <span className="text-emerald-300">
          כדי להרוויח <strong>{product.targetProfitPercent}%</strong> על העלות, מחיר המכירה המומלץ ליחידה הוא{' '}
          <strong>{formatCurrency(totals.suggestedSalePrice)}</strong>
        </span>
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
        className="mt-4 w-full rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
        rows={2}
      />

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-slate-800/60 p-3 text-sm sm:grid-cols-4">
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
    highlight === 'positive' ? 'text-emerald-400' : highlight === 'negative' ? 'text-red-400' : 'text-slate-100'
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )
}
