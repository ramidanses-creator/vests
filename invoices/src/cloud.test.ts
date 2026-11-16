import { describe, expect, it, vi } from 'vitest'

vi.mock('./firebase', () => ({ db: {}, auth: {} }))

const { applyEntity, mergeInitial, stableStringify, toEntities } = await import('./cloud')
import type { AppData } from './types'

const base: AppData = {
  business: { name: 'עסק', ownerName: '', type: 'licensed', taxId: '1', address: '', phone: '', email: '', vatRate: 18, allocationThreshold: 5000, accountantEmail: '', footerNote: '', startNumbers: {} },
  customers: [{ id: 'a', name: 'א', taxId: '', phone: '', email: '', address: '', createdAt: '' }],
  docs: [],
  expenses: [],
}

describe('stableStringify', () => {
  it('ignores key order and undefined fields', () => {
    expect(stableStringify({ b: 1, a: { d: undefined, c: [1, 2] } })).toBe(stableStringify({ a: { c: [1, 2] }, b: 1 }))
  })
})

describe('sync helpers', () => {
  it('keys every entity by kind', () => {
    expect([...toEntities(base).keys()]).toEqual(['business', 'c_a'])
  })

  it('keeps local-only items and lets the cloud win on shared ones', () => {
    const remote = new Map([
      ['c_a', { kind: 'customer' as const, data: { ...base.customers[0], name: 'מהענן' } }],
      ['c_b', { kind: 'customer' as const, data: { ...base.customers[0], id: 'b', name: 'ב' } }],
    ])
    const local = { ...base, customers: [...base.customers, { ...base.customers[0], id: 'z', name: 'מקומי' }] }
    const merged = mergeInitial(local, remote)
    expect(merged.customers.map((c) => c.name).sort()).toEqual(['ב', 'מהענן', 'מקומי'].sort())
  })

  it('removes an entity deleted on another device', () => {
    expect(applyEntity(base, 'c_a', null).customers).toEqual([])
  })

  it('does not replace a filled business with an empty one', () => {
    const remote = new Map([['business', { kind: 'business' as const, data: { ...base.business, name: '' } }]])
    expect(mergeInitial(base, remote).business.name).toBe('עסק')
  })
})
