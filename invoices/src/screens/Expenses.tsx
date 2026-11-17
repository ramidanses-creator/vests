import { useMemo, useRef, useState } from 'react'
import { Button, Card, EmptyState, Field, Icon, NumberInput, Sheet, Toggle, UnderlineTabs, inputCls } from '../components/ui'
import { replace } from '../router'
import { useStore } from '../store'
import type { Expense, ExpenseType, Supplier } from '../types'
import { EXPENSE_CATEGORIES, expenseCategories, isApproved, isPending } from '../utils/docs'
import { compressImage, deleteFile, enhanceScan, putFile, useFileUrl } from '../utils/fileStore'
import { fmtDate, ils, monthLabel, round2, todayISO, uid } from '../utils/format'
import { SearchBox } from './Documents'

type Tab = 'pending' | 'approved' | 'types' | 'suppliers'

const TABS: { value: Tab; label: string }[] = [
  { value: 'pending', label: 'הוצאות לאישור' },
  { value: 'approved', label: 'הוצאות מאושרות' },
  { value: 'types', label: 'סוגי הוצאות' },
  { value: 'suppliers', label: 'ספקים' },
]

function blankExpense(): Expense {
  return { id: uid(), status: 'pending', date: todayISO(), supplier: '', description: '', category: EXPENSE_CATEGORIES[0], amount: 0, vat: 0, createdAt: new Date().toISOString() }
}

export function Expenses({ tab, autoAdd }: { tab: string; autoAdd: boolean }) {
  const { data } = useStore()
  const current = (TABS.some((t) => t.value === tab) ? tab : 'pending') as Tab
  const [pickerOpen, setPickerOpen] = useState(autoAdd)
  const [editing, setEditing] = useState<{ expense: Expense; file?: Blob } | null>(null)
  const pendingCount = data.expenses.filter(isPending).length

  function closePicker() {
    setPickerOpen(false)
    if (autoAdd) replace('/expenses')
  }

  const tabs = TABS.map((t) => (t.value === 'pending' && pendingCount ? { ...t, label: `${t.label} (${pendingCount})` } : t))

  return (
    <div className="pb-36">
      <UnderlineTabs value={current} onChange={(v) => replace(`/expenses?tab=${v}`)} options={tabs} accent="bg-orange" />
      {current === 'pending' && <Pending onUpload={() => setPickerOpen(true)} onOpen={(e) => setEditing({ expense: e })} />}
      {current === 'approved' && <Approved onUpload={() => setPickerOpen(true)} onOpen={(e) => setEditing({ expense: e })} />}
      {current === 'types' && <Types />}
      {current === 'suppliers' && <Suppliers onOpen={(e) => setEditing({ expense: e })} />}

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

function UploadButton({ onClick, label = 'העלאת הוצאה' }: { onClick: () => void; label?: string }) {
  return (
    <Button onClick={onClick} className="mt-2 !rounded-full !bg-mint px-10">
      {label}
    </Button>
  )
}

function Pending({ onUpload, onOpen }: { onUpload: () => void; onOpen: (e: Expense) => void }) {
  const { data, upsertExpense } = useStore()
  const list = useMemo(() => data.expenses.filter(isPending).sort((a, b) => b.date.localeCompare(a.date)), [data.expenses])
  const ready = list.filter((e) => e.amount > 0)

  if (list.length === 0)
    return (
      <EmptyState
        icon="upload"
        title="להפוך הוצאות למאושרות"
        text="מצלמים קבלה או חשבונית של ספק, והיא מחכה כאן לאישור שלך. רק הוצאות מאושרות נכנסות לדוחות ולתיקיית רו״ח."
        action={<UploadButton onClick={onUpload} />}
      />
    )

  return (
    <div className="space-y-3 px-4 pt-4">
      <div className="flex gap-2">
        <Button onClick={onUpload} variant="secondary" className="flex-1">
          <Icon name="upload" size={18} /> העלאת הוצאה
        </Button>
        {ready.length > 1 && (
          <Button onClick={() => ready.forEach((e) => upsertExpense({ ...e, status: 'approved' }))} className="flex-1 !bg-mint">
            <Icon name="check" size={18} /> אישור הכל ({ready.length})
          </Button>
        )}
      </div>
      <Card className="!p-2">
        {list.map((e) => (
          <div key={e.id} className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <ExpenseRow expense={e} onClick={() => onOpen(e)} />
            </div>
            <button
              onClick={() => (e.amount > 0 ? upsertExpense({ ...e, status: 'approved' }) : onOpen(e))}
              className="shrink-0 rounded-xl bg-mint px-3 py-2 text-sm font-semibold text-white"
            >
              {e.amount > 0 ? 'אישור' : 'השלמה'}
            </button>
          </div>
        ))}
      </Card>
      <p className="px-2 text-xs text-ink-soft">הוצאה בלי סכום צריך להשלים לפני האישור.</p>
    </div>
  )
}

function Approved({ onUpload, onOpen }: { onUpload: () => void; onOpen: (e: Expense) => void }) {
  const { data } = useStore()
  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of data.expenses.filter(isApproved).sort((a, b) => b.date.localeCompare(a.date))) map.set(e.date.slice(0, 7), [...(map.get(e.date.slice(0, 7)) ?? []), e])
    return [...map.entries()]
  }, [data.expenses])

  if (groups.length === 0)
    return (
      <EmptyState
        icon="check"
        title="כאן יחכו ההוצאות שאישרת"
        text="כל ההוצאות שאושרו יופיעו כאן לפי חודשים. בסוף החודש שולחים אותן בלחיצה לרו״ח."
        action={<UploadButton onClick={onUpload} />}
      />
    )

  return (
    <div className="space-y-4 px-4 pt-4">
      {groups.map(([month, list]) => (
        <Card key={month} className="!p-3">
          <div className="flex items-baseline justify-between px-2 pb-1">
            <h2 className="text-sm font-semibold text-ink-soft">{monthLabel(month)}</h2>
            <span className="text-sm font-semibold">{ils(round2(list.reduce((s, e) => s + e.amount, 0)))}</span>
          </div>
          {list.map((e) => (
            <ExpenseRow key={e.id} expense={e} onClick={() => onOpen(e)} />
          ))}
        </Card>
      ))}
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
          {fmtDate(expense.date)} · {expense.category}
        </span>
      </span>
      <span className="shrink-0 font-semibold">{expense.amount > 0 ? ils(expense.amount) : '—'}</span>
    </button>
  )
}

