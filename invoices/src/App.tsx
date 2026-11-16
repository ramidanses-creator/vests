import { useState } from 'react'
import { NewDocSheet } from './components/NewDocSheet'
import { Icon } from './components/ui'
import { go, useRoute } from './router'
import { useStore } from './store'
import { CustomerPage, Customers } from './screens/Customers'
import { DocumentEditor } from './screens/DocumentEditor'
import { DocumentView } from './screens/DocumentView'
import { Documents } from './screens/Documents'
import { Expenses } from './screens/Expenses'
import { Home } from './screens/Home'
import { ReportDetail, Reports } from './screens/Reports'
import { Settings } from './screens/Settings'

const TABS = [
  { path: '', label: 'בית', icon: 'home' },
  { path: 'docs', label: 'מסמכים', icon: 'doc' },
  { path: 'customers', label: 'לקוחות', icon: 'users' },
  { path: 'expenses', label: 'הוצאות', icon: 'wallet' },
  { path: 'reports', label: 'דוחות', icon: 'chart' },
]

export default function App() {
  const { data } = useStore()
  const { parts, query } = useRoute()
  const [newOpen, setNewOpen] = useState(false)
  const [root = '', id] = parts

  if (!data.business.name) return <Settings onboarding />

  let screen
  let showNav = true
  switch (root) {
    case 'docs':
      screen = <Documents tab={query.get('tab') ?? 'all'} />
      break
    case 'doc':
      screen = <DocumentView id={id} />
      showNav = false
      break
    case 'new':
    case 'edit':
      screen = <DocumentEditor key={parts.join('/') + query} mode={root} param={id} query={query} />
      showNav = false
      break
    case 'customers':
      screen = <Customers autoAdd={query.get('add') === '1'} />
      break
    case 'customer':
      screen = <CustomerPage id={id} onNewDoc={() => setNewOpen(true)} />
      break
    case 'expenses':
      screen = <Expenses autoAdd={query.get('add') === '1'} />
      break
    case 'reports':
      screen = <Reports month={query.get('m') ?? undefined} />
      break
    case 'report':
      screen = <ReportDetail kind={id === 'expenses' ? 'expenses' : 'income'} month={query.get('m') ?? undefined} />
      showNav = false
      break
    case 'settings':
      screen = <Settings />
      showNav = false
      break
    default:
      screen = <Home />
  }

  const activeTab = TABS.find((t) => t.path === root)?.path ?? (root === 'customer' ? 'customers' : '')

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-mist">
      {screen}
      {showNav && (
        <>
          <button
            onClick={() => setNewOpen(true)}
            className="no-print fixed bottom-[calc(env(safe-area-inset-bottom)+84px)] left-[max(20px,calc(50%-14rem))] z-30 grid h-16 w-16 place-items-center rounded-full bg-mint text-white shadow-lg shadow-mint/30 transition active:scale-95"
            aria-label="מסמך חדש"
          >
            <Icon name="plus" size={32} strokeWidth={2.2} />
          </button>
          <nav className="no-print fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-lg border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
            {TABS.map((t) => {
              const active = activeTab === t.path
              return (
                <button
                  key={t.path}
                  onClick={() => go('/' + t.path)}
                  className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${active ? 'font-semibold text-ink' : 'text-ink-soft'}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={`grid h-8 w-12 place-items-center rounded-full ${active ? 'bg-lime' : ''}`}>
                    <Icon name={t.icon} size={22} />
                  </span>
                  {t.label}
                </button>
              )
            })}
          </nav>
        </>
      )}
      <NewDocSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        customerId={root === 'customer' ? id : undefined}
      />
    </div>
  )
}
