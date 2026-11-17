import { useEffect, useState } from 'react'
import { ARCHIVE_DAYS, listArchives, type ArchiveInfo } from '../cloud'
import { Button, Card, Icon, Sheet, inputCls } from '../components/ui'
import { useStore } from '../store'
import { downloadFile } from '../utils/pdf'

const CONFIRM_WORD = 'איפוס'

function daysLeft(a: ArchiveInfo) {
  return Math.max(0, Math.ceil((a.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
}

const fmtDateTime = (t: number) => new Date(t).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function backupFile(data: unknown): File {
  return new File([JSON.stringify(data, null, 2)], `pinkas-backup-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' })
}

/** Archives saved by a reset, restorable for 30 days. Shown also on the setup screen right after a reset. */
export function RestoreCard() {
  const { data, restoreArchive } = useStore()
  const [archives, setArchives] = useState<ArchiveInfo[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    listArchives()
      .then((list) => !cancelled && setArchives(list.filter((a) => a.expiresAt > Date.now())))
      .catch(() => !cancelled && setArchives([]))
    return () => {
      cancelled = true
    }
  }, [done])

  if (!archives?.length) return null
  const hasData = !!(data.business.name || data.docs.length || data.expenses.length)

  async function restore(a: ArchiveInfo) {
    const msg = hasData
      ? 'לשחזר את הנתונים? הנתונים הנוכחיים יישמרו בעצמם כגיבוי ל־30 יום, כך ששום דבר לא הולך לאיבוד.'
      : 'לשחזר את כל הנתונים מהגיבוי הזה?'
    if (!confirm(msg)) return
    setBusy(a.id)
    setError('')
    try {
      await restoreArchive(a)
      setDone((d) => !d)
      window.scrollTo(0, 0)
    } catch {
      setError('השחזור לא הצליח. בדקו שיש חיבור לאינטרנט ונסו שוב.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="space-y-3 ring-2 ring-violet/40">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Icon name="upload" /> שחזור חשבון
      </h2>
      <p className="text-sm text-ink-soft">גיבויים מאיפוס החשבון נשמרים {ARCHIVE_DAYS} יום, ואז נמחקים לצמיתות.</p>
      {archives.map((a) => (
        <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-lavender p-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">איפוס מ־{fmtDateTime(a.createdAt)}</p>
            <p className="text-sm text-ink-soft">
              {a.counts.docs} מסמכים · {a.counts.customers} לקוחות · {a.counts.expenses} הוצאות · נותרו {daysLeft(a)} ימים
            </p>
          </div>
          <Button onClick={() => restore(a)} disabled={!!busy} className="shrink-0 !py-2">
            {busy === a.id ? 'משחזר…' : 'שחזור'}
          </Button>
        </div>
      ))}
      {error && <p className="text-sm text-orange">{error}</p>}
    </Card>
  )
}

export function ResetCard() {
  const [open, setOpen] = useState(false)
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">איפוס החשבון</h2>
      <p className="text-sm text-ink-soft">
        מוחק את כל הנתונים — מסמכים, לקוחות, הוצאות, פריטים והגדרות — ומתחיל מחדש. אפשר לשחזר הכל במשך {ARCHIVE_DAYS} יום.
      </p>
      <Button variant="danger" className="w-full" onClick={() => setOpen(true)}>
        <Icon name="trash" size={18} /> איפוס החשבון
      </Button>
      {open && <ResetSheet onClose={() => setOpen(false)} />}
    </Card>
  )
}

function ResetSheet({ onClose }: { onClose: () => void }) {
  const { data, sync, resetAccount } = useStore()
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const issued = data.docs.filter((d) => d.status === 'issued').length
  const online = sync.status !== 'error' && navigator.onLine

  async function reset() {
    setBusy(true)
    setError('')
    try {
      await resetAccount()
      onClose()
      window.scrollTo(0, 0)
    } catch {
      setError('לא הצלחתי לשמור את הגיבוי בענן, ולכן לא מחקתי כלום. בדקו את החיבור לאינטרנט ונסו שוב.')
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={busy ? () => {} : onClose} title="איפוס החשבון">
      <div className="space-y-4">
        <div className="rounded-2xl bg-mist p-4 text-sm">
          <p className="mb-2 font-semibold">מה יימחק:</p>
          <p>
            {issued} מסמכים שהופקו · {data.customers.length} לקוחות · {data.expenses.length} הוצאות · {data.items.length} פריטים · {data.suppliers.length} ספקים, וגם פרטי העסק.
          </p>
          <p className="mt-2">
            עותק מלא נשמר בענן ל־<b>{ARCHIVE_DAYS} יום</b>, ואפשר לשחזר אותו מ"פרטי העסק". אחרי {ARCHIVE_DAYS} יום הוא נמחק לצמיתות.
          </p>
        </div>

        {issued > 0 && (
          <div className="rounded-2xl bg-peach p-4 text-sm text-ink">
            <p className="font-semibold text-orange">חשוב: חובה לשמור מסמכים 7 שנים</p>
            <p className="mt-1">
              לפי החוק צריך לשמור כל חשבונית וקבלה שהופקה 7 שנים. הורידו קובץ גיבוי לפני האיפוס, ושמרו אותו במקום בטוח (או שלחו לרו״ח את תיקיית הדוחות).
            </p>
            <Button variant="secondary" className="mt-3 w-full" onClick={() => downloadFile(backupFile(data))}>
              <Icon name="download" size={18} /> הורדת קובץ גיבוי
            </Button>
          </div>
        )}

        {!online && <p className="rounded-xl bg-peach p-3 text-sm text-orange">צריך חיבור לאינטרנט כדי לשמור את הגיבוי בענן לפני האיפוס.</p>}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink-soft">
            כדי לאשר, כתבו <b className="text-ink">{CONFIRM_WORD}</b>
          </span>
          <input value={word} onChange={(e) => setWord(e.target.value)} className={inputCls} autoComplete="off" disabled={busy} />
        </label>

        {error && <p className="rounded-xl bg-peach p-3 text-sm text-orange">{error}</p>}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={busy}>
            ביטול
          </Button>
          <Button onClick={reset} disabled={word.trim() !== CONFIRM_WORD || busy || !online} className="flex-[1.5] !bg-orange">
            {busy ? 'שומר גיבוי ומאפס…' : 'איפוס החשבון'}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
