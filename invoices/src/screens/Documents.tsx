import { useMemo, useState } from 'react'
import { DocRow } from '../components/DocRow'
import { Card, EmptyState, Icon, Segmented, inputCls } from '../components/ui'
import { replace } from '../router'
import { useStore } from '../store'
import type { Doc } from '../types'
import { DOC_META, computeTotals, isOpen } from '../utils/docs'
import { monthLabel } from '../utils/format'

const TABS = [
  { value: 'all', label: 'הכל' },
  { value: 'income', label: 'מסמכי הכנסות' },
  { value: 'open', label: 'פתוחים' },
  { value: 'drafts', label: 'טיוטות' },
  { value: 'ops', label: 'ניהול שוטף' },
]

const FILTERS: Record<string, (d: Doc) => boolean> = {
  all: (d) => d.status === 'issued',
  income: (d) => d.status === 'issued' && DOC_META[d.type].group === 'income',
  open: isOpen,
  drafts: (d) => d.status === 'draft',
  ops: (d) => d.status === 'issued' && DOC_META[d.type].group === 'ops',
}

export function Documents({ tab }: { tab: string }) {
  const { data } = useStore()
  const [q, setQ] = useState('')
  const current = FILTERS[tab] ? tab : 'all'

  const groups = useMemo(() => {
    const query = q.trim()
    const list = data.docs
      .filter(FILTERS[current])
      .filter(
        (d) =>
          !query ||
          d.customer.name.includes(query) ||
          String(d.number ?? '').includes(query) ||
          DOC_META[d.type].label.includes(query) ||
          String(computeTotals(d).total).includes(query),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || (b.number ?? 0) - (a.number ?? 0))
    const map = new Map<string, Doc[]>()
    for (const d of list) {
      const key = d.date.slice(0, 7)
      map.set(key, [...(map.get(key) ?? []), d])
    }
    return [...map.entries()]
  }, [data.docs, current, q])

  return (
    <div className="pb-36">
      <header className="px-5 pt-[max(env(safe-area-inset-top),20px)]">
        <h1 className="text-3xl font-semibold">מסמכים</h1>
        <div className="relative mt-4">
          <Icon name="search" size={20} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי לקוח, מספר או סכום" className={`${inputCls} pr-11`} />
        </div>
        <div className="mt-3">
          <Segmented value={current} onChange={(v) => replace(`/docs?tab=${v}`)} options={TABS} />
        </div>
      </header>

      <div className="mt-4 space-y-4 px-5">
        {groups.length === 0 ? (
          <EmptyState icon="doc" title={q ? 'לא נמצאו מסמכים' : 'אין כאן מסמכים עדיין'} text="לחצו על + כדי להפיק קבלה, חשבונית או הצעת מחיר." />
        ) : (
          groups.map(([month, docs]) => (
            <Card key={month} className="!p-3">
              <h2 className="px-2 pb-1 pt-1 text-sm font-semibold text-ink-soft">{monthLabel(month)}</h2>
              {docs.map((d) => (
                <DocRow key={d.id} doc={d} />
              ))}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
