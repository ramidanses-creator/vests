import { useMemo, useRef, useState } from 'react'
import { Button, Card, EmptyState, Field, Icon, NumberInput, Sheet, Toggle, inputCls } from '../components/ui'
import { replace } from '../router'
import { useStore } from '../store'
import type { Expense } from '../types'
import { EXPENSE_CATEGORIES } from '../utils/docs'
import { compressImage, deleteFile, putFile, useFileUrl } from '../utils/fileStore'
import { fmtDate, ils, monthLabel, round2, todayISO, uid } from '../utils/format'

function blankExpense(): Expense {
  return { id: uid(), date: todayISO(), supplier: '', description: '', category: EXPENSE_CATEGORIES[0], amount: 0, vat: 0, createdAt: new Date().toISOString() }
}

export function Expenses({ autoAdd }: { autoAdd: boolean }) {
  const { data } = useStore()
  const [pickerOpen, setPickerOpen] = useState(autoAdd)
  const [editing, setEditing] = useState<{ expense: Expense; file?: Blob } | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of [...data.expenses].sort((a, b) => b.date.localeCompare(a.date))) {
      const k = e.date.slice(0, 7)
      map.set(k, [...(map.get(k) ?? []), e])
    }
    return [...map.entries()]
  }, [data.expenses])

  function closePicker() {
    setPickerOpen(false)
    if (autoAdd) replace('/expenses')
  }

  return (
    <div className="pb-36">
      <header className="flex items-end justify-between px-5 pt-[max(env(safe-area-inset-top),20px)]">
        <h1 className="text-3xl font-semibold">הוצאות</h1>
        <Button variant="lime" onClick={() => setPickerOpen(true)} className="!bg-peach !py-2.5">
          <Icon name="upload" size={18} /> העלאת הוצאה
        </Button>
      </header>

      <div className="mt-4 space-y-4 px-5">
        {groups.length === 0 ? (
          <EmptyState icon="wallet" title="בלי לאבד הוצאות" text="צלמו קבלה או חשבונית ספק ושמרו אותה כאן — הכל מוכן לדוח לרו״ח." />
        ) : (
          groups.map(([month, list]) => (
            <Card key={month} className="!p-3">
              <div className="flex items-baseline justify-between px-2 pb-1">
                <h2 className="text-sm font-semibold text-ink-soft">{monthLabel(month)}</h2>
                <span className="text-sm font-semibold">{ils(list.reduce((s, e) => s + e.amount, 0))}</span>
              </div>
              {list.map((e) => (
                <ExpenseRow key={e.id} expense={e} onClick={() => setEditing({ expense: e })} />
              ))}
            </Card>
          ))
        )}
      </div>

      <UploadPicker
        open={pickerOpen}
        onClose={closePicker}
        onPicked={(file) => {
          closePicker()
          setEditing({ expense: blankExpense(), file })
        }}
      />
      {editing && <ExpenseForm key={editing.expense.id} initial={editing.expense} newFile={editing.file} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ExpenseRow({ expense, onClick }: { expense: Expense; onClick: () => void }) {
  const url = useFileUrl(expense.fileType?.startsWith('image/') ? expense.fileId : undefined)
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl p-2 text-right hover:bg-mist">
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-peach">
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <Icon name={expense.fileId ? 'doc' : 'wallet'} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{expense.supplier || expense.description || 'הוצאה'}</span>
        <span className="block truncate text-sm text-ink-soft">
          {expense.category} · {fmtDate(expense.date)}
        </span>
      </span>
      <span className="font-semibold">{ils(expense.amount)}</span>
    </button>
  )
}

function UploadPicker({ open, onClose, onPicked }: { open: boolean; onClose: () => void; onPicked: (file?: Blob) => void }) {
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const files = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    const blob = await compressImage(f)
    setBusy(false)
    onPicked(blob)
  }

  const tiles = [
    { icon: 'camera', label: 'מצלמה', tone: 'bg-[#fff1b8]', onClick: () => camera.current?.click() },
    { icon: 'image', label: 'גלריה', tone: 'bg-[#ffdede]', onClick: () => gallery.current?.click() },
    { icon: 'doc', label: 'קובץ שמור', tone: 'bg-peach', onClick: () => files.current?.click() },
    { icon: 'file-plus', label: 'ללא קובץ', tone: 'bg-lavender', onClick: () => onPicked(undefined) },
  ]

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="mb-6 text-center text-2xl font-bold">העלאת הוצאה חדשה</h2>
      <div className="mx-auto grid max-w-xs grid-cols-2 gap-x-6 gap-y-6 pb-4">
        {tiles.map((t) => (
          <button key={t.label} onClick={t.onClick} disabled={busy} className="flex flex-col items-center gap-2">
            <span className={`grid h-24 w-24 place-items-center rounded-3xl ${t.tone} transition active:scale-95`}>
              <Icon name={t.icon} size={34} strokeWidth={1.5} />
            </span>
            <span className="text-lg">{t.label}</span>
          </button>
        ))}
      </div>
      {busy && <p className="text-center text-ink-soft">מעבד את הקובץ…</p>}
      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={handle} className="hidden" />
      <input ref={gallery} type="file" accept="image/*" onChange={handle} className="hidden" />
      <input ref={files} type="file" accept="image/*,application/pdf" onChange={handle} className="hidden" />
    </Sheet>
  )
}

