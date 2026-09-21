import { doc, getDoc, setDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { BackupTools } from './components/BackupTools'
import { ChatEntry } from './components/ChatEntry'
import { CollapsibleSection } from './components/CollapsibleSection'
import { CurrencyConverter } from './components/CurrencyConverter'
import { DeletedProducts } from './components/DeletedProducts'
import { InventoryByCategory } from './components/InventoryByCategory'
import { InventoryPage } from './components/InventoryPage'
import { ProductCard } from './components/ProductCard'
import { SalesCenter } from './components/SalesCenter'
import { ShipmentSplitCalculator } from './components/ShipmentSplitCalculator'
import { SummaryPanel } from './components/SummaryPanel'
import { SwipeViews } from './components/SwipeViews'
import { createDefaultProduct, generateSku } from './defaultProduct'
import { auth, db } from './firebase'
import { useAuthUser } from './hooks/useAuthUser'
import { useOfficialRate } from './hooks/useOfficialRate'
import { PRODUCT_STATUS_LABELS, type DeletedProduct, type Product } from './types'

const STORAGE_KEY = 'import-tracker-products'
const TRASH_KEY = 'import-tracker-deleted-products'
const SEEN_REMOTE_IDS_KEY = 'import-tracker-seen-remote-ids'

type View = 'active' | 'standby' | 'inventory'
const VIEW_ORDER: View[] = ['active', 'standby', 'inventory']

type UtilityId = 'inventory' | 'split' | 'sales' | 'backup' | 'currency'
const UTILITIES: { id: UtilityId; label: string; icon: string }[] = [
  { id: 'inventory', label: 'מלאי לפי קטגוריה', icon: '📦' },
  { id: 'split', label: 'פיצול משלוח/מכס', icon: '✂️' },
  { id: 'sales', label: 'מכירות והחזרות', icon: '🧾' },
  { id: 'backup', label: 'גיבוי ושחזור', icon: '💾' },
  { id: 'currency', label: 'המרת מטבע', icon: '💱' },
]

function loadSeenRemoteIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_REMOTE_IDS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveSeenRemoteIds(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_REMOTE_IDS_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // ignore storage failures
  }
}

function normalizeProduct(raw: Partial<Product> & { quantityImported?: number; hasArrived?: boolean; expectedArrivalDate?: string }): Product {
  const fallback = createDefaultProduct()
  const shipments =
    raw.shipments ??
    (raw.quantityImported !== undefined
      ? [
          {
            id: crypto.randomUUID(),
            quantity: raw.quantityImported,
            arrived: raw.hasArrived ?? true,
            expectedDate: raw.expectedArrivalDate ?? '',
          },
        ]
      : fallback.shipments)
  return {
    ...fallback,
    ...raw,
    sku: raw.sku ?? generateSku(),
    category: raw.category ?? fallback.category,
    purchasePricePerUnit: raw.purchasePricePerUnit ?? fallback.purchasePricePerUnit,
    purchaseCurrency: raw.purchaseCurrency ?? fallback.purchaseCurrency,
    usdRateOverride: raw.usdRateOverride ?? null,
    targetProfitPercent: raw.targetProfitPercent ?? fallback.targetProfitPercent,
    status: raw.status ?? fallback.status,
    shipments,
    expenses: raw.expenses ?? fallback.expenses,
    sales: (raw.sales ?? fallback.sales).map((s) => {
      const legacy = s as typeof s & { returned?: boolean }
      return {
        ...s,
        returnedQuantity: s.returnedQuantity ?? (legacy.returned ? s.quantity : 0),
        returnReason: s.returnReason ?? null,
      }
    }),
  }
}

function loadProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<Product>[]
    return parsed.map(normalizeProduct)
  } catch {
    return []
  }
}

