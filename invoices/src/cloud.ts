import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getDocsFromCache,
  onSnapshot,
  type QuerySnapshot,
  setDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { db } from './firebase'
import type { AppData, Business, Expense } from './types'
import { getFile, putFile } from './utils/fileStore'

export type SyncStatus = 'loading' | 'synced' | 'saving' | 'offline' | 'error'

export interface SyncState {
  status: SyncStatus
  error?: string
  lastSyncedAt?: number
}

// Each list in the app data syncs as one Firestore document per record, keyed `<prefix><id>`.
const LISTS = {
  customer: { prefix: 'c_', list: 'customers' },
  doc: { prefix: 'd_', list: 'docs' },
  expense: { prefix: 'e_', list: 'expenses' },
  item: { prefix: 'i_', list: 'items' },
  supplier: { prefix: 's_', list: 'suppliers' },
  expenseType: { prefix: 't_', list: 'expenseTypes' },
} as const

type ListKind = keyof typeof LISTS
type Kind = 'business' | ListKind

interface Entity {
  kind: Kind
  data: DocumentData
}

const PREFIX = { expense: LISTS.expense.prefix }

let currentUid: string | null = null

const entityCol = (uid: string) => collection(db, 'users', uid, 'pinkas')
const fileRef = (uid: string, id: string) => doc(db, 'users', uid, 'pinkas_files', id)

/** JSON with sorted keys, so the same object always compares equal after a Firestore round-trip. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : stableStringify(x))).join(',')}]`
  const obj = v as Record<string, unknown>
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`
}

export function toEntities(data: AppData): Map<string, Entity> {
  const m = new Map<string, Entity>()
  if (data.business.name) m.set('business', { kind: 'business', data: data.business })
  for (const kind of Object.keys(LISTS) as ListKind[]) {
    const { prefix, list } = LISTS[kind]
    for (const x of (data[list] ?? []) as { id: string }[]) m.set(prefix + x.id, { kind, data: x })
  }
  return m
}

/** Puts one remote entity into the app data (or removes it when `entity` is null). */
export function applyEntity(data: AppData, key: string, entity: Entity | null): AppData {
  if (key === 'business') return entity ? { ...data, business: { ...data.business, ...(entity.data as Business) } } : data
  const kind = (Object.keys(LISTS) as ListKind[]).find((k) => key.startsWith(LISTS[k].prefix))
  if (!kind) return data
  const { prefix, list } = LISTS[kind]
  const id = key.slice(prefix.length)
  const arr = ((data[list] ?? []) as { id: string }[]).filter((x) => x.id !== id || entity)
  const item = entity?.data as { id: string } | undefined
  const next = !item ? arr : arr.some((x) => x.id === id) ? arr.map((x) => (x.id === id ? item : x)) : [...arr, item]
  return { ...data, [list]: next }
}

/**
 * First sign-in on a device: everything in the cloud wins, and anything that only
 * exists locally (e.g. made before signing in) is kept and will be uploaded.
 */
export function mergeInitial(local: AppData, remote: Map<string, Entity>): AppData {
  let merged = local
  for (const [key, entity] of remote) {
    if (key === 'business' && !(entity.data as Business).name) continue
    merged = applyEntity(merged, key, entity)
  }
  return merged
}

function errorMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? ''
  if (code === 'permission-denied')
    return 'אין הרשאה לשמור בענן. צריך לעדכן את חוקי האבטחה של Firestore (ראו README של האפליקציה).'
  if (code === 'unavailable') return 'אין חיבור לשרת. הנתונים נשמרים במכשיר ויעלו כשהחיבור יחזור.'
  return 'הסנכרון לענן נכשל. הנתונים שמורים במכשיר.'
}

const MAX_FILE_BYTES = 700 * 1024
const INITIAL_LOAD_TIMEOUT_MS = 6000

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(s)
}

async function uploadFile(uid: string, id: string) {
  const blob = await getFile(id)
  if (!blob || blob.size > MAX_FILE_BYTES) return
  await setDoc(fileRef(uid, id), { type: blob.type, data: await blobToBase64(blob) })
}

/** Fetches an expense file stored in the cloud (e.g. photographed on another device) into the local cache. */
export async function fetchCloudFile(id: string): Promise<Blob | undefined> {
  if (!currentUid) return undefined
  const snap = await getDoc(fileRef(currentUid, id))
  if (!snap.exists()) return undefined
  const { type, data } = snap.data() as { type: string; data: string }
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type })
  await putFile(id, blob).catch(() => {})
  return blob
}

const fileIdOf = (json: string | undefined) => (json ? ((JSON.parse(json) as Expense).fileId ?? undefined) : undefined)

/**
 * Two-way sync between the in-memory app data and users/{uid}/pinkas.
 * Each customer, document and expense is its own Firestore document, so only what
 * changed is written. `synced` remembers what the cloud holds, to diff against.
 */
