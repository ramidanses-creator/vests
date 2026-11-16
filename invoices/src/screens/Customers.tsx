import { useMemo, useState } from 'react'
import { DocRow } from '../components/DocRow'
import { Button, Card, EmptyState, Field, Icon, Sheet, TopBar, inputCls } from '../components/ui'
import { back, go, replace } from '../router'
import { useStore } from '../store'
import type { Customer } from '../types'
import { computeTotals, isOpen, receivedOf } from '../utils/docs'
import { ils, initials, uid, waPhone } from '../utils/format'

function blankCustomer(): Customer {
  return { id: uid(), name: '', taxId: '', phone: '', email: '', address: '', createdAt: new Date().toISOString() }
}

export function CustomerForm({ open, initial, onClose }: { open: boolean; initial?: Customer; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'עריכת לקוח' : 'הוספת לקוח'}>
      {open && <CustomerFormBody initial={initial} onClose={onClose} />}
    </Sheet>
  )
}

function CustomerFormBody({ initial, onClose }: { initial?: Customer; onClose: () => void }) {
  const { upsertCustomer } = useStore()
  const [c, setC] = useState<Customer>(() => initial ?? blankCustomer())
  const set = (patch: Partial<Customer>) => setC((x) => ({ ...x, ...patch }))

  return (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!c.name.trim()) return
          upsertCustomer({ ...c, name: c.name.trim() })
          onClose()
        }}
      >
        <Field label="שם הלקוח / העסק">
          <input autoFocus value={c.name} onChange={(e) => set({ name: e.target.value })} required className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ח.פ. / ע.מ. / ת.ז.">
            <input value={c.taxId} onChange={(e) => set({ taxId: e.target.value })} inputMode="numeric" dir="ltr" className={`${inputCls} text-right`} />
          </Field>
          <Field label="טלפון">
            <input value={c.phone} onChange={(e) => set({ phone: e.target.value })} type="tel" dir="ltr" className={`${inputCls} text-right`} />
          </Field>
        </div>
        <Field label="אימייל">
          <input value={c.email} onChange={(e) => set({ email: e.target.value })} type="email" dir="ltr" className={`${inputCls} text-right`} />
        </Field>
        <Field label="כתובת">
          <input value={c.address} onChange={(e) => set({ address: e.target.value })} className={inputCls} />
        </Field>
        <Button type="submit" className="mt-2 w-full">
          שמירה
        </Button>
      </form>
  )
}

export function Customers({ autoAdd }: { autoAdd: boolean }) {
  const { data } = useStore()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(autoAdd)

  const rows = useMemo(() => {
    const query = q.trim()
    return data.customers
      .filter((c) => !query || c.name.includes(query) || c.phone.includes(query) || c.taxId.includes(query))
      .map((c) => {
        const docs = data.docs.filter((d) => d.customerId === c.id)
        const open = docs.filter(isOpen).reduce((s, d) => s + computeTotals(d).total, 0)
        return { c, count: docs.filter((d) => d.status === 'issued').length, open }
      })
      .sort((a, b) => a.c.name.localeCompare(b.c.name, 'he'))
  }, [data.customers, data.docs, q])

  return (
    <div className="pb-36">
      <header className="flex items-end justify-between px-5 pt-[max(env(safe-area-inset-top),20px)]">
        <h1 className="text-3xl font-semibold">לקוחות</h1>
        <Button variant="lime" onClick={() => setAdding(true)} className="!py-2.5">
          <Icon name="plus" size={18} /> לקוח חדש
        </Button>
      </header>
      <div className="relative mx-5 mt-4">
        <Icon name="search" size={20} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לקוח" className={`${inputCls} pr-11`} />
      </div>
      <div className="mx-5 mt-4">
        {rows.length === 0 ? (
          <EmptyState icon="users" title={q ? 'לא נמצאו לקוחות' : 'עוד אין לקוחות'} text="לקוחות נשמרים גם אוטומטית כשמפיקים להם מסמך." />
        ) : (
          <Card className="!p-2">
            {rows.map(({ c, count, open }) => (
              <button key={c.id} onClick={() => go(`/customer/${c.id}`)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-right hover:bg-mist">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky font-semibold">{initials(c.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.name}</span>
                  <span className="block text-sm text-ink-soft">{count} מסמכים</span>
                </span>
                {open > 0 && <span className="rounded-md bg-peach px-2 py-1 text-sm text-orange">פתוח {ils(open)}</span>}
              </button>
            ))}
          </Card>
        )}
      </div>
      <CustomerForm
        open={adding}
        onClose={() => {
          setAdding(false)
          if (autoAdd) replace('/customers')
        }}
      />
    </div>
  )
}

export function CustomerPage({ id, onNewDoc }: { id?: string; onNewDoc: () => void }) {
  const { data, deleteCustomer } = useStore()
  const [editing, setEditing] = useState(false)
  const c = data.customers.find((x) => x.id === id)
  if (!c) {
    return (
      <div>
        <TopBar title="לקוח" />
        <p className="p-8 text-center text-ink-soft">הלקוח לא נמצא.</p>
      </div>
    )
  }
  const docs = data.docs.filter((d) => d.customerId === c.id).sort((a, b) => b.date.localeCompare(a.date))
  const open = docs.filter(isOpen).reduce((s, d) => s + computeTotals(d).total, 0)
  const received = docs.reduce((s, d) => s + receivedOf(d), 0)

  return (
    <div className="pb-36">
      <TopBar
        title={c.name}
        right={
          <button onClick={() => setEditing(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" aria-label="עריכה">
            <Icon name="edit" />
          </button>
        }
      />
      <div className="space-y-3 px-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-lime p-4">
            <p className="text-sm">חיובים פתוחים</p>
            <p className="text-2xl font-semibold">{ils(open)}</p>
          </div>
          <div className="rounded-3xl bg-lavender p-4">
            <p className="text-sm">סה״כ שולם</p>
            <p className="text-2xl font-semibold">{ils(received)}</p>
          </div>
        </div>

        <Card className="space-y-1 text-ink">
          {c.taxId && <p>ח.פ./ע.מ.: {c.taxId}</p>}
          {c.address && <p>{c.address}</p>}
          {c.email && <p dir="ltr" className="text-right">{c.email}</p>}
          <div className="flex gap-2 pt-2">
            {c.phone && (
              <>
                <a href={`tel:${c.phone}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky py-2.5 font-medium">
                  <Icon name="phone" size={18} /> חיוג
                </a>
                <a href={`https://wa.me/${waPhone(c.phone)}`} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-lime py-2.5 font-medium">
                  <Icon name="chat" size={18} /> וואטסאפ
                </a>
              </>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-lavender py-2.5 font-medium">
                <Icon name="mail" size={18} /> מייל
              </a>
            )}
          </div>
        </Card>

        <Button onClick={onNewDoc} className="w-full">
          <Icon name="plus" size={18} /> מסמך חדש ל{c.name}
        </Button>

        <Card className="!p-3">
          <h2 className="px-2 pb-1 font-bold">מסמכים</h2>
          {docs.length === 0 ? <p className="p-4 text-center text-ink-soft">עוד אין מסמכים ללקוח הזה.</p> : docs.map((d) => <DocRow key={d.id} doc={d} />)}
        </Card>

        {docs.length === 0 && (
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              if (confirm(`למחוק את ${c.name}?`)) {
                deleteCustomer(c.id)
                back('/customers')
              }
            }}
          >
            <Icon name="trash" size={18} /> מחיקת לקוח
          </Button>
        )}
      </div>
      <CustomerForm open={editing} initial={c} onClose={() => setEditing(false)} />
    </div>
  )
}
