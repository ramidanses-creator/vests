import { describe, expect, it } from 'vitest'
import { normalizeIsraeliPhone } from './phone'

describe('normalizeIsraeliPhone', () => {
  it('converts a +972 international number to local 0-prefixed form', () => {
    expect(normalizeIsraeliPhone('+972578889999')).toBe('0578889999')
  })

  it('converts a 972-prefixed number without the plus sign', () => {
    expect(normalizeIsraeliPhone('972578889999')).toBe('0578889999')
  })

  it('strips spaces and dashes before matching the prefix', () => {
    expect(normalizeIsraeliPhone('+972 57-888-9999')).toBe('0578889999')
  })

  it('leaves an already-local number unchanged', () => {
    expect(normalizeIsraeliPhone('0578889999')).toBe('0578889999')
  })

  it('leaves a non-Israeli number unchanged', () => {
    expect(normalizeIsraeliPhone('+1 415 555 0100')).toBe('+1 415 555 0100')
  })

  it('leaves an empty string unchanged', () => {
    expect(normalizeIsraeliPhone('')).toBe('')
  })

  it('handles a landline-length local number too', () => {
    expect(normalizeIsraeliPhone('+97231234567')).toBe('031234567')
  })
})
