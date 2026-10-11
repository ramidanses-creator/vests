import type { CatalogItem } from '../types'

// Suggests the next SKU by taking the most recently added item's SKU (items
// are prepended, so items[0] is the latest), splitting off its trailing
// number, and incrementing it — e.g. LS-0003 -> LS-0004 — keeping the same
// prefix and zero-padding width. Falls back to blank when there's nothing to
// base a suggestion on, or the last SKU doesn't end in a number.
export function suggestNextSku(items: CatalogItem[]): string {
  const last = items[0]
  if (!last) return ''
  const match = last.sku.match(/^(.*?)(\d+)$/)
  if (!match) return ''
  const [, prefix, digits] = match
  const next = (Number(digits) + 1).toString().padStart(digits.length, '0')
  return `${prefix}${next}`
}
