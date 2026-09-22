import { useRef, useState } from 'react'
import type { DeletedProduct, Product } from '../types'
import { latestAutoBackupDate } from '../utils/persistence'

interface BackupFile {
  products: Partial<Product>[]
  deleted: { product: Partial<Product>; deletedAt: string }[]
}

interface Props {
  products: Product[]
  deleted: DeletedProduct[]
  onImport: (data: BackupFile) => void
}

export function BackupTools({ products, deleted, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const autoBackupDate = latestAutoBackupDate()

  function handleExport() {
    const data: BackupFile = { products, deleted }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vests-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    file
      .text()
      .then((text) => {
        const parsed = JSON.parse(text) as Partial<BackupFile>
        if (!Array.isArray(parsed.products)) {
          setError('קובץ לא תקין — לא נמצאה רשימת מוצרים.')
          return
        }
        const confirmed = window.confirm(
          `לייבא ${parsed.products.length} מוצרים? הפעולה תחליף את כל הנתונים הקיימים באפליקציה.`,
        )
        if (!confirmed) return
        onImport({ products: parsed.products, deleted: parsed.deleted ?? [] })
      })
      .catch(() => setError('לא הצלחתי לקרוא את הקובץ. ודאו שזה קובץ גיבוי JSON תקין.'))
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-400">
        כל הנתונים שמורים רק בדפדפן הזה. מומלץ לייצא גיבוי מדי פעם — ובמיוחד לפני מעבר למכשיר או דפדפן אחר.
      </p>
      <p className="text-xs text-slate-500">
        {autoBackupDate
          ? `גיבוי אוטומטי אחרון (בדפדפן זה): ${new Date(autoBackupDate).toLocaleDateString('he-IL')}`
          : 'עדיין לא נשמר גיבוי אוטומטי בדפדפן זה.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleExport}
          className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400"
        >
          ⬇️ ייצוא גיבוי
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
        >
          ⬆️ ייבוא גיבוי
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} className="hidden" />
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
}