function ExpenseForm({ initial, newFile, onClose }: { initial: Expense; newFile?: Blob; onClose: () => void }) {
  const { data, upsertExpense, deleteExpense } = useStore()
  const exists = data.expenses.some((e) => e.id === initial.id)
  const [e, setE] = useState<Expense>(initial)
  const [autoVat, setAutoVat] = useState(!exists && data.business.type !== 'exempt')
  const storedUrl = useFileUrl(newFile ? undefined : e.fileId)
  const [newUrl] = useState(() => (newFile ? URL.createObjectURL(newFile) : undefined))
  const url = newUrl ?? storedUrl
  const fileType = newFile?.type ?? e.fileType
  const rate = data.business.vatRate
  const showVat = data.business.type !== 'exempt'

  const set = (patch: Partial<Expense>) => setE((x) => ({ ...x, ...patch }))
  const vat = autoVat ? round2((e.amount * rate) / (100 + rate)) : e.vat

  async function save() {
    let next = { ...e, vat: showVat ? vat : 0 }
    if (newFile) {
      const fileId = uid()
      await putFile(fileId, newFile)
      if (e.fileId) await deleteFile(e.fileId).catch(() => {})
      next = { ...next, fileId, fileType: newFile.type }
    }
    upsertExpense(next)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={exists ? 'פרטי הוצאה' : 'הוצאה חדשה'}>
      <form
        className="space-y-3"
        onSubmit={(ev) => {
          ev.preventDefault()
          if (e.amount > 0) void save()
        }}
      >
        {url &&
          (fileType === 'application/pdf' ? (
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-peach p-3 font-medium">
              <Icon name="doc" /> פתיחת קובץ PDF
            </a>
          ) : (
            <a href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="קבלה" className="max-h-56 w-full rounded-2xl bg-mist object-contain" />
            </a>
          ))}
        <Field label="ספק / בית עסק">
          <input value={e.supplier} onChange={(x) => set({ supplier: x.target.value })} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="סכום כולל">
            <NumberInput value={e.amount} onChange={(amount) => set({ amount })} />
          </Field>
          <Field label="תאריך">
            <input type="date" value={e.date} onChange={(x) => set({ date: x.target.value })} className={inputCls} />
          </Field>
        </div>
        {showVat && (
          <div className="space-y-2 rounded-2xl bg-mist p-3">
            <Toggle checked={autoVat} onChange={setAutoVat} label={`חישוב מע״מ אוטומטי (${rate}%)`} />
            {autoVat ? (
              <p className="text-sm text-ink-soft">מע״מ: {ils(vat)} · לפני מע״מ: {ils(e.amount - vat)}</p>
            ) : (
              <Field label="מע״מ בחשבונית (0 אם אין)">
                <NumberInput value={e.vat} onChange={(v) => set({ vat: v })} />
              </Field>
            )}
          </div>
        )}
        <Field label="קטגוריה">
          <select value={e.category} onChange={(x) => set({ category: x.target.value })} className={inputCls}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="תיאור">
          <input value={e.description} onChange={(x) => set({ description: x.target.value })} className={inputCls} />
        </Field>
        <div className="flex gap-2 pt-2">
          {exists && (
            <Button
              variant="danger"
              onClick={() => {
                if (!confirm('למחוק את ההוצאה?')) return
                if (e.fileId) void deleteFile(e.fileId).catch(() => {})
                deleteExpense(e.id)
                onClose()
              }}
            >
              <Icon name="trash" size={18} />
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={!(e.amount > 0)}>
            שמירה
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
