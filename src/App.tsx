import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatEntry } from './components/ChatEntry'
import { CollapsibleSection } from './components/CollapsibleSection'
import { CurrencyConverter } from './components/CurrencyConverter'
import { InventoryByCategory } from './components/InventoryByCategory'
import { InventoryPage } from './components/InventoryPage'
import { ProductCard } from './components/ProductCard'
import { SummaryPanel } from './components/SummaryPanel'
import { createDefaultProduct } from './defaultProduct'
import { useOfficialRate } from './hooks/useOfficialRate'
import { PRODUCT_STATUS_LABELS, type Product } from './types'

const STORAGE_KEY = 'import-tracker-products'
const SEEN_REMOTE_IDS_KEY = 'import-tracker-seen-remote-ids'

type View = 'active' | 'standby' | 'inventory'
const VIEW_ORDER: View[] = ['active', 'standby', 'inventory']

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
    category: raw.category ?? fallback.category,
    purchasePricePerUnit: raw.purchasePricePerUnit ?? fallback.purchasePricePerUnit,
    purchaseCurrency: raw.purchaseCurrency ?? fallback.purchaseCurrency,
    usdRateOverride: raw.usdRateOverride ?? null,
    targetProfitPercent: raw.targetProfitPercent ?? fallback.targetProfitPercent,
    status: raw.status ?? fallback.status,
    shipments,
    expenses: raw.expenses ?? fallback.expenses,
    sales: raw.sales ?? fallback.sales,
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

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = loadProducts()
    return stored.length > 0 ? stored : [createDefaultProduct()]
  })
  const [view, setView] = useState<View>('active')
  const [chatOpen, setChatOpen] = useState(false)
  const { officialRate } = useOfficialRate()
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    saveProducts(products)
  }, [products])

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
    setProducts((prev) => [...prev, createDefaultProduct(officialRate)])
  }

  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const visibleProducts = useMemo(
    () => products.filter((p) => p.status === view),
    [products, view],
  )
  const standbyCount = useMemo(() => products.filter((p) => p.status === 'standby').length, [products])
  const categoryOptions = useMemo(
    () => Array.from(new Set(products.map((p) => p.category.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'he')),
    [products],
  )

  function switchView(direction: 1 | -1) {
    const idx = VIEW_ORDER.indexOf(view)
    const next = VIEW_ORDER[(idx + direction + VIEW_ORDER.length) % VIEW_ORDER.length]
    setView(next)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 60) return
    switchView(delta < 0 ? 1 : -1)
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-16" dir="rtl">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-4 sm:py-5">
          <h1 className="text-xl font-bold text-white sm:text-2xl">מעקב הזמנות ורווחים</h1>
          <p className="text-sm text-slate-400">
            רשמו לכל מוצר את כל ההוצאות עד הגעתו לארץ ואת המכירות שלו — האפליקציה תחשב עלות ליחידה ורווח בפועל.
          </p>
        </div>
      </header>

      <main className="mx-auto mt-6 flex max-w-5xl flex-col gap-6 px-4">
        <SummaryPanel products={products} usdToIlsRate={officialRate} />

        <CollapsibleSection title="בדיקת מלאי לפי קטגוריה" icon="📦">
          <InventoryByCategory products={products} usdToIlsRate={officialRate} />
        </CollapsibleSection>

        <CollapsibleSection title="מחשבון המרה דולר / שקל" icon="💱">
          <CurrencyConverter />
        </CollapsibleSection>

        {chatOpen ? (
          <ChatEntry
            onCreate={(product) => setProducts((prev) => [...prev, product])}
            onClose={() => setChatOpen(false)}
            usdRateOverride={officialRate}
          />
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="rounded-lg border border-indigo-800 bg-indigo-950/30 px-4 py-3 text-sm text-indigo-300 hover:bg-indigo-950/50"
          >
            💬 הוספת מוצר בצ׳אט
          </button>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setView('active')}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              view === 'active' ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {PRODUCT_STATUS_LABELS.active}
          </button>
          <button
            onClick={() => setView('standby')}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              view === 'standby' ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {PRODUCT_STATUS_LABELS.standby} {standbyCount > 0 ? `(${standbyCount})` : ''}
          </button>
          <button
            onClick={() => setView('inventory')}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              view === 'inventory' ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            ניהול מלאי
          </button>
        </div>

        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="flex flex-col gap-6">
          {view === 'inventory' ? (
            <InventoryPage products={products} onChange={updateProduct} usdToIlsRate={officialRate} />
          ) : (
            <>
              {visibleProducts.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-sm text-slate-500">
                  {view === 'active' ? 'אין מוצרים פעילים כרגע.' : 'אין מוצרים רשומים במערכת כרגע.'}
                </p>
              )}

              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onChange={updateProduct}
                  onRemove={() => removeProduct(product.id)}
                  usdToIlsRate={officialRate}
                  categoryOptions={categoryOptions}
                />
              ))}

              {view === 'active' && (
                <button
                  onClick={addProduct}
                  className="rounded-lg border border-dashed border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-400 hover:bg-slate-800"
                >
                  + מוצר חדש
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
