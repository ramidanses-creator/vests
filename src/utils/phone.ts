// Israeli numbers are commonly typed/pasted with a +972 or 972 international
// prefix (e.g. +972578889999); locally they're always written starting with a
// leading 0 instead (0578889999). Normalize the international form to local
// so every customer record reads the same way regardless of how it was entered.
export function normalizeIsraeliPhone(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === '') return trimmed
  const compact = trimmed.replace(/[\s-]/g, '')
  const match = compact.match(/^\+?972(\d{8,9})$/)
  if (match) return `0${match[1]}`
  return trimmed
}
