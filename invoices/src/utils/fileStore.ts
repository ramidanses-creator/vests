// Expense files (photos, PDFs) live in IndexedDB — localStorage is too small for them.
import { useEffect, useState } from 'react'
import { fetchCloudFile } from '../cloud'

const DB_NAME = 'pinkas-files'
const STORE = 'files'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const putFile = (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id))
export const getFile = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id))
export const deleteFile = (id: string) => tx('readwrite', (s) => s.delete(id))

/** Shrinks photos so a year of receipts doesn't fill the device. PDFs pass through. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.75): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality))
    return blob ?? file
  } catch {
    return file
  }
}

export function useFileUrl(id: string | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!id) return
    let objectUrl: string | undefined
    let cancelled = false
    getFile(id)
      .then((blob) => blob ?? fetchCloudFile(id))
      .then((blob) => {
        if (cancelled || !blob) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(undefined)
    }
  }, [id])
  return url
}

export function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}
