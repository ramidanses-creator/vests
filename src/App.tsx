import { useEffect, useMemo, useState } from 'react'
import { CurrencyConverter } from './components/CurrencyConverter'
import { ProductCard } from './components/ProductCard'
import { SummaryPanel } from './components/SummaryPanel'
import { createDefaultProduct } from './defaultProduct'
import { useOfficialRate } from './hooks/useOfficialRate'
import type { Product } from './types'

const STORAGE_KEY = 'import-tracker-products'

function normalizeProduct(raw: Partial<Product>): Product {
  const fallback = createDefaultProduct()
  return {
    ...fallback,
    ...raw,
    purchasePricePerUnit: raw.purchasePricePerUnit ?? fallback.purchasePricePerUnit,
    purchaseCurrency: raw.purchaseCurrency ?? fallback.purchaseCurrency,
    targetProfitPercent: raw.targetProfitPercent ?? fallback.targetProfitPercent,
    status: raw.status ?? fallback.status,
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
  const [tab, setTab] = useState<'active' | 'standby'>('active')
  const { officialRate } = useOfficialRate()

  useEffect(() => {
    saveProducts(products)
  }, [products])

  function updateProduct(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  function addProduct() {
    setProducts((prev) => [...prev, createDefaultProduct()])
  }

  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const visibleProducts = useMemo(() => products.filter((p) => p.status === tab), [products, tab])
  const standbyCount = useMemo(() => products.filter((p) => p.status === 'standby').length, [products])

  return (
    <div className="min-h-screen bg-slate-100 pb-16" dir="rtl">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-5">
          <h1 className="text-2xl font-bold text-slate-900">מעקב הזמנות ורווחים</h1>
          <p className="text-sm text-slate-500">
            רשמו לכל מוצר את כל ההוצאות עד הגעתו לארץ ואת המכירות שלו — האפליקציה תחשב עלות ליחידה ורווח בפועל.
          </p>
        </div>
      </header>

      <main className="mx-auto mt-6 flex max-w-5xl flex-col gap-6 px-4">
        <SummaryPanel products={products} usdToIlsRate={officialRate} />
        <CurrencyConverter />

        <div className="flex gap-2">
          <button
            onClick={() => setTab('active')}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              tab === 'active' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            פעילים
          </button>
          <button
            onClick={() => setTab('standby')}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              tab === 'standby' ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            בהמתנה {standbyCount > 0 ? `(${standbyCount})` : ''}
          </button>
        </div>

        {visibleProducts.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
            {tab === 'active' ? 'אין מוצרים פעילים כרגע.' : 'אין מוצרים בהמתנה כרגע.'}
          </p>
        )}

        {visibleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onChange={updateProduct}
            onRemove={() => removeProduct(product.id)}
            usdToIlsRate={officialRate}
          />
        ))}

        {tab === 'active' && (
          <button
            onClick={addProduct}
            className="rounded-lg border border-dashed border-slate-400 bg-white px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
          >
            + מוצר חדש
          </button>
        )}
      </main>
    </div>
  )
}
