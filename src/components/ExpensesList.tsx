import { useState } from 'react'
import type { Expense } from '../types'
import { expenseAmountInIls, formatCurrency } from '../utils/calculations'

interface Props {
  expenses: Expense[]
  onChange: (expenses: Expense[]) => void
  usdToIlsRate: number | null
  quantityImported: number
  labelOptions: string[]
}

interface Group {
  label: string
  items: Expense[]
  total: number
}

function groupExpenses(expenses: Expense[], usdToIlsRate: number | null): Group[] {
  const order: string[] = []
  const map = new Map<string, Expense[]>()
  expenses.forEach((e) => {
    const key = e.label.trim() || 'ללא תיאור'
    if (!map.has(key)) {
      order.push(key)
      map.set(key, [])
    }
    map.get(key)!.push(e)
  })
  return order.map((label) => {
    const items = map.get(label)!
    const total = items.reduce((sum, e) => sum + expenseAmountInIls(e.amount, e.currency, usdToIlsRate), 0)
    return { label, items, total }
  })
}

function ExpenseRow({
  expense,
  usdToIlsRate,
  onUpdate,
  onRemove,
}: {
  expense: Expense
  usdToIlsRate: number | null
  onUpdate: (id: string, patch: Partial<Expense>) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          list="expense-label-options"
          placeholder="תיאור ההוצאה (למשל: משלוח, מכס)"
          value={expense.label}
          onChange={(e) => onUpdate(expense.id, { label: e.target.value })}
          className="min-w-0 flex-1 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="סכום"
          value={expense.amount === 0 ? '' : expense.amount}
          onChange={(e) => onUpdate(expense.id, { amount: Number(e.target.value) || 0 })}
          className="w-24 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
        />
        <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs">
          <button
            onClick={() => onUpdate(expense.id, { currency: 'ILS' })}
            className={`px-2 py-1.5 ${expense.currency === 'ILS' ? 'bg-teal-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
          >
            ₪
          </button>
          <button
            onClick={() => onUpdate(expense.id, { currency: 'USD' })}
            className={`px-2 py-1.5 ${expense.currency === 'USD' ? 'bg-teal-500 text-slate-950' : 'bg-black/20 text-slate-400'}`}
          >
            $
          </button>
        </div>
        <button
          onClick={() => onRemove(expense.id)}
          className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
        >
          מחק
        </button>
      </div>
      {expense.currency === 'USD' && expense.amount > 0 && (
        <p className="pr-1 text-xs text-slate-500">
          {usdToIlsRate
            ? `≈ ${formatCurrency(expenseAmountInIls(expense.amount, 'USD', usdToIlsRate))} לפי השער הנעול`
            : 'טוען שער להמרה...'}
        </p>
      )}
    </div>
  )
}

export function ExpensesList({ expenses, onChange, usdToIlsRate, quantityImported, labelOptions }: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const groups = groupExpenses(expenses, usdToIlsRate)

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function updateExpense(id: string, patch: Partial<Expense>) {
    onChange(expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function addExpense() {
    onChange([...expenses, { id: crypto.randomUUID(), label: '', amount: 0, currency: 'ILS' }])
  }

  function removeExpense(id: string) {
    onChange(expenses.filter((e) => e.id !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <datalist id="expense-label-options">
        {labelOptions.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">הוצאות עד הגעה לארץ</h3>
        <button
          onClick={addExpense}
          className="rounded-full border border-dashed border-amber-500/40 px-3 py-1 text-xs text-amber-300 hover:bg-amber-500/10"
        >
          + הוצאה
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {groups.map((group) =>
          group.items.length === 1 ? (
            <div key={group.items[0].id} className="flex flex-col gap-1">
              <ExpenseRow
                expense={group.items[0]}
                usdToIlsRate={usdToIlsRate}
                onUpdate={updateExpense}
                onRemove={removeExpense}
              />
              {quantityImported > 0 && (
                <p className="pr-1 text-xs text-slate-500">
                  {formatCurrency(group.total / quantityImported)} ליחידה
                </p>
              )}
            </div>
          ) : (
            <div key={group.label} className="rounded-lg bg-white/5">
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm"
              >
                <span className="text-slate-200">
                  {group.label} <span className="text-xs text-slate-500">({group.items.length} שורות)</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-left">
                    <span className="block font-semibold text-slate-100">{formatCurrency(group.total)}</span>
                    {quantityImported > 0 && (
                      <span className="block text-xs text-slate-500">
                        {formatCurrency(group.total / quantityImported)} ליחידה
                      </span>
                    )}
                  </span>
                  <span className="text-slate-500">{openGroups.has(group.label) ? '︿' : '﹀'}</span>
                </span>
              </button>
              {openGroups.has(group.label) && (
                <div className="flex flex-col gap-2 border-t border-white/10 p-2">
                  {group.items.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      usdToIlsRate={usdToIlsRate}
                      onUpdate={updateExpense}
                      onRemove={removeExpense}
                    />
                  ))}
                </div>
              )}
            </div>
          ),
        )}
        {expenses.length === 0 && <p className="text-xs text-slate-500">אין הוצאות עדיין.</p>}
      </div>
    </div>
  )
}
