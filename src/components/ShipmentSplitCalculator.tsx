import { useState } from 'react'
import type { Currency, Product } from '../types'
import { amountInIls, calculateProductTotals, formatCurrency } from '../utils/calculations'

interface Props {
  products: Product[]
  onChange: (product: Product) => void
  usdToIlsRate: number | null
}

export function ShipmentSplitCalculator({ products, onChange, usdToIlsRate }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [shippingAmount, setShippingAmount] = useState('')
  const [shippingCurrency, setShippingCurrency] = useState<Currency>('ILS')
  const [customsAmount, setCustomsAmount] = useState('')
  const [customsCurrency, setCustomsCurrency] = useState<Currency>('ILS')
  const [applied, setApplied] = useState(false)

  function toggle(id: string) {
    setApplied(false)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  const shares = rows.map((r) => {
    const share = totalValue > 0 ? r.value / totalValue : 0
    return {
      product: r.product,
      share,
      shippingShare: shippingIls * share,
      customsShare: customsIls * share,
    }
  })

  function applySplit() {
    shares.forEach(({ product, shippingShare, customsShare }) => {
      const newExpenses = [...product.expenses]
      if (shippingShare > 0) {
        newExpenses.push({
          id: crypto.randomUUID(),
          label: 'משלוח (חלק יחסי ממשלוח משותף)',
          amount: shippingShare,
          currency: 'ILS',
        })
      }
      if (customsShare > 0) {
        newExpenses.push({
          id: crypto.randomUUID(),
          label: 'מכס (חלק יחסי ממשלוח משותף)',
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
        סמנו את המוצרים שהגיעו יחד באותו משלוח. עלות המשלוח והמכס הכוללת תתחלק בין המוצרים באופן יחסי לפי שווי הרכישה
        של כל מוצר (כמות × מחיר רכישה).
      </p>

      <div className="flex flex-col gap-1.5">
        {products.map((p) => {
          const totals = calculateProductTotals(p, usdToIlsRate)
          const checked = selectedIds.has(p.id)
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
              <span className="text-xs text-slate-400">שווי רכישה: {formatCurrency(totals.purchaseTotal)}</span>
            </label>
          )
        })}
        {products.length === 0 && <p className="text-xs text-slate-500">אין מוצרים עדיין.</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          עלות משלוח כוללת
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
          עלות מכס/מע״מ כוללת
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
