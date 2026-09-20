import { useState } from 'react'
import type { Product } from '../types'
import { calculateProductTotals, formatCurrency } from '../utils/calculations'
import { ExpensesList } from './ExpensesList'
import { SalesList } from './SalesList'
import { ShipmentsList } from './ShipmentsList'

interface Props {
  product: Product
  onChange: (product: Product) => void
  onRemove: () => void
  usdToIlsRate: number | null
  categoryOptions: string[]
  defaultExpanded?: boolean
}

export function ProductCard({ product, onChange, onRemove, usdToIlsRate, categoryOptions, defaultExpanded }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)
  const totals = calculateProductTotals(product, usdToIlsRate)
  const effectiveRate = product.usdRateOverride ?? usdToIlsRate
  const inSystem = product.status === 'standby'

  function toggleStatus() {
    onChange({ ...product, status: inSystem ? 'active' : 'standby' })
  }

  return (
    <div className={`rounded-xl border shadow-lg shadow-black/20 ${inSystem ? 'border-sky-800 bg-sky-950/20' : 'border-slate-800 bg-slate-900'}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-col gap-2 p-4 text-right"
      >
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-base font-semibold text-slate-100">
            {product.name || 'מוצר ללא שם'}
          </span>
          <span className="text-slate-500">{expanded ? '︿' : '﹀'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {product.category && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">{product.category}</span>
          )}
          {inSystem && <span className="rounded-full bg-sky-950/50 px-2 py-0.5 text-sky-300">רשום במערכת</span>}
          {totals.quantityPending > 0 && (
            <span className="rounded-full bg-amber-950/50 px-2 py-0.5 text-amber-300">
              🚚 ממתין {totals.quantityPending}
            </span>
          )}
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
            עלות/יח׳ {formatCurrency(totals.costPerUnit)}
          </span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
            במלאי {totals.quantityRemaining}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ${totals.totalProfit >= 0 ? 'bg-emerald-950/50 text-emerald-300' : 'bg-red-950/50 text-red-300'}`}
          >
            רווח {formatCurrency(totals.totalProfit)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 p-4 pt-4">
          <div className="mb-4 flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="שם המוצר"
                value={product.name}
                onChange={(e) => onChange({ ...product, name: e.target.value })}
                className="w-full flex-1 rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-semibold text-slate-100"
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
                onClick={toggleStatus}
                className={`whitespace-nowrap rounded border px-3 py-2 text-xs ${
                  inSystem
                    ? 'border-sky-800 bg-sky-950/30 text-sky-300 hover:bg-sky-950/50'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {inSystem ? '✓ רשום במערכת — לחצו להחזיר להזמנה חדשה' : 'סמן כרשום במערכת'}
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

          <Section title="עלות ורווח">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                שער דולר נעול למוצר
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.0001"
                    placeholder={usdToIlsRate ? usdToIlsRate.toFixed(4) : '—'}
                    value={product.usdRateOverride ?? ''}
                    onChange={(e) => onChange({ ...product, usdRateOverride: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100"
                  />
                  {usdToIlsRate && (
                    <button
                      onClick={() => onChange({ ...product, usdRateOverride: usdToIlsRate })}
                      className="whitespace-nowrap rounded border border-slate-700 px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                    >
                      שער נוכחי
                    </button>
                  )}
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
            <p className="mt-3 text-sm text-emerald-300">
              כדי להרוויח <strong>{product.targetProfitPercent}%</strong> על העלות, מחיר המכירה המומלץ ליחידה הוא{' '}
              <strong>{formatCurrency(totals.suggestedSalePrice)}</strong>
            </p>
          </Section>

          <Section title="משלוחים / הגעה">
            <ShipmentsList shipments={product.shipments} onChange={(shipments) => onChange({ ...product, shipments })} />
          </Section>

          <Section title="הוצאות ומכירות">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ExpensesList
                expenses={product.expenses}
                onChange={(expenses) => onChange({ ...product, expenses })}
                usdToIlsRate={effectiveRate}
              />
              <SalesList sales={product.sales} onChange={(sales) => onChange({ ...product, sales })} />
            </div>
          </Section>

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
            <Stat label="נמכרו / במלאי" value={`${totals.quantitySold} / ${totals.quantityRemaining}`} />
            <Stat label="סה״כ הכנסות" value={formatCurrency(totals.totalRevenue)} />
            <Stat
              label="רווח כולל"
              value={formatCurrency(totals.totalProfit)}
              highlight={totals.totalProfit >= 0 ? 'positive' : 'negative'}
            />
            <Stat label="רווח ליחידה" value={formatCurrency(totals.profitPerUnit)} />
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 border-t border-slate-800 pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
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
