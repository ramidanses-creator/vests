import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useState } from 'react'
import { auth, db } from '../firebase'

const MAX_ATTEMPTS = 4
const LOCK_DURATION_MS = 30 * 60 * 1000

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

async function checkLock(key: string): Promise<number | null> {
  const snap = await getDoc(doc(db, 'login_attempts', key))
  if (!snap.exists()) return null
  const lockedUntil = snap.data().lockedUntil as number | null | undefined
  if (lockedUntil && lockedUntil > Date.now()) return lockedUntil
  return null
}

async function recordFailedAttempt(key: string): Promise<{ lockedUntil: number | null; attempts: number }> {
  const ref = doc(db, 'login_attempts', key)
  const snap = await getDoc(ref)
  const current = snap.exists() ? ((snap.data().failedCount as number) ?? 0) : 0
  const next = current + 1
  const lockedUntil = next >= MAX_ATTEMPTS ? Date.now() + LOCK_DURATION_MS : null
  await setDoc(ref, { failedCount: next, lockedUntil })
  return { lockedUntil, attempts: next }
}

async function resetAttempts(key: string) {
  try {
    await setDoc(doc(db, 'login_attempts', key), { failedCount: 0, lockedUntil: null })
  } catch {
    // best-effort — not critical if this fails
  }
}

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleForgotPassword() {
    if (!email) {
      setError('הזינו קודם את כתובת האימייל למעלה.')
      return
    }
    setError(null)
    setResetSent(false)
    setBusy(true)
    try {
      await sendPasswordResetEmail(auth, email)
      await resetAttempts(emailKey(email))
      setLockedUntil(null)
      setResetSent(true)
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      setError(translateError(code))
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLockedUntil(null)
    setBusy(true)
    const key = emailKey(email)
    try {
      if (mode === 'signin') {
        const lockUntil = await checkLock(key)
        if (lockUntil) {
          setLockedUntil(lockUntil)
          return
        }
        try {
          await signInWithEmailAndPassword(auth, email, password)
          await resetAttempts(key)
        } catch (err) {
          const code = (err as { code?: string }).code ?? ''
          if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
            const result = await recordFailedAttempt(key)
            if (result.lockedUntil) {
              setLockedUntil(result.lockedUntil)
            } else {
              setError(`${translateError(code)} נותרו ${MAX_ATTEMPTS - result.attempts} ניסיונות לפני נעילה זמנית.`)
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
        <p className="text-sm text-slate-400">{mode === 'signin' ? 'התחברות לחשבון' : 'יצירת חשבון חדש'}</p>

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

        {lockedUntil && (
          <p className="rounded-lg border border-rose-800/50 bg-rose-500/10 p-3 text-xs text-rose-300">
            נעול עקב {MAX_ATTEMPTS} ניסיונות כושלים. יש להמתין 30 דקות או לאפס סיסמה.
          </p>
        )}
        {!lockedUntil && error && <p className="text-xs text-rose-400">{error}</p>}
        {resetSent && (
          <p className="rounded-lg border border-emerald-800/50 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            נשלח מייל לאיפוס סיסמה. לאחר שתקבעו סיסמה חדשה, תוכלו להתחבר.
          </p>
        )}

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
            setLockedUntil(null)
            setResetSent(false)
          }}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          {mode === 'signin' ? 'אין לכם חשבון? הרשמה' : 'יש לכם חשבון? התחברות'}
        </button>

        {mode === 'signin' && (
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={busy}
            className="text-xs text-slate-500 hover:text-slate-300 disabled:cursor-not-allowed"
          >
            שכחתי סיסמה
          </button>
        )}
      </form>
    </div>
  )
}
