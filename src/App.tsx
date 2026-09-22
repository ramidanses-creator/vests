import { doc, getDoc, setDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { BackupTools } from './components/BackupTools'
import { ChatEntry } from './components/ChatEntry'
import { CollapsibleSection } from './components/CollapsibleSection'
import { CurrencyConverter } from './components/CurrencyConverter'
import { DeletedProducts } from './components/DeletedProducts'
import { Analytics } from './components/Analytics'
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
import { countInventoryAlerts } from './utils/calculations'

const STORAGE_KEY = 'import-tracker-products'
const TRASH_KEY = 'import-tracker-deleted-products'
const SEEN_REMOTE_IDS_KEY = 'import-tracker-seen-remote-ids'

type View = 'active' | 'standby' | 'inventory'
const VIEW_ORDER: View[] = ['active', 'standby', 'inventory']

type UtilityId = 'inventory' | 'split' | 'sales' | 'backup' | 'currency' | 'analytics'
const UTILITIES: { id: UtilityId; label: string; shortLabel: string }[] = [
  { id: 'inventory', label: 'ניהול מלאי', shortLabel: 'מלאי' },
  { id: 'split', label: 'פיצול משלוח/מכס', shortLabel: 'פיצול' },
  { id: 'analytics', label: 'אנליטיקה כלכלית', shortLabel: 'אנליטיקה' },
  { id: 'sales', label: 'מכירות והחזרות', shortLabel: 'מכירות' },
  { id: 'backup', label: 'גיבוי ושחזור', shortLabel: 'גיבוי' },
  { id: 'currency', label: 'המרת מטבע', shortLabel: 'מטח' },
]
// The square nav buttons show the general tools, split evenly (2+2). "מלאי" jumps
// straight to the full inventory tab instead of opening a page of its own; sales
// lives in the FAB menu and backup lives in the settings dropdown.
const SQUARE_TOOLS = UTILITIES.filter((u) => u.id !== 'sales' && u.id !== 'backup')

interface FabAction {
  id: string
  label: string
}
const FAB_ACTIONS: FabAction[] = [
  { id: 'newOrder', label: 'פתיחת הזמנה' },
  { id: 'sale', label: 'מכירה' },
  { id: 'standby', label: 'רשומים במערכת' },
  { id: 'arrival', label: 'קבלת משלוח' },
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
        discountType: s.discountType ?? null,
        discountValue: s.discountValue ?? 0,
        invoiceNumber: s.invoiceNumber ?? '',
        notes: s.notes ?? '',
      }
    }),
  }
}

function isEmptyDraft(p: Product): boolean {
  return (
    p.name.trim() === '' &&
    p.category.trim() === '' &&
    p.purchasePricePerUnit === 0 &&
    p.notes.trim() === '' &&
    p.sales.length === 0 &&
    p.shipments.every((s) => s.quantity === 0) &&
    p.expenses.every((e) => e.amount === 0)
  )
}

