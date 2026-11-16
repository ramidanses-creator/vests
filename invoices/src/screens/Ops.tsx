import { useCallback, useMemo, useRef, useState } from 'react'
import { Button, Card, EmptyState, Field, Icon, NumberInput, Sheet, UnderlineTabs, inputCls } from '../components/ui'
import { replace } from '../router'
import { useStore } from '../store'
import type { CatalogItem, Doc } from '../types'
import { DOC_META } from '../utils/docs'
import { compressImage, readAsDataUrl } from '../utils/fileStore'
import { ils, uid } from '../utils/format'
import { DocList, SearchBox } from './Documents'
import { Reports } from './Reports'

type Tab = 'docs' | 'drafts' | 'items' | 'reports'

const TABS: { value: Tab; label: string }[] = [
  { value: 'docs', label: 'מסמכי ניהול שוטף' },
  { value: 'drafts', label: 'טיוטות' },
  { value: 'items', label: 'פריטים' },
  { value: 'reports', label: 'דוחות' },
]

export function Ops({ tab, month, onNewDoc }: { tab: string; month?: string; onNewDoc: () => void }) {
  const current = (TABS.some((t) => t.value === tab) ? tab : 'docs') as Tab
  const opsDocs = useCallback((d: Doc) => d.status === 'issued' && DOC_META[d.type].group === 'ops', [])
  const drafts = useCallback((d: Doc) => d.status === 'draft', [])
  return (
    <div className="pb-36">
      <UnderlineTabs value={current} onChange={(v) => replace(`/ops?tab=${v}`)} options={TABS} accent="bg-violet" />
      {current === 'docs' && (
        <DocList
          filter={opsDocs}
          emptyTitle="המסמכים השוטפים שלך"
          emptyText="כאן יוצגו הצעות מחיר וחשבונות עסקה (דרישות תשלום)."
          onCreate={onNewDoc}
          createLabel="הפקת מסמך"
        />
      )}
      {current === 'drafts' && <DocList filter={drafts} emptyTitle="אין טיוטות" emptyText="מסמך שנשמר כטיוטה יחכה כאן עד שתפיק אותו." />}
      {current === 'items' && <Items />}
      {current === 'reports' && <Reports month={month} />}
    </div>
  )
}

function Items() {
  const { data, remove } = useStore()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<CatalogItem | null>(null)
  const list = useMemo(
    () => data.items.filter((i) => !q.trim() || i.name.includes(q.trim())).sort((a, b) => a.name.localeCompare(b.name, 'he')),
    [data.items, q],
  )
  const blank = (): CatalogItem => ({ id: uid(), name: '', price: 0, createdAt: new Date().toISOString() })

  return (
    <div className="space-y-4 px-4 pt-4">
      {data.items.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="המוצרים והשירותים שלך"
          text="שמור מוצרים או שירותים קבועים, עם מחיר ותמונה, ובחר אותם בלחיצה כשמפיקים מסמך."
          action={
            <Button onClick={() => setEditing(blank())} className="mt-2 !rounded-full !bg-mint px-8">
              הוספת פריט חדש
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchBox value={q} onChange={setQ} placeholder="חיפוש פריט" />
            </div>
            <Button variant="lime" onClick={() => setEditing(blank())} className="shrink-0 !py-2.5">
              <Icon name="plus" size={18} /> פריט
            </Button>
          </div>
          <Card className="!p-2">
            {list.map((i) => (
              <button key={i.id} onClick={() => setEditing(i)} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-right hover:bg-mist">
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-lavender">
                  {i.image ? <img src={i.image} alt="" className="h-full w-full object-cover" /> : <Icon name="receipt" size={20} />}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{i.name}</span>
                <span className="font-semibold">{ils(i.price)}</span>
              </button>
            ))}
          </Card>
        </>
      )}
      {editing && (
        <ItemForm
          key={editing.id}
          initial={editing}
          exists={data.items.some((i) => i.id === editing.id)}
          onClose={() => setEditing(null)}
          onDelete={() => {
            remove('items', editing.id)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function ItemForm({ initial, exists, onClose, onDelete }: { initial: CatalogItem; exists: boolean; onClose: () => void; onDelete: () => void }) {
  const { upsert, data } = useStore()
  const [item, setItem] = useState(initial)
  const fileRef = useRef<HTMLInputElement>(null)
  const vatNote = data.business.type === 'exempt' ? '' : ' (כולל מע״מ)'

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const image = await readAsDataUrl(await compressImage(f, 400, 0.7))
    setItem((x) => ({ ...x, image }))
  }

  return (
    <Sheet open onClose={onClose} title={exists ? 'עריכת פריט' : 'פריט חדש'}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!item.name.trim()) return
          upsert('items', { ...item, name: item.name.trim() })
          onClose()
        }}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-ink/20 bg-mist text-ink-soft"
          >
            {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : <Icon name="camera" size={26} />}
          </button>
          <div className="text-sm text-ink-soft">
            <p>תמונה (אופציונלי) — תופיע במסמך ובקובץ ה־PDF.</p>
            {item.image && (
              <button type="button" onClick={() => setItem((x) => ({ ...x, image: undefined }))} className="mt-1 text-orange">
                הסרת תמונה
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" />
        </div>
        <Field label="שם הפריט / השירות">
          <input autoFocus value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} required className={inputCls} />
        </Field>
        <Field label={`מחיר ליחידה${vatNote}`}>
          <NumberInput value={item.price} onChange={(price) => setItem({ ...item, price })} />
        </Field>
        <div className="flex gap-2 pt-2">
          {exists && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm('למחוק את הפריט?')) onDelete()
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
