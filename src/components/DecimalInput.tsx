import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  min?: number
  max?: number
}

// A plain controlled numeric input re-derives its displayed text from the
// stored number on every keystroke, which silently drops an in-progress
// trailing "." or "16.3" -> "16" the moment you type the decimal point.
// This keeps its own draft text while focused and only re-syncs from the
// external value once the field is blurred, so partial input survives.
export function DecimalInput({ value, onChange, placeholder, className, min, max }: Props) {
  const [text, setText] = useState(value === 0 ? '' : String(value))
  const focused = useRef(false)

  useEffect(() => {
    if (focused.current) return
    setText(value === 0 ? '' : String(value))
  }, [value])

  function handleChange(raw: string) {
    if (!/^\d*\.?\d*$/.test(raw)) return
    setText(raw)
    if (raw === '' || raw === '.') {
      onChange(0)
      return
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return
    let clamped = parsed
    if (min !== undefined) clamped = Math.max(min, clamped)
    if (max !== undefined) clamped = Math.min(max, clamped)
    onChange(clamped)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
        setText(value === 0 ? '' : String(value))
      }}
      onChange={(e) => handleChange(e.target.value)}
      className={className}
    />
  )
}
