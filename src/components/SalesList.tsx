import { useState } from 'react'
import type { DiscountType, ReturnReason, Sale } from '../types'
import { formatCurrency, saleNetRevenue } from '../utils/calculations'

interface Props {
  sales: Sale[]
  onChange: (sales: Sale[]) => void
  suggestedSalePrice?: number
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function SalesList({ sales, onChange, suggestedSalePrice = 0 }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  function updateSale(id: string, patch: Partial<Sale>) {
    onChange(sales.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function addSale() {
    const id = crypto.randomUUID()
    onChange([
      ...sales,
      {
        id,
        date: today(),
        quantity: 1,
        pricePerUnit: 0,
        returnedQuantity: 0,
        returnReason: null,
        discountType: null,
        discountValue: 0,
        invoiceNumber: '',
        notes: '',
      },
    ])
    setOpenId(id)
  }

  function setDiscount(sale: Sale, type: DiscountType, value: number) {
    const clampedValue = type === 'percent' ? Math.max(0, Math.min(100, value)) : Math.max(0, value)
    updateSale(sale.id, { discountType: type, discountValue: clampedValue })
  }

  function clearDiscount(sale: Sale) {
    updateSale(sale.id, { discountType: null, discountValue: 0 })
  }

  function setReturnedQuantity(sale: Sale, quantity: number) {
    const clamped = Math.max(0, Math.min(quantity, sale.quantity))
    updateSale(sale.id, {
      returnedQuantity: clamped,
      returnReason: clamped === 0 ? null : (sale.returnReason ?? 'damaged'),
    })
  }

  function setReturnReason(sale: Sale, reason: ReturnReason) {
    updateSale(sale.id, { returnReason: reason, returnedQuantity: sale.returnedQuantity || sale.quantity })
  }

  function clearReturn(sale: Sale) {
    updateSale(sale.id, { returnedQuantity: 0, returnReason: null })
  }

  function removeSale(id: string) {
    onChange(sales.filter((s) => s.id !== id))
    if (openId === id) setOpenId(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">מכירות</h3>
        <button
          onClick={addSale}
          className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400"
        >
          + דווח מכירה
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {sales.length === 0 && <p className="text-xs text-slate-500">אין מכירות עדיין.</p>}
        {[...sales].reverse().map((sale) => {
          const isOpen = openId === sale.id
          const hasReturn = sale.returnedQuantity > 0
          const hasDiscount = !!sale.discountType && sale.discountValue > 0
          const netQty = sale.quantity - sale.returnedQuantity
          const grossTotal = netQty * sale.pricePerUnit
          const total = saleNetRevenue(sale)
          const effectivePricePerUnit = netQty > 0 ? total / netQty : sale.pricePerUnit
          const priceDiff = suggestedSalePrice > 0 ? suggestedSalePrice - effectivePricePerUnit : 0
          const priceDiffPercent = suggestedSalePrice > 0 ? (priceDiff / suggestedSalePrice) * 100 : 0

          return (
            <div
              key={sale.id}
              className={`overflow-hidden rounded-lg border ${hasReturn ? 'border-rose-800/50 bg-rose-500/5' : 'border-white/10 bg-white/[0.02]'}`}
            >
              <button
                onClick={() => setOpenId(isOpen ? null : sale.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-right"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">{new Date(sale.date).toLocaleDateString('he-IL')}</span>
                  <span className="font-semibold text-slate-100">
                    {sale.quantity} × {formatCurrency(sale.pricePerUnit)}
                  </span>
                  {hasReturn && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                        sale.returnReason === 'restocked'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      ↩ {sale.returnedQuantity} {sale.returnReason === 'restocked' ? 'חזרו למלאי' : 'בלאי'}
                    </span>
                  )}
                  {hasDiscount && (
                    <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[11px] font-medium text-sky-300">
                      הנחה {sale.discountType === 'percent' ? `${sale.discountValue}%` : formatCurrency(sale.discountValue)}
                    </span>
                  )}
                  {sale.invoiceNumber && (
                    <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                      #{sale.invoiceNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-200">{formatCurrency(total)}</span>
                  <span className="text-slate-500">{isOpen ? '︿' : '﹀'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-3 border-t border-white/10 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex flex-col gap-1 text-xs text-slate-400">
                      תאריך
                      <input
                        type="date"
                        value={sale.date}
                        onChange={(e) => updateSale(sale.id, { date: e.target.value })}
                        className="rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-400">
                      כמות שנמכרה
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="כמות"
                        value={sale.quantity === 0 ? '' : sale.quantity}
                        onChange={(e) => {
                          const quantity = Number(e.target.value) || 0
                          updateSale(sale.id, {
                            quantity,
                            returnedQuantity: Math.min(sale.returnedQuantity, quantity),
                          })
                        }}
                        className="w-20 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-400">
                      מחיר ליחידה {suggestedSalePrice > 0 && `(מומלץ: ${formatCurrency(suggestedSalePrice)})`}
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="מחיר ליחידה"
                        value={sale.pricePerUnit === 0 ? '' : sale.pricePerUnit}
                        onChange={(e) => updateSale(sale.id, { pricePerUnit: Number(e.target.value) || 0 })}
                        className="w-28 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-400">
                      מספר חשבונית
                      <input
                        type="text"
                        placeholder="מס׳ חשבונית"
                        value={sale.invoiceNumber}
                        onChange={(e) => updateSale(sale.id, { invoiceNumber: e.target.value })}
                        className="w-28 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
                      />
                    </label>
                    <button
                      onClick={() => removeSale(sale.id)}
                      className="mt-4 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
                    >
                      מחק מכירה
                    </button>
                  </div>

                  {suggestedSalePrice > 0 && (
                    <p className="text-xs text-slate-500">
                      מחיר בפועל ליחידה (אחרי הנחה): {formatCurrency(effectivePricePerUnit)} ·{' '}
                      {priceDiff > 0.005 ? (
                        <span className="text-amber-300">
                          {priceDiffPercent.toFixed(1)}% מתחת למחיר המומלץ ({formatCurrency(priceDiff)} ליחידה)
                        </span>
                      ) : priceDiff < -0.005 ? (
                        <span className="text-emerald-300">
                          {Math.abs(priceDiffPercent).toFixed(1)}% מעל המחיר המומלץ
                        </span>
                      ) : (
                        <span className="text-slate-400">בדיוק לפי המחיר המומלץ</span>
                      )}
                    </p>
                  )}

                  <label className="flex flex-col gap-1 text-xs text-slate-400">
                    הערות
                    <textarea
                      placeholder="הערות למכירה..."
                      value={sale.notes}
                      onChange={(e) => updateSale(sale.id, { notes: e.target.value })}
                      rows={2}
                      className="rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
                    />
                  </label>

                  <div className="rounded-lg bg-black/20 p-3">
                    {!hasDiscount ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-400">הנחה / מינוס:</span>
                        <button
                          onClick={() => setDiscount(sale, 'amount', 0)}
                          className="rounded-md border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5"
                        >
                          סכום קבוע (₪)
                        </button>
                        <button
                          onClick={() => setDiscount(sale, 'percent', 0)}
                          className="rounded-md border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5"
                        >
                          אחוז (%)
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-400">הנחה:</span>
                          <div className="flex overflow-hidden rounded-md border border-white/10 text-xs">
                            <button
                              onClick={() => setDiscount(sale, 'amount', sale.discountType === 'amount' ? sale.discountValue : 0)}
                              className={`px-2 py-1 ${sale.discountType === 'amount' ? 'bg-sky-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
                            >
                              ₪
                            </button>
                            <button
                              onClick={() => setDiscount(sale, 'percent', sale.discountType === 'percent' ? sale.discountValue : 0)}
                              className={`px-2 py-1 ${sale.discountType === 'percent' ? 'bg-sky-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
                            >
                              %
                            </button>
                          </div>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={sale.discountValue === 0 ? '' : sale.discountValue}
                            onChange={(e) => setDiscount(sale, sale.discountType ?? 'amount', Number(e.target.value) || 0)}
                            className="w-20 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
                          />
                          <button onClick={() => clearDiscount(sale)} className="text-xs text-slate-500 hover:text-slate-300">
                            ביטול הנחה
                          </button>
                        </div>
                        {sale.discountValue > 0 && (
                          <p className="text-xs text-slate-500">
                            מחיר לפני הנחה: {formatCurrency(grossTotal)} · אחרי הנחה: {formatCurrency(total)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-black/20 p-3">
                    {!hasReturn ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-400">לקוח החזיר / זיכוי:</span>
                        <button
                          onClick={() => setReturnedQuantity(sale, sale.quantity)}
                          className="rounded-md border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5"
                        >
                          החזרת הכל ({sale.quantity})
                        </button>
                        <button
                          onClick={() => setReturnedQuantity(sale, 1)}
                          className="rounded-md border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5"
                        >
                          החזרת חלק...
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-400">כמות מוחזרת:</span>
                          <div className="flex items-center overflow-hidden rounded-lg border border-white/10">
                            <button
                              onClick={() => setReturnedQuantity(sale, sale.returnedQuantity - 1)}
                              className="px-2.5 py-1 text-slate-300 hover:bg-white/10"
                            >
                              −
                            </button>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={sale.returnedQuantity}
                              onChange={(e) => setReturnedQuantity(sale, Number(e.target.value) || 0)}
                              className="w-12 bg-black/20 py-1 text-center text-sm text-slate-100"
                            />
                            <button
                              onClick={() => setReturnedQuantity(sale, sale.returnedQuantity + 1)}
                              className="px-2.5 py-1 text-slate-300 hover:bg-white/10"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs text-slate-500">מתוך {sale.quantity}</span>
                          <button onClick={() => clearReturn(sale)} className="text-xs text-slate-500 hover:text-slate-300">
                            ביטול החזרה
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-400">מה קורה לכמות הזו?</span>
                          <button
                            onClick={() => setReturnReason(sale, 'restocked')}
                            className={`rounded-md border px-3 py-1 text-xs ${
                              sale.returnReason === 'restocked'
                                ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300'
                                : 'border-white/10 text-slate-400 hover:bg-emerald-500/10'
                            }`}
                          >
                            ✓ תקינה — חזרה למלאי
                          </button>
                          <button
                            onClick={() => setReturnReason(sale, 'damaged')}
                            className={`rounded-md border px-3 py-1 text-xs ${
                              sale.returnReason === 'damaged'
                                ? 'border-rose-800 bg-rose-950/30 text-rose-300'
                                : 'border-white/10 text-slate-400 hover:bg-rose-500/10'
                            }`}
                          >
                            ✕ בלאי — לא חוזרת למלאי
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">
                          הרכישה המקורית ({sale.quantity} יח׳) נשמרת בהיסטוריה. {sale.returnedQuantity} יח׳ זוכו,{' '}
                          {netQty} נשארו כמכירה בפועל.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
