import { useEffect, useState } from 'react'

export type RateStatus = 'loading' | 'ok' | 'error'

export function useOfficialRate() {
  const [officialRate, setOfficialRate] = useState<number | null>(null)
  const [rateStatus, setRateStatus] = useState<RateStatus>('loading')

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

  return { officialRate, rateStatus }
}
