import { useState } from 'react'
import { Button, Card, Icon } from '../components/ui'
import { useStore } from '../store'
import { computeUsage, fmtBytes, type Usage } from '../utils/storageUsage'

const FREE_QUOTA = 1024 * 1024 * 1024
const KIND_ICON = { receipt: 'wallet', item: 'receipt', line: 'doc', logo: 'image' } as const

/** How much cloud space this account takes, image by image. */
export function StorageCard() {
  const { data } = useStore()
  const [usage, setUsage] = useState<Usage | null>(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    try {
      setUsage(await computeUsage(data))
    } finally {
      setBusy(false)
    }
  }

  const pct = usage ? (usage.total / FREE_QUOTA) * 100 : 0

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">אחסון בענן</h2>
      {!usage ? (
        <>
          <p className="text-sm text-ink-soft">כמה מקום תופסים הנתונים והתמונות של החשבון הזה.</p>
          <Button variant="secondary" onClick={run} disabled={busy} className="w-full">
            {busy ? 'מחשב…' : 'חישוב השימוש'}
          </Button>
        </>
      ) : (
        <>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{fmtBytes(usage.total)}</span>
              <span className="text-sm text-ink-soft">מתוך 1GB בחינם · {pct < 0.01 ? 'פחות מ־0.01' : pct.toFixed(2)}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-mint" style={{ width: `${Math.max(pct, 0.5)}%` }} />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">מסמכים, לקוחות והגדרות</span>
            <span>{fmtBytes(usage.dataBytes)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">תמונות ({usage.images.length})</span>
            <span>{fmtBytes(usage.images.reduce((s, i) => s + i.bytes, 0))}</span>
          </div>
          {usage.images.length > 0 && (
            <div className="divide-y divide-line rounded-2xl bg-mist px-3">
              {usage.images.map((img, i) => (
                <div key={i} className="flex items-center gap-2 py-2 text-sm">
                  <Icon name={KIND_ICON[img.kind]} size={16} className="shrink-0 text-ink-soft" />
                  <span className="min-w-0 flex-1 truncate">{img.label}</span>
                  <span className="shrink-0 font-medium">{fmtBytes(img.bytes)}</span>
                </div>
              ))}
            </div>
          )}
          {usage.unknown > 0 && <p className="text-xs text-orange">{usage.unknown} קבלות לא נמדדו (אין חיבור לענן).</p>}
          <p className="text-xs text-ink-soft">
            הערכה. ה־1GB החינמי משותף לכל המשתמשים של האפליקציה ולאפליקציית המעקב (אותו פרויקט Firebase). תמונת מוצר נשמרת בכל מסמך שהיא מופיעה בו.
          </p>
          <button onClick={run} className="text-sm font-medium text-indigo">
            חישוב מחדש
          </button>
        </>
      )}
    </Card>
  )
}