function UploadPicker({ open, onClose, onPicked }: { open: boolean; onClose: () => void; onPicked: (file?: Blob) => void }) {
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const files = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handle(e: React.ChangeEvent<HTMLInputElement>, scan: boolean) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    let blob = await compressImage(f)
    if (scan) blob = await enhanceScan(blob)
    setBusy(false)
    onPicked(blob)
  }

  const tiles = [
    { icon: 'camera', label: 'סריקה במצלמה', tone: 'bg-[#fff1b8]', onClick: () => camera.current?.click() },
    { icon: 'image', label: 'גלריה', tone: 'bg-[#ffdede]', onClick: () => gallery.current?.click() },
    { icon: 'doc', label: 'קובץ שמור', tone: 'bg-[#fff6dc]', onClick: () => files.current?.click() },
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
      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={(e) => handle(e, true)} className="hidden" />
      <input ref={gallery} type="file" accept="image/*" onChange={(e) => handle(e, false)} className="hidden" />
      <input ref={files} type="file" accept="image/*,application/pdf" onChange={(e) => handle(e, false)} className="hidden" />
    </Sheet>
  )
}

function ExpenseForm({ initial, newFile, onClose }: { initial: Expense; newFile?: Blob; onClose: () => void }) {
  const { data, upsertExpense, deleteExpense } = useStore()
  const exists = data.expenses.some((e) => e.id === initial.id)
  const [e, setE] = useState<Expense>(initial)
  const [autoVat, setAutoVat] = useState(data.business.type !== 'exempt' && (!exists || (initial.status === 'pending' && !initial.vat)))
  const storedUrl = useFileUrl(newFile ? undefined : e.fileId)
  const [newUrl] = useState(() => (newFile ? URL.createObjectURL(newFile) : undefined))
  const url = newUrl ?? storedUrl
  const fileType = newFile?.type ?? e.fileType
  const rate = data.business.vatRate
  const showVat = data.business.type !== 'exempt'
  const categories = expenseCategories(data)
  const pending = isPending(e)

  const set = (patch: Partial<Expense>) => setE((x) => ({ ...x, ...patch }))
  const vat = autoVat ? round2((e.amount * rate) / (100 + rate)) : e.vat

  async function save(approve: boolean) {
    let next: Expense = { ...e, supplier: e.supplier.trim(), vat: showVat ? vat : 0, status: approve ? 'approved' : e.status ?? 'pending' }
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
    <Sheet open onClose={onClose} title={exists ? (pending ? 'הוצאה לאישור' : 'פרטי הוצאה') : 'הוצאה חדשה'}>
      <form
        className="space-y-3"
        onSubmit={(ev) => {
          ev.preventDefault()
          void save(pending ? false : true)
        }}
      >
        {url &&
          (fileType === 'application/pdf' ? (
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-peach p-3 font-medium">
              <Icon name="doc" /> פתיחת קובץ PDF
            </a>
          ) : (
            <a href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="קבלה" className="max-h-60 w-full rounded-2xl bg-mist object-contain" />
            </a>
          ))}
        <Field label="ספק / בית עסק">
          <input value={e.supplier} onChange={(x) => set({ supplier: x.target.value })} list="supplier-names" className={inputCls} />
          <datalist id="supplier-names">
            {data.suppliers.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
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
              <p className="text-sm text-ink-soft">
                מע״מ: {ils(vat)} · לפני מע״מ: {ils(round2(e.amount - vat))}
              </p>
            ) : (
              <Field label="מע״מ בחשבונית (0 אם אין)">
                <NumberInput value={e.vat} onChange={(v) => set({ vat: v })} />
              </Field>
            )}
          </div>
        )}
        <Field label="סוג הוצאה">
          <select value={e.category} onChange={(x) => set({ category: x.target.value })} className={inputCls}>
            {[...new Set([...categories, e.category])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="תיאור (אופציונלי)">
          <input value={e.description} onChange={(x) => set({ description: x.target.value })} className={inputCls} />
        </Field>
        <div className="flex gap-2 pt-2">
          {exists && (
            <Button
              variant="danger"
              onClick={() => {
                if (!confirm('למחוק את ההוצאה?')) return
                if (e.fileId) void deleteFile(e.fileId).catch(() => {})
                // A fixed monthly expense is kept as "skipped", otherwise it would be created again.
                if (e.recurringTypeId) upsertExpense({ ...e, status: 'skipped' })
                else deleteExpense(e.id)
                onClose()
              }}
            >
              <Icon name="trash" size={18} />
            </Button>
          )}
          {pending ? (
            <>
              <Button type="submit" variant="secondary" className="flex-1">
                שמירה לאישור
              </Button>
              <Button onClick={() => void save(true)} className="flex-1 !bg-mint" disabled={!(e.amount > 0)}>
                <Icon name="check" size={18} /> אישור
              </Button>
            </>
          ) : (
            <Button type="submit" className="flex-1" disabled={!(e.amount > 0)}>
              שמירה
            </Button>
          )}
        </div>
      </form>
    </Sheet>
  )
}

