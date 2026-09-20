import type { Expense } from '../types'
import { expenseAmountInIls, formatCurrency } from '../utils/calculations'

interface Props {
  expenses: Expense[]
  onChange: (expenses: Expense[]) => void
  usdToIlsRate: number | null
}

export function ExpensesList({ expenses, onChange, usdToIlsRate }: Props) {
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">הוצאות עד הגעה לארץ</h3>
        <button
          onClick={addExpense}
          className="rounded-full border border-dashed border-slate-600 px-3 py-1 text-xs text-slate-400 hover:bg-slate-800"
        >
          + הוצאה
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {expenses.map((expense) => (
          <div key={expense.id} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="תיאור ההוצאה (למשל: משלוח, מכס)"
                value={expense.label}
                onChange={(e) => updateExpense(expense.id, { label: e.target.value })}
                className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100"
              />
              <input
                type="number"
                placeholder="סכום"
                value={expense.amount === 0 ? '' : expense.amount}
                onChange={(e) => updateExpense(expense.id, { amount: Number(e.target.value) || 0 })}
                className="w-24 rounded border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100"
              />
              <div className="flex overflow-hidden rounded border border-slate-700 text-xs">
                <button
                  onClick={() => updateExpense(expense.id, { currency: 'ILS' })}
                  className={`px-2 py-1.5 ${expense.currency === 'ILS' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'}`}
                >
                  ₪
                </button>
                <button
                  onClick={() => updateExpense(expense.id, { currency: 'USD' })}
                  className={`px-2 py-1.5 ${expense.currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'}`}
                >
                  $
                </button>
              </div>
              <button
                onClick={() => removeExpense(expense.id)}
                className="rounded border border-slate-700 px-2 py-1.5 text-xs text-red-400 hover:bg-red-950/40"
              >
                מחק
              </button>
            </div>
            {expense.currency === 'USD' && expense.amount > 0 && (
              <p className="pr-1 text-xs text-slate-500">
                {usdToIlsRate
                  ? `≈ ${formatCurrency(expenseAmountInIls(expense.amount, 'USD', usdToIlsRate))} לפי השער היציג`
                  : 'טוען שער יציג להמרה...'}
              </p>
            )}
          </div>
        ))}
        {expenses.length === 0 && <p className="text-xs text-slate-500">אין הוצאות עדיין.</p>}
      </div>
    </div>
  )
}
