import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { useCloudSync, type SyncState } from './cloud'
import type { AppData, Business, Customer, Doc, Expense } from './types'
import { DOC_META, computeTotals, nextDocNumber } from './utils/docs'
import { todayISO, uid } from './utils/format'

// Data saved before accounts existed; handed to the first account that signs in on this device.
const LEGACY_KEY = 'pinkas:v1'
const keyFor = (uid: string) => `pinkas:v1:${uid}`

export const DEFAULT_BUSINESS: Business = {
  name: '',
  ownerName: '',
  type: 'licensed',
  taxId: '',
  address: '',
  phone: '',
  email: '',
  vatRate: 18,
  allocationThreshold: 5000,
  accountantEmail: '',
  footerNote: '',
  startNumbers: {},
}

function load(userId: string): AppData {
  try {
    const raw = localStorage.getItem(keyFor(userId)) ?? localStorage.getItem(LEGACY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppData>
      return {
        business: { ...DEFAULT_BUSINESS, ...parsed.business },
        customers: parsed.customers ?? [],
        docs: parsed.docs ?? [],
        expenses: parsed.expenses ?? [],
      }
    }
  } catch {
    // fall through to empty data
  }
  return { business: DEFAULT_BUSINESS, customers: [], docs: [], expenses: [] }
}

interface Store {
  data: AppData
  user: User
  sync: SyncState
  setBusiness: (b: Business) => void
  upsertCustomer: (c: Customer) => void
  deleteCustomer: (id: string) => void
  saveDraft: (d: Doc) => void
  issueDoc: (d: Doc) => Doc
  deleteDraft: (id: string) => void
  setDocClosed: (id: string, closed: boolean) => void
  upsertExpense: (e: Expense) => void
  deleteExpense: (id: string) => void
  replaceAll: (d: AppData) => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ user, children, loading }: { user: User; children: ReactNode; loading: ReactNode }) {
  const [data, setDataState] = useState<AppData>(() => load(user.uid))
  const dataRef = useRef(data)
  const setData = useCallback((fn: (p: AppData) => AppData) => {
    dataRef.current = fn(dataRef.current)
    setDataState(dataRef.current)
  }, [])

  const { ready, sync } = useCloudSync(user.uid, data, setData)

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(keyFor(user.uid), JSON.stringify(data))
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      // storage full or blocked — data stays in memory and in the cloud
    }
  }, [data, ready, user.uid])

  const issueDoc = useCallback((draft: Doc): Doc => {
    const prev = dataRef.current
      let customers = prev.customers
      let customerId = draft.customerId
      // Remember new customers automatically.
      if (!customerId && draft.customer.name.trim()) {
        const match = customers.find((c) => c.name.trim() === draft.customer.name.trim())
        if (match) customerId = match.id
        else {
          const c: Customer = { ...draft.customer, id: uid(), createdAt: new Date().toISOString() }
          customers = [...customers, c]
          customerId = c.id
        }
      }
      const issued: Doc = {
        ...draft,
        customerId,
        status: 'issued',
        number: nextDocNumber(prev.docs, draft.type, prev.business.startNumbers),
        issuedAt: new Date().toISOString(),
      }
      let docs = prev.docs.filter((d) => d.id !== draft.id).concat(issued)
      // A receipt or credit against an open invoice closes it once fully covered.
      if (draft.relatedDocId) {
        const related = docs.find((d) => d.id === draft.relatedDocId)
        if (related && DOC_META[related.type].awaitsPayment && !related.closed) {
          const covered = docs
            .filter((d) => d.status === 'issued' && d.relatedDocId === related.id)
            .reduce((s, d) => s + computeTotals(d).total, 0)
          if (covered >= computeTotals(related).total - 0.01) {
            docs = docs.map((d) => (d.id === related.id ? { ...d, closed: true } : d))
          }
        }
      }
      setData(() => ({ ...prev, customers, docs }))
      return issued
  }, [setData])

  const store = useMemo<Store>(
    () => ({
      data,
      user,
      sync,
      setBusiness: (business) => setData((p) => ({ ...p, business })),
      upsertCustomer: (c) =>
        setData((p) => ({
          ...p,
          customers: p.customers.some((x) => x.id === c.id) ? p.customers.map((x) => (x.id === c.id ? c : x)) : [...p.customers, c],
        })),
      deleteCustomer: (id) => setData((p) => ({ ...p, customers: p.customers.filter((c) => c.id !== id) })),
      saveDraft: (d) =>
        setData((p) => ({
          ...p,
          docs: p.docs.some((x) => x.id === d.id) ? p.docs.map((x) => (x.id === d.id ? d : x)) : [...p.docs, d],
        })),
      issueDoc,
      deleteDraft: (id) => setData((p) => ({ ...p, docs: p.docs.filter((d) => !(d.id === id && d.status === 'draft')) })),
      setDocClosed: (id, closed) => setData((p) => ({ ...p, docs: p.docs.map((d) => (d.id === id ? { ...d, closed } : d)) })),
      upsertExpense: (e) =>
        setData((p) => ({
          ...p,
          expenses: p.expenses.some((x) => x.id === e.id) ? p.expenses.map((x) => (x.id === e.id ? e : x)) : [...p.expenses, e],
        })),
      deleteExpense: (id) => setData((p) => ({ ...p, expenses: p.expenses.filter((e) => e.id !== id) })),
      replaceAll: (d) => setData(() => ({ ...d, business: { ...DEFAULT_BUSINESS, ...d.business } })),
    }),
    [data, user, sync, issueDoc, setData],
  )

  // Wait for the first cloud read so a new device doesn't flash the setup screen.
  if (!ready) return <>{loading}</>
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

export function emptyDoc(type: Doc['type'], business: Business): Doc {
  return {
    id: uid(),
    type,
    status: 'draft',
    date: todayISO(),
    customer: { name: '', taxId: '', phone: '', email: '', address: '' },
    items: [{ id: uid(), description: '', quantity: 1, unitPrice: 0 }],
    pricesIncludeVat: true,
    vatRate: business.type === 'exempt' || type === 'receipt' ? 0 : business.vatRate,
    discountPercent: 0,
    payments: [],
    description: '',
    notes: '',
    allocationNumber: '',
    closed: false,
    createdAt: new Date().toISOString(),
  }
}
