// Rough count of how much cloud space an account takes, and which images take it.
import { fetchCloudFile } from '../cloud'
import type { AppData } from '../types'
import { DOC_META } from './docs'
import { getFile } from './fileStore'
import { fmtDate } from './format'

export interface UsageImage {
  label: string
  kind: 'receipt' | 'item' | 'line' | 'logo'
  bytes: number
}

export interface Usage {
  total: number
  dataBytes: number
  images: UsageImage[]
  /** Receipt files that couldn't be measured (e.g. offline and not on this device). */
  unknown: number
}

const utf8 = (s: string) => new Blob([s]).size
/** Receipt files are stored in the cloud as base64 text, a third larger than the file. */
const base64Size = (bytes: number) => Math.ceil(bytes / 3) * 4

export async function computeUsage(data: AppData): Promise<Usage> {
  const images: UsageImage[] = []
  if (data.business.logo) images.push({ label: 'לוגו העסק', kind: 'logo', bytes: data.business.logo.length })
  for (const it of data.items) if (it.image) images.push({ label: `פריט: ${it.name}`, kind: 'item', bytes: it.image.length })
  for (const d of data.docs)
    for (const line of d.items)
      if (line.image)
        images.push({ label: `${DOC_META[d.type].label}${d.number ? ` ${d.number}` : ' (טיוטה)'} · ${line.description || 'שורה'}`, kind: 'line', bytes: line.image.length })

  let unknown = 0
  for (const e of data.expenses) {
    if (!e.fileId) continue
    const blob = (await getFile(e.fileId).catch(() => undefined)) ?? (await fetchCloudFile(e.fileId).catch(() => undefined))
    if (!blob) {
      unknown++
      continue
    }
    images.push({ label: `קבלה: ${e.supplier || e.category} · ${fmtDate(e.date)}`, kind: 'receipt', bytes: base64Size(blob.size) })
  }

  // Everything else (documents, customers, settings…) without the embedded images.
  const dataBytes = utf8(JSON.stringify(data, (k, v) => (k === 'image' || k === 'logo' ? undefined : v)))
  images.sort((a, b) => b.bytes - a.bytes)
  return { total: dataBytes + images.reduce((s, i) => s + i.bytes, 0), dataBytes, images, unknown }
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
