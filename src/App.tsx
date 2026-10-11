import { signOut } from 'firebase/auth'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { BackupTools } from './components/BackupTools'
import { ChatEntry } from './components/ChatEntry'
import { ChecklistPanel } from './components/ChecklistPanel'
import { CollapsibleSection } from './components/CollapsibleSection'
import { CurrencyConverter } from './components/CurrencyConverter'
import { CustomersPage } from './components/CustomersPage'
import type { OrderLine } from './components/CustomerOrderForm'
import { DeletedProducts } from './components/DeletedProducts'
import { Analytics } from './components/Analytics'
import { InventoryPage } from './components/InventoryPage'
import { ProductCard } from './components/ProductCard'
import { SalesCenter } from './components/SalesCenter'
import { ShipmentSplitCalculator } from './components/ShipmentSplitCalculator'
import { SummaryPanel } from './components/SummaryPanel'
import { SwipeViews } from './components/SwipeViews'
import { ToastContainer } from './components/ToastContainer'
import { createDefaultProduct } from './defaultProduct'
import { auth } from './firebase'
import { useAuthUser } from './hooks/useAuthUser'
import { useCloudSync } from './hooks/useCloudSync'
import { useOfficialRate } from './hooks/useOfficialRate'
import { useToast } from './hooks/useToast'
import { PRODUCT_STATUS_LABELS, type ChecklistItem, type Currency, type Customer, type MarketingExpense, type Product } from './types'
import { amountInIls, countInventoryAlerts } from './utils/calculations'
import { isEmptyDraft, normalizeProduct } from './utils/persistence'

type View = 'active' | 'standby' | 'inventory'
const VIEW_ORDER: View[] = ['active', 'standby', 'inventory']

type UtilityId = 'inventory' | 'split' | 'sales' | 'backup' | 'currency' | 'analytics' | 'customers'
const UTILITIES: { id: UtilityId; label: string; shortLabel: string; icon: string }[] = [
  { id: 'inventory', label: 'ניהול מלאי', shortLabel: 'מלאי', icon: '📦' },
  { id: 'split', label: 'פיצול משלוח/מכס', shortLabel: 'פיצול', icon: '🧮' },
  { id: 'analytics', label: 'אנליטיקה כלכלית', shortLabel: 'אנליטיקה', icon: '📊' },
  { id: 'customers', label: 'כרטיסי לקוחות', shortLabel: 'לקוחות', icon: '👥' },
  { id: 'sales', label: 'מכירות והחזרות', shortLabel: 'מכירות', icon: '🧾' },
  { id: 'backup', label: 'גיבוי ושחזור', shortLabel: 'גיבוי', icon: '💾' },
  { id: 'currency', label: 'המרת מטבע', shortLabel: 'מטח', icon: '💱' },
]
// The square nav buttons show the four most-used tools, split evenly (2+2):
// inventory, split, analytics and customers. "מלאי" jumps straight to the full
// inventory tab instead of opening a page of its own. Sales lives in the FAB
// menu; backup and currency conversion live in the settings dropdown — all
// three are used less often than the four promoted to the main nav.
const SQUARE_TOOLS = UTILITIES.filter((u) => u.id !== 'sales' && u.id !== 'backup' && u.id !== 'currency')

interface FabAction {
  id: string
  label: string
  icon: string
}
const FAB_ACTIONS: FabAction[] = [
  { id: 'newOrder', label: 'פתיחת הזמנה', icon: '📝' },
  { id: 'sale', label: 'מכירה', icon: '💰' },
  { id: 'standby', label: 'רשומים במערכת', icon: '📋' },
  { id: 'arrival', label: 'קבלת משלוח', icon: '🚚' },
]

interface AppContentProps {
  uid: string
  userEmail: string | null
}

