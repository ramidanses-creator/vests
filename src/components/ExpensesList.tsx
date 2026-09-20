import type { Expense } from '../types'
import { expenseAmountInIls, formatCurrency } from '../utils/calculations'

interface Props {
  expenses: Expense[]
  onChange: (expenses: Expense[]) => void
  usdToIlsRate: number | null
  disabled?: boolean
}

export function ExpensesList({ expenses, onChange, usdToIlsRate, disabled }: Props) {
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
        <h3 className="text-sm font-semibold text-slate-700">הוצאות עד הגעה לארץ</h3>
        <button
          onClick={addExpense}
          disabled={disabled}
          className="rounded-full border border-dashed border-slate-400 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-40"
        >
          + הוצאה
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {expenses.map((expense) => (
          <div key={expense.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="תיאור ההוצאה (למשל: משלוח, מכס)"
                value={expense.label}
                disabled={disabled}
                onChange={(e) => updateExpense(expense.id, { label: e.target.value })}
                className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
              />
              <input
                type="number"
                placeholder="סכום"
                value={expense.amount === 0 ? '' : expense.amount}
                disabled={disabled}
                onChange={(e) => updateExpense(expense.id, { amount: Number(e.target.value) || 0 })}
                className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
              />
              <div className="flex overflow-hidden rounded border border-slate-300 text-xs">
                <button
                  onClick={() => updateExpense(expense.id, { currency: 'ILS' })}
                  disabled={disabled}
                  className={`px-2 py-1.5 disabled:opacity-40 ${expense.currency === 'ILS' ? 'bg-slate-700 text-white' : 'bg-white text-slate-500'}`}
                >
                  ₪
                </button>
                <button
                  onClick={() => updateExpense(expense.id, { currency: 'USD' })}
                  disabled={disabled}
                  className={`px-2 py-1.5 disabled:opacity-40 ${expense.currency === 'USD' ? 'bg-slate-700 text-white' : 'bg-white text-slate-500'}`}
                >
                  $
                </button>
              </div>
              <button
                onClick={() => removeExpense(expense.id)}
                disabled={disabled}
                className="rounded border border-slate-200 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40"
              >
                מחק
              </button>
            </div>
            {expense.currency === 'USD' && expense.amount > 0 && (
              <p className="pr-1 text-xs text-slate-400">
                {usdToIlsRate
                  ? `≈ ${formatCurrency(expenseAmountInIls(expense.amount, 'USD', usdToIlsRate))} לפי השער היציג`
                  : 'טוען שער יציג להמרה...'}
              </p>
            )}
          </div>
        ))}
        {expenses.length === 0 && <p className="text-xs text-slate-400">אין הוצאות עדיין.</p>}
      </div>
    </div>
  )
}
