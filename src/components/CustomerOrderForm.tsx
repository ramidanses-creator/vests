import { useState } from 'react'
import type { Currency } from '../types'
import { amountInIls, formatCurrency } from '../utils/calculations'
import { DecimalInput } from './DecimalInput'

export interface OrderLine {
  id: string
  name: string
  quantity: number
  pricePerUnit: number
  currency: Currency
}

interface Props {
  customerName: string
  usdToIlsRate: number | null
  onCancel: () => void
  onSubmit: (lines: OrderLine[], shippingAmount: number, shippingCurrency: Currency) => void
}

function emptyLine(): OrderLine {
  return { id: crypto.randomUUID(), name: '', quantity: 1, pricePerUnit: 0, currency: 'USD' }
}

export function CustomerOrderForm({ customerName, usdToIlsRate, onCancel, onSubmit }: Props) {
  const [lines, setLines] = useState<OrderLine[]>([emptyLine()])
  const [shippingAmount, setShippingAmount] = useState('')
  const [shippingCurrency, setShippingCurrency] = useState<Currency>('ILS')

  function updateLine(id: string, patch: Partial<OrderLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const shippingIls = amountInIls(Number(shippingAmount) || 0, shippingCurrency, usdToIlsRate)
  const validLines = lines.filter((l) => l.name.trim() !== '' && l.quantity > 0)
  const totalValueIls = validLines.reduce((sum, l) => sum + amountInIls(l.quantity * l.pricePerUnit, l.currency, usdToIlsRate), 0)

  const shares = validLines.map((l) => {
    const valueIls = amountInIls(l.quantity * l.pricePerUnit, l.currency, usdToIlsRate)
    const share = totalValueIls > 0 ? valueIls / totalValueIls : validLines.length > 0 ? 1 / validLines.length : 0
    return { line: l, shippingShare: shippingIls * share }
  })

  const canSubmit = validLines.length > 0

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit(validLines, shippingIls, 'ILS')
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#1a1b20] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">הזמנה חדשה עבור {customerName}</h3>
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-300">
          ביטול
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {lines.map((line, i) => (
          <div key={line.id} className="flex flex-wrap items-end gap-2 rounded-lg bg-black/20 p-2.5">
            <label className="flex min-w-[110px] flex-1 flex-col gap-1 text-xs text-slate-400">
              מוצר {i + 1}
              <input
                type="text"
                placeholder="שם המוצר (למשל: וסטים)"
                value={line.name}
                onChange={(e) => updateLine(line.id, { name: e.target.value })}
                className="rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
            <label className="flex w-20 flex-col gap-1 text-xs text-slate-400">
              כמות
              <DecimalInput
                value={line.quantity}
                onChange={(quantity) => updateLine(line.id, { quantity })}
                className="rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
            <label className="flex w-24 flex-col gap-1 text-xs text-slate-400">
              מחיר ליחידה
              <DecimalInput
                value={line.pricePerUnit}
                onChange={(pricePerUnit) => updateLine(line.id, { pricePerUnit })}
                className="rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
            <div className="flex overflow-hidden rounded-md border border-white/10 text-xs">
              <button
                onClick={() => updateLine(line.id, { currency: 'ILS' })}
                className={`px-2 py-1.5 ${line.currency === 'ILS' ? 'bg-teal-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
              >
                ₪
              </button>
              <button
                onClick={() => updateLine(line.id, { currency: 'USD' })}
                className={`px-2 py-1.5 ${line.currency === 'USD' ? 'bg-teal-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
              >
                $
              </button>
            </div>
            {lines.length > 1 && (
              <button onClick={() => removeLine(line.id)} className="text-xs text-slate-500 hover:text-rose-400">
                מחק
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addLine}
          className="self-start rounded-md border border-dashed border-teal-700/60 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-950/20"
        >
          + מוצר נוסף
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        עלות משלוח כוללת להזמנה (תתחלק אוטומטית בין המוצרים לפי שווי)
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={shippingAmount}
            onChange={(e) => setShippingAmount(e.target.value)}
            className="w-28 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
          <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setShippingCurrency('ILS')}
              className={`px-2 py-1.5 ${shippingCurrency === 'ILS' ? 'bg-teal-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
            >
              ₪
            </button>
            <button
              onClick={() => setShippingCurrency('USD')}
              className={`px-2 py-1.5 ${shippingCurrency === 'USD' ? 'bg-teal-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
            >
              $
            </button>
          </div>
        </div>
      </label>

      {shares.length > 0 && shippingIls > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-black/20 p-3 text-xs text-slate-400">
          {totalValueIls === 0 && (
            <p className="text-amber-300">לא הוזן מחיר לאף מוצר, אז המשלוח יתחלק שווה בשווה.</p>
          )}
          {shares.map(({ line, shippingShare }) => (
            <div key={line.id} className="flex items-center justify-between">
              <span>{line.name}</span>
              <span className="text-slate-200">+{formatCurrency(shippingShare)} משלוח</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
      >
        יצירת ההזמנה ({validLines.length} מוצרים)
      </button>
    </div>
  )
}
