import { signOut } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { NewDocSheet } from './components/NewDocSheet'
import { Icon, Logo } from './components/ui'
import { auth } from './firebase'
import { go, replace, useRoute } from './router'
import { useStore } from './store'
import { CustomerPage } from './screens/Customers'
import { DocumentEditor } from './screens/DocumentEditor'
import { DocumentView } from './screens/DocumentView'
import { Expenses } from './screens/Expenses'
import { Home } from './screens/Home'
import { Income } from './screens/Income'
import { Ops } from './screens/Ops'
import { ReportDetail } from './screens/Reports'
import { Sales } from './screens/Sales'
import { Settings } from './screens/Settings'
import { initials } from './utils/format'

const NAV = [
  { path: 'income', label: 'הכנסות', icon: 'chart', active: 'text-mint' },
  { path: 'ops', label: 'שוטף', icon: 'doc', active: 'text-violet' },
  { path: 'expenses', label: 'הוצאות', icon: 'wallet', active: 'text-orange' },
  { path: 'sales', label: 'מכירות', icon: 'receipt', active: 'text-indigo' },
]

/** Old addresses from before the sections existed, so saved links keep working. */
const LEGACY: Record<string, string> = {
  docs: '/income',
  customers: '/income?tab=customers',
  reports: '/ops?tab=reports',
}

export default function App() {
  const { data, sync } = useStore()
  const { parts, query } = useRoute()
  const [newOpen, setNewOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [root = '', id] = parts
  const legacy = LEGACY[root]
  useEffect(() => {
    if (legacy) replace(legacy)
  }, [legacy])
  // Any navigation (including the phone's back button) closes the menu and the new-document sheet.
  const location = parts.join('/') + '?' + query.toString()
  const [lastLocation, setLastLocation] = useState(location)
  if (location !== lastLocation) {
    setLastLocation(location)
    setMenuOpen(false)
    setNewOpen(false)
  }

  if (!data.business.name) return <Settings onboarding />
  if (legacy) return null

  const openNew = () => setNewOpen(true)
  let screen
  let shell = true
  switch (root) {
    case 'income':
      screen = <Income tab={query.get('tab') ?? 'docs'} autoAddCustomer={query.get('add') === '1'} onNewDoc={openNew} />
      break
    case 'ops':
      screen = <Ops tab={query.get('tab') ?? 'docs'} month={query.get('m') ?? undefined} onNewDoc={openNew} />
      break
    case 'expenses':
      screen = <Expenses tab={query.get('tab') ?? 'pending'} autoAdd={query.get('add') === '1'} />
      break
    case 'sales':
      screen = <Sales />
      break
    case 'doc':
      screen = <DocumentView id={id} />
      shell = false
      break
    case 'new':
    case 'edit':
      screen = <DocumentEditor key={parts.join('/') + query} mode={root} param={id} query={query} />
      shell = false
      break
    case 'customer':
      screen = <CustomerPage id={id} onNewDoc={openNew} />
      break
    case 'report':
      screen = <ReportDetail kind={id === 'expenses' ? 'expenses' : 'income'} month={query.get('m') ?? undefined} />
      shell = false
      break
    case 'settings':
      screen = <Settings />
      shell = false
      break
    default:
      screen = <Home />
  }

  const activeNav = root === 'customer' ? 'income' : root
  const syncDot = sync.status === 'synced' ? 'bg-mint' : sync.status === 'saving' || sync.status === 'loading' ? 'bg-violet' : 'bg-orange'

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-mist">
      {shell && (
        <header className="no-print sticky top-0 z-20 flex items-center justify-between bg-mist/95 px-3 pb-2 pt-[max(env(safe-area-inset-top),10px)] backdrop-blur">
          <button onClick={() => setMenuOpen(true)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5" aria-label="תפריט">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <button onClick={() => go('/')} className="flex min-w-0 items-center gap-2 px-2" aria-label="דף הבית">
            <Logo size={30} />
            <span className="truncate text-lg font-bold">{data.business.name}</span>
          </button>
          <button
            onClick={() => go('/settings')}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-xs font-semibold leading-tight"
            aria-label="העסק שלי"
          >
            {data.business.logo ? (
              <img src={data.business.logo} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="text-center">{initials(data.business.ownerName || data.business.name)}</span>
            )}
            <span className={`absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full border-2 border-mist ${syncDot}`} />
          </button>
        </header>
      )}

      {screen}

      {shell && (
        <nav className="no-print fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-lg items-center border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          {NAV.map((t) => {
            const active = activeNav === t.path
            return (
              <button
                key={t.path}
                onClick={() => go('/' + t.path)}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${active ? `font-semibold ${t.active}` : 'text-ink'}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon name={t.icon} size={24} />
                {t.label}
              </button>
            )
          })}
          <div className="flex w-20 shrink-0 justify-center">
            <button
              onClick={openNew}
              className="grid h-14 w-14 place-items-center rounded-full bg-mint text-white shadow-lg shadow-mint/30 transition active:scale-95"
              aria-label="מסמך חדש"
            >
              <Icon name="plus" size={30} strokeWidth={2.2} />
            </button>
          </div>
        </nav>
      )}

      <NewDocSheet open={newOpen} onClose={() => setNewOpen(false)} customerId={root === 'customer' ? id : undefined} />
      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}
    </div>
  )
}

function SideMenu({ onClose }: { onClose: () => void }) {
  const { data, user } = useStore()
  const nav = (path: string) => {
    onClose()
    go(path)
  }
  const items = [
    { icon: 'home', label: 'דף הבית', path: '/' },
    { icon: 'chart', label: 'הכנסות', path: '/income' },
    { icon: 'users', label: 'לקוחות', path: '/income?tab=customers' },
    { icon: 'doc', label: 'שוטף', path: '/ops' },
    { icon: 'receipt', label: 'פריטים', path: '/ops?tab=items' },
    { icon: 'wallet', label: 'הוצאות', path: '/expenses' },
    { icon: 'download', label: 'דוחות ותיקיית רו״ח', path: '/ops?tab=reports' },
    { icon: 'settings', label: 'פרטי העסק והגדרות', path: '/settings' },
  ]
  return (
    <div className="no-print fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button className="animate-fade absolute inset-0 bg-ink/35" onClick={onClose} aria-label="סגירת התפריט" />
      <aside className="absolute inset-y-0 right-0 flex w-[82%] max-w-80 flex-col bg-white pt-[max(env(safe-area-inset-top),16px)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-5 pb-4">
          <Logo size={40} />
          <div className="min-w-0">
            <p className="truncate font-bold">{data.business.name}</p>
            <p className="truncate text-sm text-ink-soft" dir="ltr">
              {user.email}
            </p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {items.map((i) => (
            <button key={i.label} onClick={() => nav(i.path)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-base hover:bg-mist">
              <Icon name={i.icon} />
              {i.label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => {
            if (confirm('להתנתק מהחשבון?')) void signOut(auth)
          }}
          className="m-3 mb-[max(env(safe-area-inset-bottom),12px)] rounded-xl border border-line py-3 font-medium text-orange"
        >
          התנתקות
        </button>
      </aside>
    </div>
  )
}
