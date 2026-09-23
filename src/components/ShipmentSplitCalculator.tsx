import { useState } from 'react'
import type { Currency, Product } from '../types'
import { amountInIls, calculateProductTotals, formatCurrency } from '../utils/calculations'

interface Props {
  products: Product[]
  onChange: (product: Product) => void
  usdToIlsRate: number | null
}

const isShippingExpense = (label: string) => label.includes('משלוח')
const isCustomsExpense = (label: string) => label.includes('מכס')

export function ShipmentSplitCalculator({ products, onChange, usdToIlsRate }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [shippingAmount, setShippingAmount] = useState('')
  const [shippingCurrency, setShippingCurrency] = useState<Currency>('ILS')
  const [customsAmount, setCustomsAmount] = useState('')
  const [customsCurrency, setCustomsCurrency] = useState<Currency>('ILS')
  const [applied, setApplied] = useState(false)

  // Sums whatever shipping/customs expenses are already entered on each of the
  // selected products (e.g. "משלוח" $100 on one, $3 on another) into one
  // combined total, so the split starts from what's already known instead of
  // asking the user to re-type it.
  function autoFillFromSelection(ids: Set<string>) {
    let shippingIlsSum = 0
    let customsIlsSum = 0
    products
      .filter((p) => ids.has(p.id))
      .forEach((p) => {
        p.expenses.forEach((e) => {
          const inIls = amountInIls(e.amount, e.currency, usdToIlsRate)
          if (isShippingExpense(e.label)) shippingIlsSum += inIls
          else if (isCustomsExpense(e.label)) customsIlsSum += inIls
        })
      })
    setShippingAmount(shippingIlsSum > 0 ? String(Number(shippingIlsSum.toFixed(2))) : '')
    setShippingCurrency('ILS')
    setCustomsAmount(customsIlsSum > 0 ? String(Number(customsIlsSum.toFixed(2))) : '')
    setCustomsCurrency('ILS')
  }

  function toggle(id: string) {
    setApplied(false)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      autoFillFromSelection(next)
      return next
    })
  }

  const rows = products
    .filter((p) => selectedIds.has(p.id))
    .map((p) => {
      const totals = calculateProductTotals(p, usdToIlsRate)
      return { product: p, value: totals.purchaseTotal }
    })

  const totalValue = rows.reduce((sum, r) => sum + r.value, 0)
  const shippingIls = amountInIls(Number(shippingAmount) || 0, shippingCurrency, usdToIlsRate)
  const customsIls = amountInIls(Number(customsAmount) || 0, customsCurrency, usdToIlsRate)

  // Fall back to an equal split when none of the selected products have a
  // purchase price entered yet (so the proportional weight is unknown) —
  // otherwise the combined amount would silently vanish instead of landing
  // somewhere.
  const shares = rows.map((r) => {
    const share = totalValue > 0 ? r.value / totalValue : rows.length > 0 ? 1 / rows.length : 0
    return {
      product: r.product,
      share,
      shippingShare: shippingIls * share,
      customsShare: customsIls * share,
    }
  })

  function applySplit() {
    shares.forEach(({ product, shippingShare, customsShare }) => {
      // Replace any existing shipping/customs lines (the per-product amounts
      // that were summed into the combined total above) with the freshly
      // computed proportional share, instead of piling another line on top.
      const newExpenses = product.expenses.filter((e) => !isShippingExpense(e.label) && !isCustomsExpense(e.label))
      if (shippingShare > 0) {
        newExpenses.push({
          id: crypto.randomUUID(),
          label: 'משלוח (חלק יחסי מפיצול משותף)',
          amount: shippingShare,
          currency: 'ILS',
        })
      }
      if (customsShare > 0) {
        newExpenses.push({
          id: crypto.randomUUID(),
          label: 'מכס (חלק יחסי מפיצול משותף)',
          amount: customsShare,
          currency: 'ILS',
        })
      }
      onChange({ ...product, expenses: newExpenses })
    })
    setApplied(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-400">
        סמנו את המוצרים שהגיעו יחד באותו משלוח. המשלוח והמכס שכבר הוזנו על כל מוצר (השורות "משלוח"/"מכס" שלו) יסוכמו
        אוטומטית לעלות כוללת, שתתחלק מחדש בין המוצרים באופן יחסי לפי שווי הרכישה של כל אחד (כמות × מחיר רכישה) —
        ותחליף את מה שהיה רשום על כל מוצר בנפרד. אפשר גם לערוך את הסכומים הכוללים ידנית לפני ההחלה.
      </p>

      <div className="flex flex-col gap-1.5">
        {products.map((p) => {
          const totals = calculateProductTotals(p, usdToIlsRate)
          const checked = selectedIds.has(p.id)
          const existingShippingIls = p.expenses
            .filter((e) => isShippingExpense(e.label))
            .reduce((sum, e) => sum + amountInIls(e.amount, e.currency, usdToIlsRate), 0)
          const existingCustomsIls = p.expenses
            .filter((e) => isCustomsExpense(e.label))
            .reduce((sum, e) => sum + amountInIls(e.amount, e.currency, usdToIlsRate), 0)
          return (
            <label
              key={p.id}
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                checked ? 'border-sky-700 bg-sky-950/20' : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} className="accent-sky-500" />
                <span className="text-slate-200">{p.name || 'מוצר ללא שם'}</span>
              </span>
              <span className="text-left text-xs text-slate-400">
                <span className="block">שווי רכישה: {formatCurrency(totals.purchaseTotal)}</span>
                {(existingShippingIls > 0 || existingCustomsIls > 0) && (
                  <span className="block text-slate-500">
                    משלוח: {formatCurrency(existingShippingIls)} · מכס: {formatCurrency(existingCustomsIls)}
                  </span>
                )}
              </span>
            </label>
          )
        })}
        {products.length === 0 && <p className="text-xs text-slate-500">אין מוצרים עדיין.</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          עלות משלוח כוללת (מולאה אוטומטית, ניתן לערוך)
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={shippingAmount}
              onChange={(e) => {
                setShippingAmount(e.target.value)
                setApplied(false)
              }}
              className="w-28 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
            />
            <CurrencyToggle value={shippingCurrency} onChange={setShippingCurrency} />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          עלות מכס/מע״מ כוללת (מולאה אוטומטית, ניתן לערוך)
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={customsAmount}
              onChange={(e) => {
                setCustomsAmount(e.target.value)
                setApplied(false)
              }}
              className="w-28 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
            />
            <CurrencyToggle value={customsCurrency} onChange={setCustomsCurrency} />
          </div>
        </label>
      </div>

      {shares.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-black/20 p-3">
          {totalValue === 0 && (
            <p className="text-xs text-amber-300">
              לאף אחד מהמוצרים שנבחרו אין עדיין מחיר רכישה, אז החלוקה כרגע שווה בין כולם. הזינו מחיר רכישה ליחידה כדי
              לחלק לפי שווי אמיתי.
            </p>
          )}
          {shares.map(({ product, share, shippingShare, customsShare }) => (
            <div key={product.id} className="flex flex-wrap items-center justify-between gap-1 text-xs">
              <span className="text-slate-200">
                {product.name || 'מוצר ללא שם'} <span className="text-slate-500">({(share * 100).toFixed(1)}%)</span>
              </span>
              <span className="text-slate-400">
                משלוח: <span className="font-semibold text-slate-200">{formatCurrency(shippingShare)}</span> · מכס:{' '}
                <span className="font-semibold text-slate-200">{formatCurrency(customsShare)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={applySplit}
        disabled={shares.length === 0 || (shippingIls === 0 && customsIls === 0)}
        className="self-start rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {applied ? '✓ נוסף כהוצאה לכל מוצר' : 'החל ופצל כהוצאות'}
      </button>
    </div>
  )
}

function CurrencyToggle({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs">
      <button
        onClick={() => onChange('ILS')}
        className={`px-2 py-1.5 ${value === 'ILS' ? 'bg-sky-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
      >
        ₪
      </button>
      <button
        onClick={() => onChange('USD')}
        className={`px-2 py-1.5 ${value === 'USD' ? 'bg-sky-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
      >
        $
      </button>
    </div>
  )
}
