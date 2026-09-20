import { useEffect, useState } from 'react'

export function CurrencyConverter() {
  const [usd, setUsd] = useState('')
  const [ils, setIls] = useState('')
  const [officialRate, setOfficialRate] = useState<number | null>(null)
  const [rateStatus, setRateStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    fetch('https://open.er-api.com/v6/latest/USD')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const rate = data?.rates?.ILS
        if (typeof rate === 'number') {
          setOfficialRate(rate)
          setRateStatus('ok')
        } else {
          setRateStatus('error')
        }
      })
      .catch(() => {
        if (!cancelled) setRateStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const usdNum = Number(usd)
  const ilsNum = Number(ils)
  const hasUsd = usd.trim() !== '' && Number.isFinite(usdNum) && usdNum > 0
  const hasIls = ils.trim() !== '' && Number.isFinite(ilsNum) && ilsNum > 0

  function reset() {
    setUsd('')
    setIls('')
  }

  let resultLine: string | null = null
  if (hasUsd && hasIls) {
    const impliedRate = ilsNum / usdNum
    resultLine = `השער שהיה באותו רגע: ${impliedRate.toFixed(4)} ₪ לדולר`
  } else if (hasUsd && officialRate) {
    resultLine = `לפי השער היציג: ${(usdNum * officialRate).toFixed(2)} ₪`
  } else if (hasIls && officialRate) {
    resultLine = `לפי השער היציג: $${(ilsNum / officialRate).toFixed(2)}`
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">מחשבון המרה דולר / שקל</h2>
        <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">
          נקה
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          דולר ($)
          <input
            type="number"
            placeholder="0.00"
            value={usd}
            onChange={(e) => setUsd(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          שקל (₪)
          <input
            type="number"
            placeholder="0.00"
            value={ils}
            onChange={(e) => setIls(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {resultLine ??
          (rateStatus === 'loading'
            ? 'טוען שער יציג...'
            : rateStatus === 'error'
              ? 'לא ניתן היה לטעון שער יציג עדכני — הזינו סכום כדי לחשב.'
              : `השער היציג הנוכחי: ${officialRate?.toFixed(4)} ₪ לדולר`)}
      </p>
    </div>
  )
}
