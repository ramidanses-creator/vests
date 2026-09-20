import { useState } from 'react'
import { useOfficialRate, type RateStatus } from '../hooks/useOfficialRate'

function rateNote(rateStatus: RateStatus, officialRate: number | null) {
  if (rateStatus === 'loading') return 'טוען שער יציג...'
  if (rateStatus === 'error') return 'לא ניתן היה לטעון שער יציג עדכני — הזינו סכום כדי לחשב.'
  return `השער היציג הנוכחי: ${officialRate?.toFixed(4)} ₪ לדולר`
}

export function CurrencyConverter() {
  const { officialRate, rateStatus } = useOfficialRate()

  const [usd, setUsd] = useState('')
  const [ils, setIls] = useState('')

  const usdNum = Number(usd)
  const ilsNum = Number(ils)
  const hasUsd = usd.trim() !== '' && Number.isFinite(usdNum) && usdNum > 0
  const hasIls = ils.trim() !== '' && Number.isFinite(ilsNum) && ilsNum > 0

  function resetTotal() {
    setUsd('')
    setIls('')
  }

  let totalResultLine: string | null = null
  if (hasUsd && hasIls) {
    const impliedRate = ilsNum / usdNum
    totalResultLine = `השער שהיה באותו רגע: ${impliedRate.toFixed(4)} ₪ לדולר`
  } else if (hasUsd && officialRate) {
    totalResultLine = `לפי השער היציג: ${(usdNum * officialRate).toFixed(2)} ₪`
  } else if (hasIls && officialRate) {
    totalResultLine = `לפי השער היציג: $${(ilsNum / officialRate).toFixed(2)}`
  }

  const [quantity, setQuantity] = useState('')
  const [usdPerUnit, setUsdPerUnit] = useState('')
  const [ilsPerUnit, setIlsPerUnit] = useState('')

  const qtyNum = Number(quantity)
  const usdPerUnitNum = Number(usdPerUnit)
  const ilsPerUnitNum = Number(ilsPerUnit)
  const hasQty = quantity.trim() !== '' && Number.isFinite(qtyNum) && qtyNum > 0
  const hasUsdPerUnit = usdPerUnit.trim() !== '' && Number.isFinite(usdPerUnitNum) && usdPerUnitNum > 0
  const hasIlsPerUnit = ilsPerUnit.trim() !== '' && Number.isFinite(ilsPerUnitNum) && ilsPerUnitNum > 0

  function resetPerUnit() {
    setQuantity('')
    setUsdPerUnit('')
    setIlsPerUnit('')
  }

  let perUnitRateLine: string | null = null
  let resolvedUsdPerUnit: number | null = null
  let resolvedIlsPerUnit: number | null = null

  if (hasUsdPerUnit && hasIlsPerUnit) {
    resolvedUsdPerUnit = usdPerUnitNum
    resolvedIlsPerUnit = ilsPerUnitNum
    perUnitRateLine = `השער שהיה באותו רגע: ${(ilsPerUnitNum / usdPerUnitNum).toFixed(4)} ₪ לדולר`
  } else if (hasUsdPerUnit && officialRate) {
    resolvedUsdPerUnit = usdPerUnitNum
    resolvedIlsPerUnit = usdPerUnitNum * officialRate
    perUnitRateLine = `לפי השער היציג: ${resolvedIlsPerUnit.toFixed(2)} ₪ ליחידה`
  } else if (hasIlsPerUnit && officialRate) {
    resolvedIlsPerUnit = ilsPerUnitNum
    resolvedUsdPerUnit = ilsPerUnitNum / officialRate
    perUnitRateLine = `לפי השער היציג: $${resolvedUsdPerUnit.toFixed(2)} ליחידה`
  }

  const totalLine =
    hasQty && resolvedUsdPerUnit !== null && resolvedIlsPerUnit !== null
      ? `סה״כ ל-${qtyNum} יחידות: $${(qtyNum * resolvedUsdPerUnit).toFixed(2)} / ${(qtyNum * resolvedIlsPerUnit).toFixed(2)} ₪`
      : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">מחשבון המרה דולר / שקל</h2>
          <button onClick={resetTotal} className="text-xs text-slate-500 hover:text-slate-300">
            נקה
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            דולר ($)
            <input
              type="number"
              placeholder="0.00"
              value={usd}
              onChange={(e) => setUsd(e.target.value)}
              className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            שקל (₪)
            <input
              type="number"
              placeholder="0.00"
              value={ils}
              onChange={(e) => setIls(e.target.value)}
              className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-400">{totalResultLine ?? rateNote(rateStatus, officialRate)}</p>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">חישוב לפי כמות ועלות ליחידה</h2>
          <button onClick={resetPerUnit} className="text-xs text-slate-500 hover:text-slate-300">
            נקה
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            כמות יחידות
            <input
              type="number"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            עלות ליחידה ($)
            <input
              type="number"
              placeholder="0.00"
              value={usdPerUnit}
              onChange={(e) => setUsdPerUnit(e.target.value)}
              className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            עלות ליחידה (₪)
            <input
              type="number"
              placeholder="0.00"
              value={ilsPerUnit}
              onChange={(e) => setIlsPerUnit(e.target.value)}
              className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-400">{perUnitRateLine ?? rateNote(rateStatus, officialRate)}</p>
        {totalLine && <p className="mt-1 text-sm font-semibold text-slate-200">{totalLine}</p>}
      </div>
    </div>
  )
}
