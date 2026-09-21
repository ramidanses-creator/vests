import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { useState } from 'react'
import { auth } from '../firebase'

function translateError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'כתובת אימייל לא תקינה.'
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'אימייל או סיסמה שגויים.'
    case 'auth/wrong-password':
      return 'סיסמה שגויה.'
    case 'auth/email-already-in-use':
      return 'כבר קיים חשבון עם האימייל הזה — נסו להתחבר.'
    case 'auth/weak-password':
      return 'הסיסמה חייבת להכיל לפחות 6 תווים.'
    default:
      return 'משהו השתבש, נסו שוב.'
  }
}

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      setError(translateError(code))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" dir="rtl">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-white/10 bg-[#1a1b20] p-6"
      >
        <div>
          <h1 className="text-lg font-bold text-slate-100">מעקב הזמנות ורווחים</h1>
          <p className="mt-1 text-sm text-slate-400">
            {mode === 'signin' ? 'התחברות לחשבון' : 'יצירת חשבון חדש'}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-xs text-slate-400">
          אימייל
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-400">
          סיסמה
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </label>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === 'signin' ? 'התחברות' : 'הרשמה'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
            setError(null)
          }}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          {mode === 'signin' ? 'אין לכם חשבון? הרשמה' : 'יש לכם חשבון? התחברות'}
        </button>
      </form>
    </div>
  )
}