function Types() {
  const { data, remove } = useStore()
  const [editing, setEditing] = useState<ExpenseType | null>(null)
  const blank = (): ExpenseType => ({ id: uid(), name: '', recurring: false, monthlyAmount: 0, dayOfMonth: 1, supplier: '', createdAt: new Date().toISOString() })
  const builtIn = EXPENSE_CATEGORIES.filter((c) => !data.expenseTypes.some((t) => t.name === c))

  return (
    <div className="space-y-4 px-4 pt-4">
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">סוגי הוצאות שלי</h2>
          <Button variant="lime" onClick={() => setEditing(blank())} className="!py-2">
            <Icon name="plus" size={18} /> סוג
          </Button>
        </div>
        {data.expenseTypes.length === 0 ? (
          <p className="text-sm text-ink-soft">
            כדי שניהול ההוצאות יהיה לך נוח, אפשר להגדיר מראש את ההוצאות החודשיות הקבועות (שכירות, טלפון, הנהלת חשבונות…) — והן ייווצרו לבד כל חודש ויחכו לאישור.
          </p>
        ) : (
          data.expenseTypes.map((t) => (
            <button key={t.id} onClick={() => setEditing(t)} className="flex w-full items-center gap-3 rounded-xl p-2 text-right hover:bg-mist">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-peach">
                <Icon name={t.recurring ? 'calendar' : 'wallet'} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t.name}</span>
                {t.recurring && (
                  <span className="block text-sm text-ink-soft">
                    קבועה · {ils(t.monthlyAmount)} כל חודש ב־{t.dayOfMonth} לחודש
                  </span>
                )}
              </span>
            </button>
          ))
        )}
      </Card>
      <Card>
        <h2 className="mb-2 font-bold text-ink-soft">סוגים מובנים</h2>
        <div className="flex flex-wrap gap-2">
          {builtIn.map((c) => (
            <span key={c} className="rounded-lg bg-mist px-3 py-1.5 text-sm">
              {c}
            </span>
          ))}
        </div>
      </Card>
      {editing && (
        <TypeForm
          key={editing.id}
          initial={editing}
          exists={data.expenseTypes.some((t) => t.id === editing.id)}
          onClose={() => setEditing(null)}
          onDelete={() => {
            remove('expenseTypes', editing.id)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function TypeForm({ initial, exists, onClose, onDelete }: { initial: ExpenseType; exists: boolean; onClose: () => void; onDelete: () => void }) {
  const { upsert, data } = useStore()
  const [t, setT] = useState(initial)
  const set = (patch: Partial<ExpenseType>) => setT((x) => ({ ...x, ...patch }))
  return (
    <Sheet open onClose={onClose} title={exists ? 'עריכת סוג הוצאה' : 'סוג הוצאה חדש'}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!t.name.trim()) return
          upsert('expenseTypes', { ...t, name: t.name.trim(), dayOfMonth: Math.min(28, Math.max(1, Math.floor(t.dayOfMonth || 1))) })
          onClose()
        }}
      >
        <Field label="שם">
          <input autoFocus value={t.name} onChange={(e) => set({ name: e.target.value })} placeholder="לדוגמה: שכירות" required className={inputCls} />
        </Field>
        <div className="rounded-2xl bg-mist p-3">
          <Toggle checked={t.recurring} onChange={(recurring) => set({ recurring })} label="הוצאה חודשית קבועה" />
          {t.recurring && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label={data.business.type === 'exempt' ? 'סכום חודשי' : 'סכום חודשי (כולל מע״מ)'}>
                  <NumberInput value={t.monthlyAmount} onChange={(monthlyAmount) => set({ monthlyAmount })} />
                </Field>
                <Field label="יום בחודש" hint="1–28">
                  <NumberInput value={t.dayOfMonth} onChange={(dayOfMonth) => set({ dayOfMonth })} placeholder="1" />
                </Field>
              </div>
              <Field label="ספק">
                <input value={t.supplier} onChange={(e) => set({ supplier: e.target.value })} list="type-suppliers" className={inputCls} />
                <datalist id="type-suppliers">
                  {data.suppliers.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </Field>
              <p className="text-xs text-ink-soft">בכל חודש, ביום שנקבע, תיווצר הוצאה שתחכה לאישור שלך ב"הוצאות לאישור".</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          {exists && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm('למחוק את סוג ההוצאה? הוצאות קיימות לא יימחקו.')) onDelete()
              }}
            >
              <Icon name="trash" size={18} />
            </Button>
          )}
          <Button type="submit" className="flex-1">
            שמירה
          </Button>
        </div>
      </form>
    </Sheet>
  )
}