function AppContent({ uid, userEmail }: AppContentProps) {
  const {
    products,
    setProducts,
    deleted,
    setDeleted,
    marketingExpenses,
    setMarketingExpenses,
    customers,
    setCustomers,
    checklist,
    setChecklist,
    previousLoginAt,
  } = useCloudSync(uid)
  const [view, setView] = useState<View>('active')
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeUtility, setActiveUtility] = useState<UtilityId | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const productsViewRef = useRef<HTMLElement>(null)
  const { officialRate } = useOfficialRate()
  const { toasts, showToast, dismiss } = useToast()

  // Lock in the USD rate for any product that doesn't have one yet, once a live rate is available.
  useEffect(() => {
    if (officialRate === null) return
    setProducts((prev) => {
      if (!prev.some((p) => p.usdRateOverride === null)) return prev
      return prev.map((p) => (p.usdRateOverride === null ? { ...p, usdRateOverride: officialRate } : p))
    })
  }, [officialRate, setProducts])

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
      showToast(`"${target.name || 'מוצר ללא שם'}" הועבר להיסטוריית מחיקות`, 'info')
    }
  }

  function restoreProduct(id: string) {
    const entry = deleted.find((d) => d.product.id === id)
    setDeleted((prev) => prev.filter((d) => d.product.id !== id))
    if (entry) {
      setProducts((prev) => [...prev, entry.product])
      showToast(`"${entry.product.name || 'מוצר ללא שם'}" שוחזר`, 'success')
    }
  }

  function purgeDeleted(id: string) {
    setDeleted((prev) => prev.filter((d) => d.product.id !== id))
    showToast('המוצר נמחק לצמיתות', 'info')
  }

  function addMarketingExpense(expense: MarketingExpense) {
    setMarketingExpenses((prev) => [expense, ...prev])
    showToast('הוצאת הפרסום נוספה', 'success')
  }

  function removeMarketingExpense(id: string) {
    setMarketingExpenses((prev) => prev.filter((e) => e.id !== id))
    showToast('הוצאת הפרסום נמחקה', 'info')
  }

  function addCustomer(customer: Customer) {
    setCustomers((prev) => [customer, ...prev])
    showToast(`הלקוח "${customer.name}" נוסף`, 'success')
  }

  function updateCustomer(customer: Customer) {
    setCustomers((prev) => prev.map((c) => (c.id === customer.id ? customer : c)))
    showToast('פרטי הלקוח עודכנו', 'success')
  }

  function removeCustomer(id: string) {
    const target = customers.find((c) => c.id === id)
    setCustomers((prev) => prev.filter((c) => c.id !== id))
    if (target) showToast(`הלקוח "${target.name}" נמחק`, 'info')
  }

  // Creates one new product per order line, splitting the combined shipping
  // cost proportionally by each line's purchase value (falls back to an even
  // split when no line has a price yet) — same approach as the standalone
  // shipment-split tool, just applied at order-creation time instead of after.
  function createOrderForCustomer(customer: Customer, lines: OrderLine[], shippingAmountIls: number, _shippingCurrency: Currency) {
    const values = lines.map((l) => amountInIls(l.quantity * l.pricePerUnit, l.currency, officialRate))
    const totalValue = values.reduce((sum, v) => sum + v, 0)
    const newProducts = lines.map((line, i) => {
      const share = totalValue > 0 ? values[i] / totalValue : lines.length > 0 ? 1 / lines.length : 0
      const shippingShare = shippingAmountIls * share
      const product = createDefaultProduct(officialRate)
      return {
        ...product,
        name: line.name,
        purchasePricePerUnit: line.pricePerUnit,
        purchaseCurrency: line.currency,
        shipments: [{ id: crypto.randomUUID(), quantity: line.quantity, arrived: false, expectedDate: '' }],
        expenses:
          shippingShare > 0
            ? [{ id: crypto.randomUUID(), label: 'משלוח (חלק יחסי מההזמנה)', amount: shippingShare, currency: 'ILS' as const }]
            : [],
        linkedCustomerId: customer.id,
      }
    })
    setProducts((prev) => [...prev, ...newProducts])
    showToast(`ההזמנה עבור "${customer.name}" נוצרה — ${newProducts.length} מוצרים`, 'success')
  }

  function addChecklistItem(text: string) {
    const item: ChecklistItem = {
      id: crypto.randomUUID(),
      text,
      done: false,
      createdAt: new Date().toISOString(),
      updates: [],
    }
    setChecklist((prev) => [item, ...prev])
  }

  function toggleChecklistDone(id: string) {
    setChecklist((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))
  }

  function deleteChecklistItem(id: string) {
    setChecklist((prev) => prev.filter((i) => i.id !== id))
    showToast('המשימה נמחקה', 'info')
  }

  function editChecklistText(id: string, text: string) {
    setChecklist((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)))
  }

  function addChecklistUpdate(id: string, text: string) {
    setChecklist((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, updates: [...i.updates, { id: crypto.randomUUID(), text, timestamp: new Date().toISOString() }] }
          : i,
      ),
    )
  }

  function importBackup(data: { products: Partial<Product>[]; deleted: { product: Partial<Product>; deletedAt: string }[] }) {
    setProducts(data.products.map(normalizeProduct))
    setDeleted(data.deleted.map((d) => ({ product: normalizeProduct(d.product), deletedAt: d.deletedAt })))
    showToast('הגיבוי יובא בהצלחה', 'success')
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
      return <InventoryPage products={filteredProducts} onChange={updateProduct} usdToIlsRate={officialRate} customers={customers} />
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
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
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
                    setActiveUtility('sales')
                  }}
                  className="mb-2 w-full rounded-md border border-white/10 py-1.5 text-center text-slate-300 hover:bg-white/5"
                >
                  🧾 מכירות והחזרות
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false)
                    setActiveUtility('currency')
                  }}
                  className="mb-2 w-full rounded-md border border-white/10 py-1.5 text-center text-slate-300 hover:bg-white/5"
                >
                  💱 המרת מטבע
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false)
                    setActiveUtility('backup')
                  }}
                  className="mb-2 w-full rounded-md border border-white/10 py-1.5 text-center text-slate-300 hover:bg-white/5"
                >
                  💾 גיבוי ושחזור
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
              {UTILITIES.find((u) => u.id === activeUtility)?.icon}{' '}
              {UTILITIES.find((u) => u.id === activeUtility)?.label}
            </h2>
            {activeUtility === 'split' && (
              <ShipmentSplitCalculator products={products} onChange={updateProduct} usdToIlsRate={officialRate} />
            )}
            {activeUtility === 'analytics' && (
              <Analytics
                products={products}
                usdToIlsRate={officialRate}
                marketingExpenses={marketingExpenses}
                onAddMarketingExpense={addMarketingExpense}
                onRemoveMarketingExpense={removeMarketingExpense}
              />
            )}
            {activeUtility === 'sales' && (
              <SalesCenter
                products={filteredProducts}
                onChange={updateProduct}
                usdToIlsRate={officialRate}
                customers={customers}
                onCreateCustomer={addCustomer}
              />
            )}
            {activeUtility === 'backup' && (
              <BackupTools products={products} deleted={deleted} onImport={importBackup} />
            )}
            {activeUtility === 'currency' && <CurrencyConverter />}
            {activeUtility === 'customers' && (
              <CustomersPage
                customers={customers}
                products={products}
                usdToIlsRate={officialRate}
                onAdd={addCustomer}
                onUpdate={updateCustomer}
                onRemove={removeCustomer}
                onCreateOrder={createOrderForCustomer}
              />
            )}
          </div>
        ) : (
          <>
        <SummaryPanel products={products} usdToIlsRate={officialRate} />

        <ChecklistPanel
          items={checklist}
          onAdd={addChecklistItem}
          onToggleDone={toggleChecklistDone}
          onDelete={deleteChecklistItem}
          onEditText={editChecklistText}
          onAddUpdate={addChecklistUpdate}
        />

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
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-base leading-none">{tool.icon}</span>
                  <span className="text-[11px] leading-none">{tool.shortLabel}</span>
                </span>
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
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-base leading-none">{tool.icon}</span>
                  <span className="text-[11px] leading-none">{tool.shortLabel}</span>
                </span>
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
                    className="pointer-events-auto absolute left-0 top-0 flex h-[80px] w-[80px] flex-col items-center justify-center gap-0.5 rounded-full border-[3px] border-teal-300 bg-[#0d1418] p-1.5 text-center text-xs font-bold leading-tight text-white shadow-[0_0_0_4px_rgba(13,20,24,0.9),0_6px_24px_rgba(0,0,0,0.7)] hover:bg-[#132025]"
                  >
                    <span className="text-lg leading-none">{action.icon}</span>
                    <span>{action.label}</span>
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
