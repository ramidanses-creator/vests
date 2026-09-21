import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useState } from 'react'
import { auth, db } from '../firebase'

const MAX_ATTEMPTS = 4
const CONSOLE_LINK = 'https://console.firebase.google.com/project/comers-5e927/firestore/data/~2Flogin_attempts'

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

function emailKey(email: string): string {
  return email.trim().toLowerCase()
}

async function isLocked(key: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'login_attempts', key))
  return snap.exists() && snap.data().locked === true
}

async function recordFailedAttempt(key: string): Promise<{ locked: boolean; attempts: number }> {
  const ref = doc(db, 'login_attempts', key)
  const snap = await getDoc(ref)
  const current = snap.exists() ? ((snap.data().failedCount as number) ?? 0) : 0
  const next = current + 1
  const locked = next >= MAX_ATTEMPTS
  try {
    await setDoc(ref, { failedCount: next, locked })
  } catch {
    // if the doc is already locked, the security rules will reject this write — treat as locked
    return { locked: true, attempts: next }
  }
  return { locked, attempts: next }
}

async function resetAttempts(key: string) {
  try {
    await setDoc(doc(db, 'login_attempts', key), { failedCount: 0, locked: false })
  } catch {
    // best-effort — not critical if this fails
  }
}

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLocked(false)
    setBusy(true)
    const key = emailKey(email)
    try {
      if (mode === 'signin') {
        if (await isLocked(key)) {
          setLocked(true)
          return
        }
        try {
          await signInWithEmailAndPassword(auth, email, password)
          await resetAttempts(key)
        } catch (err) {
          const code = (err as { code?: string }).code ?? ''
          if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
            const result = await recordFailedAttempt(key)
            if (result.locked) {
              setLocked(true)
            } else {
              setError(`${translateError(code)} נותרו ${MAX_ATTEMPTS - result.attempts} ניסיונות לפני נעילה.`)
            }
          } else {
            setError(translateError(code))
          }
        }
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

        {locked && (
          <div className="rounded-lg border border-rose-800/50 bg-rose-500/10 p-3 text-xs text-rose-300">
            <p>החשבון נעול עקב {MAX_ATTEMPTS} ניסיונות סיסמה שגויים.</p>
            <p className="mt-1">
              כדי לפתוח: כתבו הודעה בצ׳אט עם Claude, ותקבלו הנחיה למחיקת מסמך הנעילה תחת{' '}
              <a href={CONSOLE_LINK} target="_blank" rel="noreferrer" className="underline hover:text-rose-200">
                Firestore → login_attempts
              </a>{' '}
              בקונסולת Firebase.
            </p>
          </div>
        )}
        {!locked && error && <p className="text-xs text-rose-400">{error}</p>}

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
            setLocked(false)
          }}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          {mode === 'signin' ? 'אין לכם חשבון? הרשמה' : 'יש לכם חשבון? התחברות'}
        </button>
      </form>
    </div>
  )
}
