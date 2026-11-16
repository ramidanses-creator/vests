export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function fmt(n: number): string {
  const hasFraction = Math.abs(round2(n) % 1) > 0
  return round2(n).toLocaleString('he-IL', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })
}

export const ils = (n: number) => `${fmt(n)} ₪`

export function todayISO(): string {
  const d = new Date()
  return localISO(d)
}

export function localISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fmtDate(iso: string | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

/** "2026-11" → "נובמבר 2026" */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${HEBREW_MONTHS[m - 1]} ${y}`
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return localISO(d).slice(0, 7)
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'בוקר טוב'
  if (h >= 12 && h < 17) return 'צהריים טובים'
  if (h >= 17 && h < 22) return 'ערב טוב'
  return 'לילה טוב'
}

/** Israeli phone → international digits for wa.me (e.g. 050-1234567 → 972501234567). */
export function waPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = '972' + digits.slice(1)
  return digits
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((p) => p[0]).join('')
}