export function useCloudSync(uid: string, data: AppData, setData: (fn: (p: AppData) => AppData) => void) {
  const synced = useRef(new Map<string, string>())
  const [ready, setReady] = useState(false)
  const [sync, setSync] = useState<SyncState>({ status: 'loading' })
  const pending = useRef(0)

  useEffect(() => {
    currentUid = uid
    let unsub: (() => void) | undefined
    let cancelled = false
    // Don't hold the app on the splash screen when the network is slow or missing:
    // after a few seconds start from what's on the device; the live listener below
    // brings in the cloud data whenever it arrives.
    const timeout = new Promise<null>((res) => setTimeout(() => res(null), INITIAL_LOAD_TIMEOUT_MS))
    Promise.race([getDocs(entityCol(uid)), timeout])
      .then((snap): Promise<QuerySnapshot | null> | QuerySnapshot =>
        snap ?? getDocsFromCache(entityCol(uid)).catch(() => null),
      )
      .then((snap) => {
        if (cancelled) return
        const remote = new Map<string, Entity>()
        snap?.forEach((d) => remote.set(d.id, d.data() as Entity))
        const fromServer = !!snap && !snap.metadata.fromCache
        synced.current = new Map([...remote].map(([k, v]) => [k, stableStringify(v.data)]))
        setData((local) => mergeInitial(local, remote))
        setReady(true)
        setSync(fromServer ? { status: 'synced', lastSyncedAt: Date.now() } : { status: 'offline' })

        unsub = onSnapshot(
          entityCol(uid),
          (live) => {
            if (!live.metadata.fromCache && pending.current === 0)
              setSync((s) => (s.status === 'error' ? s : { status: 'synced', lastSyncedAt: Date.now() }))
            for (const change of live.docChanges()) {
              // Our own writes echo back first with pending writes — the state already has them.
              if (change.doc.metadata.hasPendingWrites) continue
              const key = change.doc.id
              if (change.type === 'removed') {
                if (!synced.current.has(key)) continue
                synced.current.delete(key)
                setData((p) => applyEntity(p, key, null))
                continue
              }
              const entity = change.doc.data() as Entity
              const json = stableStringify(entity.data)
              if (synced.current.get(key) === json) continue
              synced.current.set(key, json)
              setData((p) => applyEntity(p, key, entity))
            }
          },
          (err) => setSync({ status: 'error', error: errorMessage(err) }),
        )
      })
      .catch((err) => {
        if (cancelled) return
        // Can't reach the cloud (or no permission): keep working from the device.
        setReady(true)
        setSync({ status: 'error', error: errorMessage(err) })
      })
    return () => {
      cancelled = true
      unsub?.()
      if (currentUid === uid) currentUid = null
    }
  }, [uid, setData])

  // Push whatever differs from what the cloud holds.
  useEffect(() => {
    if (!ready) return
    const current = toEntities(data)
    const writes: { key: string; entity: Entity | null }[] = []
    const fileUploads: string[] = []
    const fileDeletes: string[] = []

    for (const [key, entity] of current) {
      const json = stableStringify(entity.data)
      const prev = synced.current.get(key)
      if (prev === json) continue
      if (entity.kind === 'expense') {
        const before = fileIdOf(prev)
        const after = (entity.data as Expense).fileId
        if (after && after !== before) fileUploads.push(after)
        if (before && before !== after) fileDeletes.push(before)
      }
      synced.current.set(key, json)
      writes.push({ key, entity })
    }
    for (const [key, json] of [...synced.current]) {
      if (current.has(key)) continue
      if (key.startsWith(PREFIX.expense)) {
        const f = fileIdOf(json)
        if (f) fileDeletes.push(f)
      }
      synced.current.delete(key)
      writes.push({ key, entity: null })
    }
    if (writes.length === 0) return

    const commits: Promise<unknown>[] = []
    for (let i = 0; i < writes.length; i += 400) {
      const batch = writeBatch(db)
      for (const w of writes.slice(i, i + 400)) {
        const ref = doc(entityCol(uid), w.key)
        if (w.entity) batch.set(ref, { ...w.entity, updatedAt: Date.now() })
        else batch.delete(ref)
      }
      commits.push(batch.commit())
    }
    for (const f of fileUploads) commits.push(uploadFile(uid, f))
    for (const f of fileDeletes) commits.push(deleteDoc(fileRef(uid, f)))

    pending.current++
    setSync((s) => ({ ...s, status: navigator.onLine ? 'saving' : 'offline' }))
    Promise.all(commits)
      .then(() => {
        pending.current--
        if (pending.current === 0) setSync({ status: 'synced', lastSyncedAt: Date.now() })
      })
      .catch((err) => {
        pending.current--
        setSync({ status: 'error', error: errorMessage(err) })
      })
  }, [data, ready, uid])

  useEffect(() => {
    const update = () =>
      setSync((s) => (s.status === 'error' ? s : { ...s, status: navigator.onLine ? (pending.current ? 'saving' : 'synced') : 'offline' }))
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return { ready, sync }
}
