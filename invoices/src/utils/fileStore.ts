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

/**
 * Makes a photographed receipt read like a scan: grayscale with the levels stretched,
 * so faint print becomes dark and the paper becomes white.
 */
export async function enhanceScan(blob: Blob): Promise<Blob> {
  if (!blob.type.startsWith('image/')) return blob
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const px = img.data
    const hist = new Uint32Array(256)
    for (let i = 0; i < px.length; i += 4) {
      const g = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0
      px[i] = g
      hist[g]++
    }
    // Ignore the darkest/lightest 2% when picking the black and white points.
    const total = px.length / 4
    let lo = 0
    let hi = 255
    for (let acc = 0; lo < 255 && (acc += hist[lo]) < total * 0.02; lo++);
    for (let acc = 0; hi > 0 && (acc += hist[hi]) < total * 0.02; hi--);
    const range = Math.max(1, hi - lo)
    for (let i = 0; i < px.length; i += 4) {
      const v = Math.max(0, Math.min(255, ((px[i] - lo) * 255) / range))
      px[i] = px[i + 1] = px[i + 2] = v
    }
    ctx.putImageData(img, 0, 0)
    return (await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8))) ?? blob
  } catch {
    return blob
  }
}
