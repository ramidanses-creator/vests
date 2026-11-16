// "Add to home screen": Android/Chrome offer a real install prompt; iPhone needs the Share menu.
import { useEffect, useState } from 'react'
import { Button, Icon, Logo, Sheet } from './components/ui'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

// Registered at import time: the browser fires this once, early, and doesn't repeat it.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export const isInstalled = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const DISMISS_KEY = 'pinkas:install-dismissed'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function useInstall() {
  const [, force] = useState(0)
  const [help, setHelp] = useState(false)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])

  async function install() {
    if (deferred) {
      const e = deferred
      deferred = null
      await e.prompt()
      await e.userChoice.catch(() => null)
      force((n) => n + 1)
    } else setHelp(true)
  }

  return { installed: isInstalled(), install, help, closeHelp: () => setHelp(false) }
}

export function InstallHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ios = isIOS()
  return (
    <Sheet open={open} onClose={onClose} title="הוספת פנקס למסך הבית">
      <div className="space-y-4">
        {ios ? (
          <ol className="space-y-3 text-base">
            <li className="flex items-start gap-3">
              <Step n={1} />
              <span>
                פתחו את הקישור ב־<b>Safari</b> (לא מתוך וואטסאפ או אפליקציה אחרת).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Step n={2} />
              <span className="flex flex-wrap items-center gap-1">
                לחצו על כפתור השיתוף
                <span className="inline-grid h-7 w-7 place-items-center rounded-md bg-mist">
                  <ShareIOS />
                </span>
                בתחתית המסך.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Step n={3} />
              <span>
                גללו ובחרו <b>״הוספה למסך הבית״</b>, ואז <b>״הוסף״</b>.
              </span>
            </li>
          </ol>
        ) : (
          <ol className="space-y-3 text-base">
            <li className="flex items-start gap-3">
              <Step n={1} />
              <span>
                פתחו את הקישור ב־<b>Chrome</b>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Step n={2} />
              <span>
                לחצו על התפריט <b>⋮</b> למעלה.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Step n={3} />
              <span>
                בחרו <b>״הוספה למסך הבית״</b> או <b>״התקנת האפליקציה״</b>.
              </span>
            </li>
          </ol>
        )}
        <div className="flex items-center gap-3 rounded-2xl bg-lime p-3">
          <Logo size={40} />
          <span className="text-sm">הסמל של פנקס יופיע במסך הבית, והאפליקציה תיפתח במסך מלא — בלי שורת הכתובת של הדפדפן.</span>
        </div>
        <Button onClick={onClose} className="w-full">
          הבנתי
        </Button>
      </div>
    </Sheet>
  )
}

function Step({ n }: { n: number }) {
  return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-white">{n}</span>
}

function ShareIOS() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="שיתוף">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" />
    </svg>
  )
}

/** Dismissible card on the home page, shown until the app is on the home screen. */
export function InstallCard() {
  const { installed, install, help, closeHelp } = useInstall()
  const [dismissed, setDismissed] = useState(readDismissed)
  if (installed || dismissed) return <InstallHelp open={help} onClose={closeHelp} />
  return (
    <>
      <div className="mx-5 mt-5 flex items-center gap-3 rounded-3xl bg-ink p-4 text-white">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime-bg">
          <Logo size={36} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">פנקס במסך הבית</p>
          <p className="text-sm text-white/75">פתיחה בלחיצה אחת, כמו אפליקציה רגילה</p>
        </div>
        <button onClick={install} className="shrink-0 rounded-xl bg-lime px-3 py-2 text-sm font-semibold text-ink">
          הוספה
        </button>
        <button
          onClick={() => {
            setDismissed(true)
            try {
              localStorage.setItem(DISMISS_KEY, '1')
            } catch {
              // ignore
            }
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10"
          aria-label="לא עכשיו"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
      <InstallHelp open={help} onClose={closeHelp} />
    </>
  )
}