// Untouched "new order" drafts are never persisted — only kept in memory
// until the user either fills them in or navigates away.
function withoutEmptyDrafts(products: Product[]): Product[] {
  return products.filter((p) => !isEmptyDraft(p))
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutEmptyDrafts(products)))
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
  const [profileOpen, setProfileOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const productsViewRef = useRef<HTMLElement>(null)
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
    setDoc(
      doc(db, 'users', uid),
      { products: withoutEmptyDrafts(products), deleted, updatedAt: Date.now() },
      { merge: true },
    ).catch(() => {
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
    const lastDraft = lastAddedId ? products.find((p) => p.id === lastAddedId) : undefined
    if (!lastDraft || !isEmptyDraft(lastDraft)) {
      addProduct()
    }
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

  function quickStandby() {
    setView('standby')
    setActiveUtility(null)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        productsViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  }

  function openTool(id: UtilityId) {
    setFabOpen(false)
    if (id === 'inventory') {
      quickArrival()
      return
    }
    setActiveUtility((prev) => (prev === id ? null : id))
  }

  function handleFabAction(id: string) {
    setFabOpen(false)
    if (id === 'newOrder') quickNewOrder()
    else if (id === 'sale') quickSale()
    else if (id === 'standby') quickStandby()
    else if (id === 'arrival') quickArrival()
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
  const alertCount = useMemo(() => countInventoryAlerts(products, officialRate), [products, officialRate])
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
    <div className="min-h-screen pb-28" dir="rtl">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1117]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-end px-4 py-3">
          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-slate-950 hover:bg-teal-400"
            >
              {(userEmail ?? '?').charAt(0).toUpperCase()}
            </button>
            {profileOpen && (
              <div className="absolute left-0 top-11 z-20 w-64 rounded-lg border border-white/10 bg-[#1a1b20] p-3 text-xs text-slate-400 shadow-lg">
                {userEmail && <p className="mb-1 break-all text-slate-200">{userEmail}</p>}
                <p className="mb-2">
                  {previousLoginAt
                    ? `התחברות קודמת: ${new Date(previousLoginAt).toLocaleString('he-IL')}`
                    : 'זו הכניסה הראשונה שלך'}
                </p>
                <button
                  onClick={() => {
                    setProfileOpen(false)
                    setActiveUtility('backup')
                  }}
                  className="mb-2 w-full rounded-md border border-white/10 py-1.5 text-center text-slate-300 hover:bg-white/5"
                >
                  גיבוי ושחזור
                </button>
                <button
                  onClick={() => signOut(auth)}
                  className="w-full rounded-md border border-white/10 py-1.5 text-center text-slate-300 hover:bg-white/5"
                >
                  התנתקות
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 flex max-w-5xl flex-col gap-6 px-4">
        {activeUtility ? (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setActiveUtility(null)}
              className="self-start text-sm font-medium text-teal-300 hover:text-teal-200"
            >
              ← חזרה
            </button>
            <h2 className="text-lg font-semibold text-slate-100">
              {UTILITIES.find((u) => u.id === activeUtility)?.label}
            </h2>
            {activeUtility === 'split' && (
              <ShipmentSplitCalculator products={products} onChange={updateProduct} usdToIlsRate={officialRate} />
            )}
            {activeUtility === 'analytics' && <Analytics products={products} usdToIlsRate={officialRate} />}
            {activeUtility === 'sales' && (
              <SalesCenter products={filteredProducts} onChange={updateProduct} usdToIlsRate={officialRate} />
            )}
            {activeUtility === 'backup' && (
              <BackupTools products={products} deleted={deleted} onImport={importBackup} />
            )}
            {activeUtility === 'currency' && <CurrencyConverter />}
          </div>
        ) : (
          <>
        <SummaryPanel products={products} usdToIlsRate={officialRate} />

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

        <section ref={productsViewRef} className="flex flex-col gap-2 scroll-mt-20">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">מוצרים</h2>
            <span className="text-xs font-medium text-slate-400">
              {view === 'active' && PRODUCT_STATUS_LABELS.active}
              {view === 'standby' && `${PRODUCT_STATUS_LABELS.standby}${standbyCount > 0 ? ` (${standbyCount})` : ''}`}
              {view === 'inventory' && `ניהול מלאי${alertCount > 0 ? ` ⚠${alertCount}` : ''}`}
            </span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש מוצר לפי שם, קטגוריה או מק״ט"
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />

          <SwipeViews
            activeIndex={VIEW_ORDER.indexOf(view)}
            count={VIEW_ORDER.length}
            onChange={(i) => setView(VIEW_ORDER[i])}
            renderPanel={renderViewPanel}
            loop={false}
          />
        </section>

        <CollapsibleSection title="היסטוריית מחיקות" accent="rose">
          <DeletedProducts deleted={deleted} onRestore={restoreProduct} onPurge={purgeDeleted} />
        </CollapsibleSection>
          </>
        )}
      </main>

      {fabOpen && <div className="fixed inset-0 z-30" onClick={() => setFabOpen(false)} />}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0f1117]/95 backdrop-blur">
        <div className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex gap-2">
            {SQUARE_TOOLS.slice(0, 2).map((tool) => (
              <button
                key={tool.id}
                onClick={() => openTool(tool.id)}
                className={`relative flex h-14 min-w-[70px] items-center justify-center rounded-xl border px-3 text-center text-sm font-medium transition-colors ${
                  activeUtility === tool.id
                    ? 'border-teal-500 bg-teal-950/30 text-teal-200'
                    : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5'
                }`}
              >
                {tool.id === 'inventory' && alertCount > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {alertCount}
                  </span>
                )}
                {tool.shortLabel}
              </button>
            ))}
          </div>

          <div className="w-16" />

          <div className="flex gap-2">
            {SQUARE_TOOLS.slice(2).map((tool) => (
              <button
                key={tool.id}
                onClick={() => openTool(tool.id)}
                className={`flex h-14 min-w-[70px] items-center justify-center rounded-xl border px-3 text-center text-sm font-medium transition-colors ${
                  activeUtility === tool.id
                    ? 'border-teal-500 bg-teal-950/30 text-teal-200'
                    : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5'
                }`}
              >
                {tool.shortLabel}
              </button>
            ))}
          </div>

          {fabOpen && (
            <div className="pointer-events-none absolute left-1/2 top-0 z-40 h-0 w-0 -translate-x-1/2">
              {FAB_ACTIONS.map((action, i) => {
                const n = FAB_ACTIONS.length
                const angleDeg = -65 + i * (130 / (n - 1))
                const rad = (angleDeg * Math.PI) / 180
                const radius = 128
                const x = radius * Math.sin(rad)
                const y = -radius * Math.cos(rad)
                return (
                  <button
                    key={action.id}
                    onClick={() => handleFabAction(action.id)}
                    style={
                      {
                        '--fan-x': `${x}px`,
                        '--fan-y': `${y}px`,
                        animation: `fan-out 320ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 35}ms both`,
                      } as CSSProperties
                    }
                    className="pointer-events-auto absolute left-0 top-0 flex h-[80px] w-[80px] items-center justify-center rounded-full border border-teal-500/25 bg-teal-950/40 p-1.5 text-center text-xs font-medium leading-tight text-slate-100 shadow-lg hover:bg-teal-900/50"
                  >
                    {action.label}
                  </button>
                )
              })}
            </div>
          )}

          <button
            onClick={() => setFabOpen((v) => !v)}
            className={`absolute -top-8 left-1/2 z-50 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-teal-500 text-3xl font-bold text-slate-950 shadow-lg shadow-teal-500/30 transition-transform ${
              fabOpen ? 'rotate-45' : ''
            }`}
          >
            +
          </button>
        </div>
      </nav>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuthUser()

  if (loading) return null
  if (!user) return <AuthScreen />

  return <AppContent uid={user.uid} userEmail={user.email} />
}
