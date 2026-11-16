import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { useState } from 'react'
import { Button, Card, Field, Logo, Segmented, inputCls } from '../components/ui'
import { auth } from '../firebase'

function translateError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'כתובת האימייל לא תקינה.'
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'האימייל או הסיסמה שגויים.'
    case 'auth/email-already-in-use':
      return 'כבר יש חשבון עם האימייל הזה. עברו ל"התחברות".'
    case 'auth/weak-password':
      return 'הסיסמה צריכה להכיל לפחות 6 תווים.'
    case 'auth/too-many-requests':
      return 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות, או אפסו סיסמה.'
    case 'auth/network-request-failed':
      return 'אין חיבור לאינטרנט. התחברות דורשת חיבור — אחר כך אפשר לעבוד גם בלי.'
    default:
      return 'משהו השתבש. נסו שוב.'
  }
}

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'signin') await signInWithEmailAndPassword(auth, email.trim(), password)
      else await createUserWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(translateError((err as { code?: string }).code ?? ''))
    } finally {
      setBusy(false)
    }
  }

  async function forgot() {
    setError('')
    setNotice('')
    if (!email.trim()) return setError('כתבו קודם את כתובת האימייל.')
    setBusy(true)
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setNotice('שלחנו מייל לאיפוס הסיסמה. בדקו גם בתיקיית הספאם.')
    } catch (err) {
      setError(translateError((err as { code?: string }).code ?? ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-mist pb-10">
      <div className="rounded-b-[36px] bg-lime-bg px-6 pb-12 pt-[max(env(safe-area-inset-top),40px)] text-center">
        <div className="flex justify-center">
          <Logo size={64} />
        </div>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[#1d4d2b]">פנקס</h1>
        <p className="mx-auto mt-2 max-w-xs text-lg text-ink">קבלות, חשבוניות והוצאות — מגובות בענן, מכל מכשיר.</p>
      </div>

      <Card className="mx-4 -mt-6 space-y-4">
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m)
            setError('')
            setNotice('')
          }}
          fill
          options={[
            { value: 'signin', label: 'התחברות' },
            { value: 'signup', label: 'חשבון חדש' },
          ]}
        />
        <form onSubmit={submit} className="space-y-3">
          <Field label="אימייל">
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className={`${inputCls} text-right`}
            />
          </Field>
          <Field label="סיסמה" hint={mode === 'signup' ? 'לפחות 6 תווים' : undefined}>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              className={`${inputCls} text-right`}
            />
          </Field>
          {error && (
            <p className="rounded-xl bg-peach p-3 text-sm text-orange" role="alert">
              {error}
            </p>
          )}
          {notice && <p className="rounded-xl bg-lime p-3 text-sm">{notice}</p>}
          <Button type="submit" disabled={busy} className="w-full !py-4 text-lg">
            {busy ? 'רגע…' : mode === 'signin' ? 'התחברות' : 'יצירת חשבון'}
          </Button>
        </form>
        {mode === 'signin' && (
          <button onClick={forgot} disabled={busy} className="w-full text-center text-sm font-medium text-indigo">
            שכחתי סיסמה
          </button>
        )}
      </Card>
      <p className="mx-6 mt-4 text-center text-sm text-ink-soft">
        אם כבר השתמשתם באפליקציה במכשיר הזה, הנתונים יעברו לחשבון בכניסה הראשונה.
      </p>
    </div>
  )
}
