import { useEffect, useMemo, useState } from 'react'
import { ChatEntry } from './components/ChatEntry'
import { CollapsibleSection } from './components/CollapsibleSection'
import { CurrencyConverter } from './components/CurrencyConverter'
import { DeletedProducts } from './components/DeletedProducts'
import { InventoryByCategory } from './components/InventoryByCategory'
import { InventoryPage } from './components/InventoryPage'
import { ProductCard } from './components/ProductCard'
import { SummaryPanel } from './components/SummaryPanel'
import { SwipeViews } from './components/SwipeViews'
import { createDefaultProduct } from './defaultProduct'
import { useOfficialRate } from './hooks/useOfficialRate'
import { PRODUCT_STATUS_LABELS, type DeletedProduct, type Product } from './types'

const STORAGE_KEY = 'import-tracker-products'
const TRASH_KEY = 'import-tracker-deleted-products'
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

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = loadProducts()
    return stored.length > 0 ? stored : [createDefaultProduct()]
  })
  const [deleted, setDeleted] = useState<DeletedProduct[]>(() => loadDeleted())
  const [view, setView] = useState<View>('active')
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const { officialRate } = useOfficialRate()

  useEffect(() => {
    saveProducts(products)
  }, [products])

  useEffect(() => {
    saveDeleted(deleted)
  }, [deleted])

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

  const standbyCount = useMemo(() => products.filter((p) => p.status === 'standby').length, [products])
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
      return <InventoryPage products={products} onChange={updateProduct} usdToIlsRate={officialRate} />
    }
    const list = products.filter((p) => p.status === v)
    return (
      <div className="flex flex-col gap-6">
        {list.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
            {v === 'active' ? 'אין מוצרים בהזמנה החדשה כרגע.' : 'אין מוצרים רשומים במערכת כרגע.'}
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
            className="rounded-2xl border-2 border-dashed border-teal-700/60 bg-teal-950/10 px-4 py-3 text-sm font-medium text-teal-300 hover:bg-teal-950/20"
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
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-4 sm:py-5">
          <h1 className="bg-gradient-to-l from-sky-400 via-violet-400 to-amber-300 bg-clip-text text-xl font-extrabold text-transparent sm:text-2xl">
            מעקב הזמנות ורווחים
          </h1>
          <p className="text-sm text-slate-400">
            רשמו לכל מוצר את כל ההוצאות עד הגעתו לארץ ואת המכירות שלו — האפליקציה תחשב עלות ליחידה ורווח בפועל.
          </p>
        </div>
      </header>

      <main className="mx-auto mt-6 flex max-w-5xl flex-col gap-6 px-4">
        <SummaryPanel products={products} usdToIlsRate={officialRate} />

        <CollapsibleSection title="בדיקת מלאי לפי קטגוריה" icon="📦" accent="violet">
          <InventoryByCategory products={products} usdToIlsRate={officialRate} />
        </CollapsibleSection>

        <CollapsibleSection title="מחשבון המרה דולר / שקל" icon="💱" accent="amber">
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
            className="rounded-2xl border-r-4 border-teal-500 bg-teal-950/30 px-4 py-3 text-sm font-medium text-teal-200 shadow-lg shadow-black/20 hover:bg-teal-950/50"
          >
            💬 הוספת מוצר בצ׳אט
          </button>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setView('active')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              view === 'active'
                ? 'bg-teal-500 text-slate-950 shadow shadow-teal-500/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {PRODUCT_STATUS_LABELS.active}
          </button>
          <button
            onClick={() => setView('standby')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              view === 'standby'
                ? 'bg-violet-500 text-slate-950 shadow shadow-violet-500/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {PRODUCT_STATUS_LABELS.standby} {standbyCount > 0 ? `(${standbyCount})` : ''}
          </button>
          <button
            onClick={() => setView('inventory')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
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

        <CollapsibleSection title="היסטוריית מחיקות" icon="🗑️" accent="rose">
          <DeletedProducts deleted={deleted} onRestore={restoreProduct} onPurge={purgeDeleted} />
        </CollapsibleSection>
      </main>
    </div>
  )
}
