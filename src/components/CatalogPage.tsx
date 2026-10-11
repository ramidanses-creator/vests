import { useMemo, useState } from 'react'
import type { CatalogItem, Currency } from '../types'
import { suggestNextSku } from '../utils/sku'
import { DecimalInput } from './DecimalInput'

interface Props {
  items: CatalogItem[]
  onAdd: (item: CatalogItem) => void
  onUpdate: (item: CatalogItem) => void
  onRemove: (id: string) => void
}

function emptyDraft(suggestedSku: string): CatalogItem {
  return { id: crypto.randomUUID(), sku: suggestedSku, name: '', pricePerUnit: 0, currency: 'ILS', updatedAt: new Date().toISOString() }
}

export function CatalogPage({ items, onAdd, onUpdate, onRemove }: Props) {
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<CatalogItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      q
        ? items.filter((i) => i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
        : items,
    [items, q],
  )
  const sorted = useMemo(() => [...filtered].sort((a, b) => a.sku.localeCompare(b.sku, 'he')), [filtered])

  function startNew() {
    setDraft(emptyDraft(suggestNextSku(items)))
    setError(null)
  }

  function saveDraft() {
    if (!draft) return
    const sku = draft.sku.trim()
    const name = draft.name.trim()
    if (!sku || !name) {
      setError('יש להזין מק״ט ושם מוצר.')
      return
    }
    const isNew = !items.some((i) => i.id === draft.id)
    const duplicate = items.some((i) => i.id !== draft.id && i.sku.trim().toLowerCase() === sku.toLowerCase())
    if (duplicate) {
      setError('מק״ט זה כבר קיים בקטלוג.')
      return
    }
    const toSave: CatalogItem = { ...draft, sku, name, updatedAt: new Date().toISOString() }
    if (isNew) onAdd(toSave)
    else onUpdate(toSave)
    setDraft(null)
    setError(null)
  }

  function updatePrice(item: CatalogItem, pricePerUnit: number) {
    onUpdate({ ...item, pricePerUnit, updatedAt: new Date().toISOString() })
  }

  function updateCurrency(item: CatalogItem, currency: Currency) {
    onUpdate({ ...item, currency, updatedAt: new Date().toISOString() })
  }

  if (draft) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#1a1b20] p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            {items.some((i) => i.id === draft.id) ? 'עריכת מק״ט' : 'מק״ט חדש'}
          </h3>
          <button onClick={() => setDraft(null)} className="text-xs text-slate-500 hover:text-slate-300">
            ביטול
          </button>
        </div>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          מק״ט *
          <input
            type="text"
            value={draft.sku}
            onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
            placeholder="לדוגמה: WST-BLK"
            className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
          />
          {!items.some((i) => i.id === draft.id) && draft.sku && (
            <span className="text-[10px] text-slate-500">מוצע אוטומטית לפי המק״ט האחרון שהוזן — אפשר לשנות.</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          שם המוצר *
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="לדוגמה: וסט שחור"
            className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          מחיר ליחידה *
          <div className="flex items-center gap-1">
            <DecimalInput
              value={draft.pricePerUnit}
              onChange={(pricePerUnit) => setDraft({ ...draft, pricePerUnit })}
              className="w-28 rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
            />
            <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => setDraft({ ...draft, currency: 'ILS' })}
                className={`px-2 py-2 ${draft.currency === 'ILS' ? 'bg-teal-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
              >
                ₪
              </button>
              <button
                onClick={() => setDraft({ ...draft, currency: 'USD' })}
                className={`px-2 py-2 ${draft.currency === 'USD' ? 'bg-teal-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
              >
                $
              </button>
            </div>
          </div>
        </label>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <button
          onClick={saveDraft}
          className="rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white hover:bg-teal-500"
        >
          שמירה
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-400">
        מחירי הקטלוג משמשים כברירת מחדל כשפותחים הזמנה חדשה מכרטיס לקוח. עדכון מחיר כאן (למשל אחרי העלאת מחיר מהיצרן)
        משפיע רק על הזמנות עתידיות — הזמנות שכבר נוצרו שומרות על המחיר שהיה בזמן יצירתן ולא משתנות.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי מק״ט או שם מוצר"
          className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
        />
        <button
          onClick={startNew}
          className="whitespace-nowrap rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
        >
          + מק״ט חדש
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
          {query.trim() ? 'לא נמצאו מק״טים תואמים.' : 'אין עדיין מק״טים בקטלוג.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((item) => (
            <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-100">{item.name}</span>
                  <span className="font-mono text-[11px] text-slate-500">{item.sku}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDraft(item)
                      setError(null)
                    }}
                    className="text-xs text-teal-300 hover:text-teal-200"
                  >
                    עריכה
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`למחוק את "${item.name}" מהקטלוג?`)) onRemove(item.id)
                    }}
                    className="text-xs text-slate-500 hover:text-rose-400"
                  >
                    מחיקה
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <DecimalInput
                  value={item.pricePerUnit}
                  onChange={(v) => updatePrice(item, v)}
                  className="w-24 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
                />
                <div className="flex overflow-hidden rounded-md border border-white/10 text-xs">
                  <button
                    onClick={() => updateCurrency(item, 'ILS')}
                    className={`px-2 py-1.5 ${item.currency === 'ILS' ? 'bg-teal-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
                  >
                    ₪
                  </button>
                  <button
                    onClick={() => updateCurrency(item, 'USD')}
                    className={`px-2 py-1.5 ${item.currency === 'USD' ? 'bg-teal-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
                  >
                    $
                  </button>
                </div>
                <span className="mr-auto text-[10px] text-slate-500">
                  עודכן: {new Date(item.updatedAt).toLocaleDateString('he-IL')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
