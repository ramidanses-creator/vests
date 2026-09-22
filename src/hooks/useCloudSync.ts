import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { db } from '../firebase'
import { createDefaultProduct } from '../defaultProduct'
import type { DeletedProduct, MarketingExpense, Product } from '../types'
import {
  loadDeleted,
  loadMarketingExpenses,
  loadProducts,
  loadSeenRemoteIds,
  normalizeMarketingExpense,
  normalizeProduct,
  saveDeleted,
  saveMarketingExpenses,
  saveProducts,
  saveSeenRemoteIds,
  withoutEmptyDrafts,
  writeAutoBackupIfNeeded,
} from '../utils/persistence'

const FIRESTORE_WRITE_DEBOUNCE_MS = 600

export function useCloudSync(uid: string) {
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = loadProducts()
    return stored.length > 0 ? stored : [createDefaultProduct()]
  })
  const [deleted, setDeleted] = useState<DeletedProduct[]>(() => loadDeleted())
  const [marketingExpenses, setMarketingExpenses] = useState<MarketingExpense[]>(() => loadMarketingExpenses())
  const [cloudLoaded, setCloudLoaded] = useState(false)
  const [previousLoginAt, setPreviousLoginAt] = useState<number | null>(null)

  useEffect(() => {
    saveProducts(products)
    writeAutoBackupIfNeeded(products, deleted, marketingExpenses)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products])

  useEffect(() => {
    saveDeleted(deleted)
  }, [deleted])

  useEffect(() => {
    saveMarketingExpenses(marketingExpenses)
  }, [marketingExpenses])

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
          marketingExpenses?: Partial<MarketingExpense>[]
          lastLoginAt?: number
        }
        if (data.products) setProducts(data.products.map(normalizeProduct))
        if (data.deleted) setDeleted(data.deleted.map((d) => ({ product: normalizeProduct(d.product), deletedAt: d.deletedAt })))
        if (data.marketingExpenses) setMarketingExpenses(data.marketingExpenses.map(normalizeMarketingExpense))
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
  // merge:true keeps the lastLoginAt field written above intact. Debounced so
  // rapid edits (typing, dragging) don't fire a write per keystroke.
  const writeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!cloudLoaded) return
    if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current)
    writeTimeoutRef.current = setTimeout(() => {
      setDoc(
        doc(db, 'users', uid),
        { products: withoutEmptyDrafts(products), deleted, marketingExpenses, updatedAt: Date.now() },
        { merge: true },
      ).catch(() => {
        // offline or blocked — localStorage still has the data
      })
    }, FIRESTORE_WRITE_DEBOUNCE_MS)
    return () => {
      if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current)
    }
  }, [uid, cloudLoaded, products, deleted, marketingExpenses])

  // Merge in products published to the static products.json file (e.g. via an
  // external feed), skipping ones already seen so they aren't re-added after deletion.
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

  return {
    products,
    setProducts,
    deleted,
    setDeleted,
    marketingExpenses,
    setMarketingExpenses,
    cloudLoaded,
    previousLoginAt,
  }
}
