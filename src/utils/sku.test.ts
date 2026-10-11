import { describe, expect, it } from 'vitest'
import type { CatalogItem } from '../types'
import { suggestNextSku } from './sku'

function makeItem(sku: string): CatalogItem {
  return { id: crypto.randomUUID(), sku, name: '', pricePerUnit: 0, currency: 'ILS', updatedAt: new Date().toISOString() }
}

describe('suggestNextSku', () => {
  it('increments a zero-padded numeric suffix, keeping the same width', () => {
    expect(suggestNextSku([makeItem('LS-0003')])).toBe('LS-0004')
  })

  it('rolls over the padding width when incrementing crosses a power of ten', () => {
    expect(suggestNextSku([makeItem('LS-0099')])).toBe('LS-0100')
  })

  it('works with a plain numeric suffix with no separator', () => {
    expect(suggestNextSku([makeItem('ABC4')])).toBe('ABC5')
  })

  it('bases the suggestion on the most recently added item (index 0)', () => {
    expect(suggestNextSku([makeItem('LS-0010'), makeItem('LS-0003')])).toBe('LS-0011')
  })

  it('returns an empty string when the catalog is empty', () => {
    expect(suggestNextSku([])).toBe('')
  })

  it('returns an empty string when the last SKU has no trailing number', () => {
    expect(suggestNextSku([makeItem('WST-BLK')])).toBe('')
  })
})
