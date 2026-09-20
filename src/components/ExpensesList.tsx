import type { Expense } from '../types'

interface Props {
  expenses: Expense[]
  onChange: (expenses: Expense[]) => void
}

export function ExpensesList({ expenses, onChange }: Props) {
  function updateExpense(id: string, patch: Partial<Expense>) {
    onChange(expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function addExpense() {
    onChange([...expenses, { id: crypto.randomUUID(), label: '', amount: 0 }])
  }

  function removeExpense(id: string) {
    onChange(expenses.filter((e) => e.id !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">הוצאות עד הגעה לארץ</h3>
        <button
          onClick={addExpense}
          className="rounded-full border border-dashed border-slate-400 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50"
        >
          + הוצאה
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {expenses.map((expense) => (
          <div key={expense.id} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="תיאור ההוצאה (למשל: משלוח, מכס)"
              value={expense.label}
              onChange={(e) => updateExpense(expense.id, { label: e.target.value })}
              className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              placeholder="סכום"
              value={expense.amount === 0 ? '' : expense.amount}
              onChange={(e) => updateExpense(expense.id, { amount: Number(e.target.value) || 0 })}
              className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button
              onClick={() => removeExpense(expense.id)}
              className="rounded border border-slate-200 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
            >
              מחק
            </button>
          </div>
        ))}
        {expenses.length === 0 && <p className="text-xs text-slate-400">אין הוצאות עדיין.</p>}
      </div>
    </div>
  )
}