function Suppliers({ onOpen }: { onOpen: (e: Expense) => void }) {
  const { data, remove } = useStore()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [viewing, setViewing] = useState<Supplier | null>(null)
  const blank = (): Supplier => ({ id: uid(), name: '', taxId: '', phone: '', email: '', createdAt: new Date().toISOString() })

  const rows = useMemo(
    () =>
      data.suppliers
        .filter((s) => !q.trim() || s.name.includes(q.trim()))
        .map((s) => {
          const list = data.expenses.filter((e) => e.supplier === s.name && isApproved(e))
          return { s, count: list.length, total: list.reduce((sum, e) => sum + e.amount, 0) }
        })
        .sort((a, b) => b.total - a.total),
    [data.suppliers, data.expenses, q],
  )

  if (data.suppliers.length === 0 && !editing)
    return (
      <EmptyState
        icon="users"
        title="רשימת הספקים שלך"
        text="כאן יופיעו פרטי הספקים. אפשר להוסיף ספקים ידנית, והרשימה מתעדכנת גם לבד כשמעלים הוצאות עם שם ספק."
        action={<UploadButton onClick={() => setEditing(blank())} label="הוספת ספק חדש" />}
      />
    )

  const viewingExpenses = viewing ? data.expenses.filter((e) => e.supplier === viewing.name).sort((a, b) => b.date.localeCompare(a.date)) : []

  return (
    <div className="space-y-4 px-4 pt-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchBox value={q} onChange={setQ} placeholder="חיפוש ספק" />
        </div>
        <Button variant="lime" onClick={() => setEditing(blank())} className="shrink-0 !py-2.5">
          <Icon name="plus" size={18} /> ספק
        </Button>
      </div>
      <Card className="!p-2">
        {rows.map(({ s, count, total }) => (
          <button key={s.id} onClick={() => setViewing(s)} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-right hover:bg-mist">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-peach font-semibold">{s.name.slice(0, 1)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{s.name}</span>
              <span className="block text-sm text-ink-soft">{count} הוצאות</span>
            </span>
            <span className="font-semibold">{ils(round2(total))}</span>
          </button>
        ))}
      </Card>

      {viewing && (
        <Sheet open onClose={() => setViewing(null)} title={viewing.name}>
          <div className="space-y-3">
            {(viewing.taxId || viewing.phone || viewing.email) && (
              <p className="text-ink-soft" dir="auto">
                {[viewing.taxId && `ח.פ. ${viewing.taxId}`, viewing.phone, viewing.email].filter(Boolean).join(' · ')}
              </p>
            )}
            {viewingExpenses.length === 0 ? (
              <p className="text-ink-soft">עוד אין הוצאות מהספק הזה.</p>
            ) : (
              viewingExpenses.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  onClick={() => {
                    setViewing(null)
                    onOpen(e)
                  }}
                />
              ))
            )}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setEditing(viewing)
                setViewing(null)
              }}
            >
              <Icon name="edit" size={18} /> עריכת פרטי הספק
            </Button>
          </div>
        </Sheet>
      )}

      {editing && (
        <SupplierForm
          key={editing.id}
          initial={editing}
          exists={data.suppliers.some((s) => s.id === editing.id)}
          onClose={() => setEditing(null)}
          onDelete={() => {
            remove('suppliers', editing.id)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function SupplierForm({ initial, exists, onClose, onDelete }: { initial: Supplier; exists: boolean; onClose: () => void; onDelete: () => void }) {
  const { upsert } = useStore()
  const [s, setS] = useState(initial)
  const set = (patch: Partial<Supplier>) => setS((x) => ({ ...x, ...patch }))
  return (
    <Sheet open onClose={onClose} title={exists ? 'עריכת ספק' : 'ספק חדש'}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!s.name.trim()) return
          upsert('suppliers', { ...s, name: s.name.trim() })
          onClose()
        }}
      >
        <Field label="שם הספק">
          <input autoFocus value={s.name} onChange={(e) => set({ name: e.target.value })} required className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ח.פ. / ע.מ.">
            <input value={s.taxId} onChange={(e) => set({ taxId: e.target.value })} inputMode="numeric" dir="ltr" className={`${inputCls} text-right`} />
          </Field>
          <Field label="טלפון">
            <input value={s.phone} onChange={(e) => set({ phone: e.target.value })} type="tel" dir="ltr" className={`${inputCls} text-right`} />
          </Field>
        </div>
        <Field label="אימייל">
          <input value={s.email} onChange={(e) => set({ email: e.target.value })} type="email" dir="ltr" className={`${inputCls} text-right`} />
        </Field>
        <div className="flex gap-2 pt-2">
          {exists && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm('למחוק את הספק? ההוצאות שלו לא יימחקו.')) onDelete()
              }}
            >
              <Icon name="trash" size={18} />
            </Button>
          )}
          <Button type="submit" className="flex-1">
            שמירה
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
