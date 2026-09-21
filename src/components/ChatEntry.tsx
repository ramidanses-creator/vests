import { useEffect, useRef, useState } from 'react'
import { createDefaultProduct } from '../defaultProduct'
import type { Currency, Product } from '../types'

interface Props {
  onCreate: (product: Product) => void
  onClose: () => void
  usdRateOverride: number | null
}

interface Message {
  from: 'bot' | 'user'
  text: string
}

interface Answers {
  name: string
  category: string
  quantityImported: number
  purchasePricePerUnit: number
  purchaseCurrency: Currency
  shippingAmount: number
  shippingCurrency: Currency
  customsAmount: number
  customsCurrency: Currency
  targetProfitPercent: number
}

type StepId = keyof Answers

const STEPS: { id: StepId; question: string; optional?: boolean }[] = [
  { id: 'name', question: 'מה שם המוצר?' },
  { id: 'category', question: 'לאיזו קטגוריה הוא שייך? (אפשר לדלג — שלחו "דלג")', optional: true },
  { id: 'quantityImported', question: 'כמה יחידות יובאו?' },
  { id: 'purchasePricePerUnit', question: 'כמה עלתה כל יחידה ברכישה? (למשל: 8$ או 30)' },
  { id: 'shippingAmount', question: 'כמה עלה המשלוח בסה״כ? (למשל: 500 או 0 אם אין)', optional: true },
  { id: 'customsAmount', question: 'כמה עלה המכס בסה״כ? (למשל: 300 או 0 אם אין)', optional: true },
  { id: 'targetProfitPercent', question: 'איזה אחוז רווח תרצו על העלות? (ברירת מחדל: 20)', optional: true },
]

function parseAmount(text: string): { amount: number; currency: Currency } {
  const currency: Currency = text.includes('$') ? 'USD' : 'ILS'
  const match = text.replace(',', '.').match(/[\d.]+/)
  const amount = match ? Number(match[0]) : 0
  return { amount, currency }
}

export function ChatEntry({ onCreate, onClose, usdRateOverride }: Props) {
  const [messages, setMessages] = useState<Message[]>([{ from: 'bot', text: STEPS[0].question }])
  const [stepIndex, setStepIndex] = useState(0)
  const [input, setInput] = useState('')
  const [done, setDone] = useState(false)
  const answersRef = useRef<Partial<Answers>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function finish() {
    const a = answersRef.current
    const product: Product = {
      ...createDefaultProduct(usdRateOverride),
      name: a.name ?? '',
      category: a.category ?? '',
      purchasePricePerUnit: a.purchasePricePerUnit ?? 0,
      purchaseCurrency: a.purchaseCurrency ?? 'USD',
      targetProfitPercent: a.targetProfitPercent ?? 20,
    }
    product.shipments = [
      { id: crypto.randomUUID(), quantity: a.quantityImported ?? 0, arrived: true, expectedDate: '' },
    ]
    if ((a.shippingAmount ?? 0) > 0) {
      product.expenses.push({
        id: crypto.randomUUID(),
        label: 'משלוח',
        amount: a.shippingAmount ?? 0,
        currency: a.shippingCurrency ?? 'ILS',
      })
    }
    if ((a.customsAmount ?? 0) > 0) {
      product.expenses.push({
        id: crypto.randomUUID(),
        label: 'מכס',
        amount: a.customsAmount ?? 0,
        currency: a.customsCurrency ?? 'ILS',
      })
    }
    onCreate(product)
    setMessages((prev) => [...prev, { from: 'bot', text: `נוצר מוצר "${product.name || 'ללא שם'}" — אפשר לערוך אותו בכרטיס למטה.` }])
    setDone(true)
  }

  function handleSend() {
    const text = input.trim()
    if (!text) return
    const step = STEPS[stepIndex]
    setMessages((prev) => [...prev, { from: 'user', text }])
    setInput('')

    const skip = step.optional && (text === 'דלג' || text === '0')

    if (!skip) {
      switch (step.id) {
        case 'name':
          answersRef.current.name = text
          break
        case 'category':
          answersRef.current.category = text
          break
        case 'quantityImported':
          answersRef.current.quantityImported = Number(text.match(/[\d.]+/)?.[0] ?? 0)
          break
        case 'purchasePricePerUnit': {
          const { amount, currency } = parseAmount(text)
          answersRef.current.purchasePricePerUnit = amount
          answersRef.current.purchaseCurrency = currency
          break
        }
        case 'shippingAmount': {
          const { amount, currency } = parseAmount(text)
          answersRef.current.shippingAmount = amount
          answersRef.current.shippingCurrency = currency
          break
        }
        case 'customsAmount': {
          const { amount, currency } = parseAmount(text)
          answersRef.current.customsAmount = amount
          answersRef.current.customsCurrency = currency
          break
        }
        case 'targetProfitPercent':
          answersRef.current.targetProfitPercent = Number(text.match(/[\d.]+/)?.[0] ?? 20)
          break
      }
    }

    const nextIndex = stepIndex + 1
    if (nextIndex >= STEPS.length) {
      setStepIndex(nextIndex)
      setTimeout(finish, 200)
    } else {
      setMessages((prev) => [...prev, { from: 'bot', text: STEPS[nextIndex].question }])
      setStepIndex(nextIndex)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1b20]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">הוספת מוצר בצ׳אט</h2>
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">
          סגור
        </button>
      </div>

      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.from === 'bot' ? 'self-start bg-white/10 text-slate-200' : 'self-end bg-teal-500 text-slate-950'
            }`}
          >
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!done && (
        <div className="flex items-center gap-2 border-t border-white/10 p-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="הקלידו תשובה..."
            className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleSend}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-teal-400"
          >
            שלח
          </button>
        </div>
      )}
    </div>
  )
}
