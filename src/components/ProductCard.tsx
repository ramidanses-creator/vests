import { useState } from 'react'
import type { Product } from '../types'
import { calculateProductTotals, formatCurrency } from '../utils/calculations'
import { DecimalInput } from './DecimalInput'
import { ExpensesList } from './ExpensesList'
import { ShipmentsList } from './ShipmentsList'

interface Props {
  product: Product
  onChange: (product: Product) => void
  onRemove: () => void
  usdToIlsRate: number | null
  categoryOptions: string[]
  expenseLabelOptions: string[]
  defaultExpanded?: boolean
}

export function ProductCard({
  product,
  onChange,
  onRemove,
  usdToIlsRate,
  categoryOptions,
  expenseLabelOptions,
  defaultExpanded,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)
  const [salePriceDraft, setSalePriceDraft] = useState<string | null>(null)
  const [profitPercentDraft, setProfitPercentDraft] = useState<string | null>(null)
  const totals = calculateProductTotals(product, usdToIlsRate)
  const effectiveRate = product.usdRateOverride ?? usdToIlsRate
  const inSystem = product.status === 'standby'

  function toggleStatus() {
    onChange({ ...product, status: inSystem ? 'active' : 'standby' })
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 border-r-2 bg-[#1a1b20] ${inSystem ? 'border-violet-500' : 'border-teal-500'}`}
    >
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full flex-col gap-2 p-4 text-right">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-base font-semibold text-slate-100">
            {product.name || 'מוצר ללא שם'}
          </span>
          <span className="text-slate-500">{expanded ? '︿' : '﹀'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-slate-400">{product.sku}</span>
          {product.category && (
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-slate-200">{product.category}</span>
          )}
          {inSystem && <span className="rounded-md bg-violet-500/20 px-2 py-0.5 text-violet-300">רשום במערכת</span>}
          {totals.quantityPending > 0 && (
            <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-amber-300">
              ממתין {totals.quantityPending}
            </span>
          )}
          <span className="rounded-md bg-sky-400/15 px-2 py-0.5 text-sky-300">
            עלות/יח׳ {formatCurrency(totals.costPerUnit)}
          </span>
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-slate-200">במלאי {totals.quantityRemaining}</span>
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${totals.totalProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}
          >
            רווח {formatCurrency(totals.totalProfit)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-4 pt-4">
          <div className="mb-4 flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="שם המוצר"
                value={product.name}
                onChange={(e) => onChange({ ...product, name: e.target.value })}
                className="w-full flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-slate-100 focus:border-teal-500 focus:outline-none"
              />
              <input
                type="text"
                list="category-options"
                placeholder="קטגוריה"
                value={product.category}
                onChange={(e) => onChange({ ...product, category: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:outline-none sm:w-40"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleStatus}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${
                  inSystem
                    ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
                    : 'bg-white/10 text-slate-300 hover:bg-white/15'
                }`}
              >
                {inSystem ? '✓ רשום במערכת — לחצו להחזיר להזמנה חדשה' : 'סמן כרשום במערכת'}
              </button>
              <button
                onClick={onRemove}
                className="rounded-md bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
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

          <Section title="עלות ורווח" dot="bg-amber-400">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                מחיר רכישה ליחידה
                <div className="flex items-center gap-1">
                  <DecimalInput
                    value={product.purchasePricePerUnit}
                    onChange={(purchasePricePerUnit) => onChange({ ...product, purchasePricePerUnit })}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                  <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs">
                    <button
                      onClick={() => onChange({ ...product, purchaseCurrency: 'ILS' })}
                      className={`px-2 py-1.5 ${product.purchaseCurrency === 'ILS' ? 'bg-teal-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
                    >
                      ₪
                    </button>
                    <button
                      onClick={() => onChange({ ...product, purchaseCurrency: 'USD' })}
                      className={`px-2 py-1.5 ${product.purchaseCurrency === 'USD' ? 'bg-teal-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
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
                    type="text"
                    inputMode="decimal"
                    step="0.0001"
                    placeholder={usdToIlsRate ? usdToIlsRate.toFixed(4) : '—'}
                    value={product.usdRateOverride ?? ''}
                    onChange={(e) => onChange({ ...product, usdRateOverride: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                  {usdToIlsRate && (
                    <button
                      onClick={() => onChange({ ...product, usdRateOverride: usdToIlsRate })}
                      className="whitespace-nowrap rounded-lg bg-white/10 px-2 py-1.5 text-xs text-slate-300 hover:bg-white/15"
                    >
                      שער נוכחי
                    </button>
                  )}
                </div>
              </label>
              <div className="flex flex-col gap-1 text-xs text-slate-400">
                סה״כ עלות רכישה
                <div className="rounded-lg bg-amber-400/10 px-2 py-1.5 text-sm font-semibold text-amber-200">
                  {formatCurrency(totals.purchaseTotal)}
                </div>
              </div>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                רווח רצוי (%)
                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    profitPercentDraft ??
                    (product.targetProfitPercent === 0 ? '' : Number(product.targetProfitPercent.toFixed(1)))
                  }
                  onFocus={() =>
                    setProfitPercentDraft(
                      product.targetProfitPercent === 0 ? '' : String(Number(product.targetProfitPercent.toFixed(1))),
                    )
                  }
                  onChange={(e) => {
                    setProfitPercentDraft(e.target.value)
                    onChange({ ...product, targetProfitPercent: Number(e.target.value) || 0 })
                  }}
                  onBlur={() => setProfitPercentDraft(null)}
                  className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                או: מחיר מכירה רצוי ליחידה
                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    salePriceDraft ??
                    (totals.suggestedSalePrice === 0 ? '' : Number(totals.suggestedSalePrice.toFixed(2)))
                  }
                  onFocus={() =>
                    setSalePriceDraft(totals.suggestedSalePrice === 0 ? '' : String(Number(totals.suggestedSalePrice.toFixed(2))))
                  }
                  onChange={(e) => {
                    setSalePriceDraft(e.target.value)
                    const price = Number(e.target.value) || 0
                    const percent = totals.costPerUnit > 0 ? (price / totals.costPerUnit - 1) * 100 : 0
                    onChange({ ...product, targetProfitPercent: percent })
                  }}
                  onBlur={() => setSalePriceDraft(null)}
                  className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                />
              </label>
            </div>
            <p className="mt-3 rounded-lg bg-teal-500/10 p-3 text-sm text-teal-200">
              כדי להרוויח <strong>~{product.targetProfitPercent.toFixed(1)}%</strong> על העלות, מחיר המכירה המומלץ ליחידה הוא{' '}
              <strong>{formatCurrency(totals.suggestedSalePrice)}</strong>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-3 text-sm">
                <div className="text-xs text-emerald-400">רווח צפוי (לפי המחיר הרצוי, על כל הכמות)</div>
                <div className="font-semibold text-emerald-300">{formatCurrency(totals.expectedProfit)}</div>
              </div>
              <div className="rounded-lg bg-white/5 p-3 text-sm">
                <div className="text-xs text-slate-400">רווח בפועל (לפי מכירות שנרשמו)</div>
                <div className={`font-semibold ${totals.totalProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                  {formatCurrency(totals.totalProfit)}
                </div>
              </div>
            </div>
          </Section>

          <Section title="משלוחים / הגעה" dot="bg-sky-400">
            <ShipmentsList shipments={product.shipments} onChange={(shipments) => onChange({ ...product, shipments })} />
          </Section>

          <Section title="הוצאות" dot="bg-violet-400">
            <ExpensesList
              expenses={product.expenses}
              onChange={(expenses) => onChange({ ...product, expenses })}
              usdToIlsRate={effectiveRate}
              quantityImported={totals.quantityImported}
              labelOptions={expenseLabelOptions}
            />
            <p className="mt-2 text-xs text-slate-500">דיווח מכירות והחזרות מתבצע בתפריט "מכירות והחזרות" הנפרד למעלה.</p>
          </Section>

          <textarea
            placeholder="הערות"
            value={product.notes}
            onChange={(e) => onChange({ ...product, notes: e.target.value })}
            className="mt-4 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            rows={2}
          />

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-black/20 p-3 text-sm sm:grid-cols-4">
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

function Section({ title, dot, children }: { title: string; dot: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 border-t border-white/10 pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {title}
      </h3>
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
    highlight === 'positive' ? 'text-emerald-400' : highlight === 'negative' ? 'text-rose-400' : 'text-slate-100'
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )
}