function saveProducts(products: Product[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
}

function loadDeleted(): DeletedProduct[] {
  try {
    const raw = localStorage.getItem(TRASH_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { product: Partial<Product>; deletedAt: string }[]
    return parsed.map((d) => ({ product: normalizeProduct(d.product), deletedAt: d.deletedAt }))
  } catch {
    return []
  }
}

function saveDeleted(deleted: DeletedProduct[]) {
  try {
    localStorage.setItem(TRASH_KEY, JSON.stringify(deleted))
  } catch {
    // ignore storage failures
  }
}

interface AppContentProps {
  uid: string
  userEmail: string | null
}

function AppContent({ uid, userEmail }: AppContentProps) {
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = loadProducts()
    return stored.length > 0 ? stored : [createDefaultProduct()]
  })
  const [deleted, setDeleted] = useState<DeletedProduct[]>(() => loadDeleted())
  const [view, setView] = useState<View>('active')
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeUtility, setActiveUtility] = useState<UtilityId | null>(null)
  const productsViewRef = useRef<HTMLDivElement>(null)
  const [cloudLoaded, setCloudLoaded] = useState(false)
  const [previousLoginAt, setPreviousLoginAt] = useState<number | null>(null)
  const { officialRate } = useOfficialRate()

  useEffect(() => {
    saveProducts(products)
  }, [products])

  useEffect(() => {
    saveDeleted(deleted)
  }, [deleted])

  // Load this user's data from Firestore once on sign-in, record the previous
  // login time for display, then stamp this session as the new "last login".
  useEffect(() => {
    setCloudLoaded(false)
    let cancelled = false
    const userDocRef = doc(db, 'users', uid)
    getDoc(userDocRef).then((snap) => {
      if (cancelled) return
      if (snap.exists()) {
        const data = snap.data() as {
          products?: Partial<Product>[]
          deleted?: { product: Partial<Product>; deletedAt: string }[]
          lastLoginAt?: number
        }
        if (data.products) setProducts(data.products.map(normalizeProduct))
        if (data.deleted) setDeleted(data.deleted.map((d) => ({ product: normalizeProduct(d.product), deletedAt: d.deletedAt })))
        setPreviousLoginAt(data.lastLoginAt ?? null)
      } else {
        setPreviousLoginAt(null)
      }
      setCloudLoaded(true)
      setDoc(userDocRef, { lastLoginAt: Date.now() }, { merge: true }).catch(() => {})
    })
    return () => {
      cancelled = true
    }
  }, [uid])

  // Push local changes to Firestore once the cloud data has finished loading,
  // so a fresh sign-in doesn't overwrite cloud data with stale local state.
  // merge:true keeps the lastLoginAt field written above intact.
  useEffect(() => {
    if (!cloudLoaded) return
    setDoc(doc(db, 'users', uid), { products, deleted, updatedAt: Date.now() }, { merge: true }).catch(() => {
      // offline or blocked — localStorage still has the data
    })
  }, [uid, cloudLoaded, products, deleted])

  useEffect(() => {
    fetch('products.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((remote: Partial<Product>[]) => {
        if (!Array.isArray(remote) || remote.length === 0) return
        const seen = loadSeenRemoteIds()
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id))
          const toAdd = remote.filter((r) => r.id && !existingIds.has(r.id) && !seen.has(r.id))
          if (toAdd.length === 0) return prev
          toAdd.forEach((r) => seen.add(r.id as string))
          saveSeenRemoteIds(seen)
          return [...prev, ...toAdd.map(normalizeProduct)]
        })
      })
      .catch(() => {
        // no remote products file yet, or offline — ignore
      })
  }, [])

  // Lock in the USD rate for any product that doesn't have one yet, once a live rate is available.
  useEffect(() => {
    if (officialRate === null) return
    setProducts((prev) => {
      if (!prev.some((p) => p.usdRateOverride === null)) return prev
      return prev.map((p) => (p.usdRateOverride === null ? { ...p, usdRateOverride: officialRate } : p))
    })
  }, [officialRate])

  function updateProduct(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  function addProduct() {
    const product = createDefaultProduct(officialRate)
    setProducts((prev) => [...prev, product])
    setLastAddedId(product.id)
  }

  function quickNewOrder() {
    addProduct()
    setView('active')
    setActiveUtility(null)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        productsViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  }

  function quickSale() {
    setActiveUtility('sales')
  }

  function quickArrival() {
    setView('inventory')
    setActiveUtility(null)
  }

  function removeProduct(id: string) {
    const target = products.find((p) => p.id === id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    if (target) {
      setDeleted((prev) => [{ product: target, deletedAt: new Date().toISOString() }, ...prev].slice(0, 50))
    }
  }

  function restoreProduct(id: string) {
    const entry = deleted.find((d) => d.product.id === id)
    setDeleted((prev) => prev.filter((d) => d.product.id !== id))
    if (entry) {
      setProducts((prev) => [...prev, entry.product])
    }
  }

  function purgeDeleted(id: string) {
    setDeleted((prev) => prev.filter((d) => d.product.id !== id))
  }

  function importBackup(data: { products: Partial<Product>[]; deleted: { product: Partial<Product>; deletedAt: string }[] }) {
    setProducts(data.products.map(normalizeProduct))
    setDeleted(data.deleted.map((d) => ({ product: normalizeProduct(d.product), deletedAt: d.deletedAt })))
  }

  const standbyCount = useMemo(() => products.filter((p) => p.status === 'standby').length, [products])
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q),
    )
  }, [products, searchQuery])
  const categoryOptions = useMemo(
    () => Array.from(new Set(products.map((p) => p.category.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'he')),
    [products],
  )
  const expenseLabelOptions = useMemo(
    () =>
      Array.from(new Set(products.flatMap((p) => p.expenses.map((e) => e.label.trim())).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'he'),
      ),
    [products],
  )

  function renderViewPanel(index: number) {
    const v = VIEW_ORDER[index]
    if (v === 'inventory') {
      return <InventoryPage products={filteredProducts} onChange={updateProduct} usdToIlsRate={officialRate} />
    }
    const list = filteredProducts.filter((p) => p.status === v)
    return (
      <div className="flex flex-col gap-6">
        {list.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
            {searchQuery.trim()
              ? 'לא נמצאו מוצרים תואמים לחיפוש.'
              : v === 'active'
                ? 'אין מוצרים בהזמנה החדשה כרגע.'
                : 'אין מוצרים רשומים במערכת כרגע.'}
          </p>
        )}
        {list.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onChange={updateProduct}
            onRemove={() => removeProduct(product.id)}
            usdToIlsRate={officialRate}
            categoryOptions={categoryOptions}
            expenseLabelOptions={expenseLabelOptions}
            defaultExpanded={product.id === lastAddedId}
          />
        ))}
        {v === 'active' && (
          <button
            onClick={addProduct}
            className="rounded-xl border-2 border-dashed border-teal-700/60 bg-teal-950/10 px-4 py-3 text-sm font-medium text-teal-300 hover:bg-teal-950/20"
          >
            + מוצר חדש
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16" dir="rtl">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1117]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-end gap-2 px-4 py-3">
          <div className="flex flex-col items-end gap-1 text-xs text-slate-500">
            {userEmail && <span>{userEmail}</span>}
            <span>
              {previousLoginAt
                ? `התחברות קודמת: ${new Date(previousLoginAt).toLocaleString('he-IL')}`
                : 'זו הכניסה הראשונה שלך'}
            </span>
            <button onClick={() => signOut(auth)} className="text-slate-400 hover:text-slate-200">
              התנתקות
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 flex max-w-5xl flex-col gap-6 px-4">
        <SummaryPanel products={products} usdToIlsRate={officialRate} />

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={quickNewOrder}
            className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-teal-950/20 py-4 hover:bg-teal-950/40"
          >
            <span className="text-2xl">➕</span>
            <span className="text-xs font-medium text-teal-200">הזמנה חדשה</span>
          </button>
          <button
            onClick={quickSale}
            className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-amber-950/20 py-4 hover:bg-amber-950/40"
          >
            <span className="text-2xl">🧾</span>
            <span className="text-xs font-medium text-amber-200">מכירה</span>
          </button>
          <button
            onClick={quickArrival}
            className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-sky-950/20 py-4 hover:bg-sky-950/40"
          >
            <span className="text-2xl">🚚</span>
            <span className="text-xs font-medium text-sky-200">הגעת סחורה</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {UTILITIES.map((u) => (
              <button
                key={u.id}
                onClick={() => setActiveUtility((prev) => (prev === u.id ? null : u.id))}
                className={`flex shrink-0 flex-col items-center gap-1 rounded-lg border px-3 py-2 ${
                  activeUtility === u.id
                    ? 'border-teal-500 bg-teal-950/30'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                }`}
              >
                <span className="text-base">{u.icon}</span>
                <span className="whitespace-nowrap text-[11px] text-slate-300">{u.label}</span>
              </button>
            ))}
          </div>

          {activeUtility && (
            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-white/10 bg-[#1a1b20] p-4">
              {activeUtility === 'inventory' && <InventoryByCategory products={products} usdToIlsRate={officialRate} />}
              {activeUtility === 'split' && (
                <ShipmentSplitCalculator products={products} onChange={updateProduct} usdToIlsRate={officialRate} />
              )}
              {activeUtility === 'sales' && (
                <SalesCenter products={filteredProducts} onChange={updateProduct} usdToIlsRate={officialRate} />
              )}
              {activeUtility === 'backup' && (
                <BackupTools products={products} deleted={deleted} onImport={importBackup} />
              )}
              {activeUtility === 'currency' && <CurrencyConverter />}
            </div>
          )}
        </div>

        {chatOpen ? (
          <ChatEntry
            onCreate={(product) => setProducts((prev) => [...prev, product])}
            onClose={() => setChatOpen(false)}
            usdRateOverride={officialRate}
          />
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="rounded-xl border border-white/10 bg-teal-950/30 px-4 py-3 text-sm font-medium text-teal-200 hover:bg-teal-950/50"
          >
            הוספת מוצר בצ׳אט
          </button>
        )}

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="חיפוש מוצר לפי שם, קטגוריה או מק״ט"
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
        />

        <div ref={productsViewRef} className="flex flex-wrap gap-2 scroll-mt-20">
          <button
            onClick={() => setView('active')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              view === 'active'
                ? 'bg-teal-500 text-slate-950 shadow shadow-teal-500/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {PRODUCT_STATUS_LABELS.active}
          </button>
          <button
            onClick={() => setView('standby')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              view === 'standby'
                ? 'bg-violet-500 text-slate-950 shadow shadow-violet-500/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {PRODUCT_STATUS_LABELS.standby} {standbyCount > 0 ? `(${standbyCount})` : ''}
          </button>
          <button
            onClick={() => setView('inventory')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              view === 'inventory'
                ? 'bg-amber-400 text-slate-950 shadow shadow-amber-400/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            ניהול מלאי
          </button>
        </div>

        <SwipeViews
          activeIndex={VIEW_ORDER.indexOf(view)}
          count={VIEW_ORDER.length}
          onChange={(i) => setView(VIEW_ORDER[i])}
          renderPanel={renderViewPanel}
          loop={false}
        />

        <CollapsibleSection title="היסטוריית מחיקות" accent="rose">
          <DeletedProducts deleted={deleted} onRestore={restoreProduct} onPurge={purgeDeleted} />
        </CollapsibleSection>
      </main>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuthUser()

  if (loading) return null
  if (!user) return <AuthScreen />

  return <AppContent uid={user.uid} userEmail={user.email} />
}
