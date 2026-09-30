import { useState } from 'react'
import type { ChecklistItem } from '../types'

interface Props {
  items: ChecklistItem[]
  onAdd: (text: string) => void
  onToggleDone: (id: string) => void
  onDelete: (id: string) => void
  onEditText: (id: string, text: string) => void
  onAddUpdate: (id: string, text: string) => void
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ChecklistRow({
  item,
  onToggleDone,
  onDelete,
  onEditText,
  onAddUpdate,
}: {
  item: ChecklistItem
  onToggleDone: (id: string) => void
  onDelete: (id: string) => void
  onEditText: (id: string, text: string) => void
  onAddUpdate: (id: string, text: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState(item.text)
  const [updateText, setUpdateText] = useState('')

  function saveText() {
    const trimmed = draftText.trim()
    if (trimmed) onEditText(item.id, trimmed)
    else setDraftText(item.text)
    setEditing(false)
  }

  function submitUpdate() {
    const trimmed = updateText.trim()
    if (!trimmed) return
    onAddUpdate(item.id, trimmed)
    setUpdateText('')
  }

  const sortedUpdates = [...item.updates].sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  return (
    <div className={`overflow-hidden rounded-lg border ${item.done ? 'border-emerald-800/50 bg-emerald-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => onToggleDone(item.id)}
          className="h-4 w-4 shrink-0 accent-emerald-500"
        />
        {editing ? (
          <input
            type="text"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onBlur={saveText}
            onKeyDown={(e) => e.key === 'Enter' && saveText()}
            autoFocus
            className="min-w-0 flex-1 rounded border border-white/10 bg-black/20 px-2 py-1 text-sm text-slate-100"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={`min-w-0 flex-1 truncate text-right text-sm ${item.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}
          >
            {item.text}
          </button>
        )}
        {item.updates.length > 0 && (
          <span className="shrink-0 rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
            {item.updates.length} עדכונים
          </span>
        )}
        <button onClick={() => setExpanded((v) => !v)} className="shrink-0 text-xs text-slate-500 hover:text-slate-300">
          {expanded ? '︿' : '﹀'}
        </button>
        <button onClick={() => onDelete(item.id)} className="shrink-0 text-xs text-slate-500 hover:text-rose-400">
          מחק
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-white/10 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitUpdate()}
              placeholder="הוספת עדכון/התקדמות..."
              className="min-w-0 flex-1 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
            />
            <button
              onClick={submitUpdate}
              disabled={!updateText.trim()}
              className="shrink-0 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
            >
              הוספה
            </button>
          </div>
          {sortedUpdates.length === 0 ? (
            <p className="text-xs text-slate-500">אין עדיין עדכונים למשימה הזו.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sortedUpdates.map((u) => (
                <div key={u.id} className="rounded-md bg-black/20 px-2.5 py-1.5 text-xs">
                  <p className="text-slate-200">{u.text}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{formatTimestamp(u.timestamp)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ChecklistPanel({ items, onAdd, onToggleDone, onDelete, onEditText, onAddUpdate }: Props) {
  const [newText, setNewText] = useState('')

  function submitNew() {
    const trimmed = newText.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setNewText('')
  }

  const doneCount = items.filter((i) => i.done).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">רשימת משימות</h2>
        {items.length > 0 && (
          <span className="text-xs font-medium text-slate-400">
            {doneCount} / {items.length} הושלמו
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitNew()}
          placeholder="משימה חדשה..."
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
        />
        <button
          onClick={submitNew}
          disabled={!newText.trim()}
          className="shrink-0 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
        >
          הוספה
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4 text-center text-sm text-slate-400">
          אין עדיין משימות. הוסיפו את הראשונה למעלה.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              onToggleDone={onToggleDone}
              onDelete={onDelete}
              onEditText={onEditText}
              onAddUpdate={onAddUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
