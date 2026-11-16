import { useMemo, useState } from 'react'
import { DocRow } from '../components/DocRow'
import { Button, Card, EmptyState, Icon, inputCls } from '../components/ui'
import { useStore } from '../store'
import type { Doc } from '../types'
import { DOC_META, computeTotals } from '../utils/docs'
import { monthLabel } from '../utils/format'

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Icon name="search" size={20} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} pr-11`} />
    </div>
  )
}

/** Searchable list of documents, grouped by month. */
export function DocList({
  filter,
  emptyTitle,
  emptyText,
  onCreate,
  createLabel,
}: {
  filter: (d: Doc) => boolean
  emptyTitle: string
  emptyText: string
  onCreate?: () => void
  createLabel?: string
}) {
  const { data } = useStore()
  const [q, setQ] = useState('')

  const all = useMemo(() => data.docs.filter(filter), [data.docs, filter])
  const groups = useMemo(() => {
    const query = q.trim()
    const list = all
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
    for (const d of list) map.set(d.date.slice(0, 7), [...(map.get(d.date.slice(0, 7)) ?? []), d])
    return [...map.entries()]
  }, [all, q])

  if (all.length === 0) {
    return (
      <EmptyState
        icon="doc"
        title={emptyTitle}
        text={emptyText}
        action={
          onCreate && (
            <Button onClick={onCreate} className="mt-2 !rounded-full !bg-mint px-8">
              {createLabel}
            </Button>
          )
        }
      />
    )
  }

  return (
    <div className="space-y-4 px-4 pt-4">
      <SearchBox value={q} onChange={setQ} placeholder="חיפוש לפי לקוח, מספר או סכום" />
      {groups.length === 0 ? (
        <p className="py-8 text-center text-ink-soft">לא נמצאו מסמכים בחיפוש הזה.</p>
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
  )
}
