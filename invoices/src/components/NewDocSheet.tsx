import { go } from '../router'
import { useStore } from '../store'
import type { DocType } from '../types'
import { DOC_META, allowedDocTypes } from '../utils/docs'
import { Sheet } from './ui'

export function NewDocSheet({ open, onClose, customerId }: { open: boolean; onClose: () => void; customerId?: string }) {
  const { data } = useStore()
  const types = allowedDocTypes(data.business.type)
  const income = types.filter((t) => DOC_META[t].group === 'income')
  const ops = types.filter((t) => DOC_META[t].group === 'ops')

  function pick(t: DocType) {
    onClose()
    go(`/new/${t}${customerId ? `?customer=${customerId}` : ''}`)
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <Group title="מסמכי הכנסות" list={income} onPick={pick} />
      <div className="my-2 h-px bg-line" />
      <Group title="מסמכי ניהול שוטף" list={ops} onPick={pick} />
    </Sheet>
  )
}

function Group({ title, list, onPick }: { title: string; list: DocType[]; onPick: (t: DocType) => void }) {
  return (
    <div className="py-2">
      <h3 className="mb-1 text-lg font-bold text-ink">{title}</h3>
      {list.map((t) => (
        <button key={t} onClick={() => onPick(t)} className="block w-full rounded-lg py-3 text-right text-lg text-ink hover:bg-mist">
          {DOC_META[t].label}
        </button>
      ))}
    </div>
  )
}
