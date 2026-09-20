import { useEffect, useState } from 'react'
import { CurrencyConverter } from './components/CurrencyConverter'
import { ProductCard } from './components/ProductCard'
import { SummaryPanel } from './components/SummaryPanel'
import { createDefaultProduct } from './defaultProduct'
import { useOfficialRate } from './hooks/useOfficialRate'
import type { Product } from './types'

const STORAGE_KEY = 'import-tracker-products'

function loadProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Product[]
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

        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onChange={updateProduct}
            onRemove={() => removeProduct(product.id)}
            usdToIlsRate={officialRate}
          />
        ))}

        <button
          onClick={addProduct}
          className="rounded-lg border border-dashed border-slate-400 bg-white px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
        >
          + מוצר חדש
        </button>
      </main>
    </div>
  )
}
