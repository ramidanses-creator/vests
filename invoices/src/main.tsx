import { onAuthStateChanged, type User } from 'firebase/auth'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Logo } from './components/ui.tsx'
import { auth } from './firebase.ts'
import { installFonts } from './fonts.ts'
import { AuthScreen } from './screens/AuthScreen.tsx'
import { StoreProvider } from './store.tsx'

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-mist">
      <div className="flex flex-col items-center gap-3 text-ink-soft">
        <div className="animate-pulse">
          <Logo size={64} />
        </div>
        טוען…
      </div>
    </div>
  )
}

function Root() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  if (user === undefined) return <Splash />
  if (!user) return <AuthScreen />
  return (
    <StoreProvider key={user.uid} user={user} loading={<Splash />}>
      <App />
    </StoreProvider>
  )
}

installFonts()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
