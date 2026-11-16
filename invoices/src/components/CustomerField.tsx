import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { CustomerDetails } from '../types'
import { Field, Icon, inputCls } from './ui'

interface Props {
  customer: CustomerDetails
  customerId?: string
  onChange: (customer: CustomerDetails, customerId?: string) => void
  allowWalkIn?: boolean
}

export function CustomerField({ customer, customerId, onChange, allowWalkIn }: Props) {
  const { data } = useStore()
  const [focused, setFocused] = useState(false)
  const [details, setDetails] = useState(false)

  const matches = useMemo(() => {
    const q = customer.name.trim()
    const list = q ? data.customers.filter((c) => c.name.includes(q) || c.phone.includes(q) || c.taxId.includes(q)) : data.customers
    return list.slice(0, 6)
  }, [customer.name, data.customers])

  const set = (patch: Partial<CustomerDetails>) => onChange({ ...customer, ...patch }, customerId)

  return (
    <div className="flex flex-col gap-3">
      <Field label="שם הלקוח">
        <div className="relative">
          <input
            value={customer.name}
            onChange={(e) => onChange({ ...customer, name: e.target.value }, undefined)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="חיפוש או הקלדת שם חדש"
            className={inputCls}
            autoComplete="off"
          />
          {customerId && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md bg-lime px-2 py-0.5 text-xs font-medium">לקוח קיים</span>
          )}
          {focused && !customerId && matches.length > 0 && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
              {matches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({ name: c.name, taxId: c.taxId, phone: c.phone, email: c.email, address: c.address }, c.id)
                    setFocused(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-right hover:bg-mist"
                >
                  <Icon name="user" size={18} className="text-ink-soft" />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-sm text-ink-soft" dir="ltr">
                    {c.phone}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Field>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setDetails((v) => !v)} className="text-sm font-medium text-indigo">
          {details ? 'הסתרת פרטי לקוח' : 'פרטי לקוח (ח.פ., טלפון, מייל, כתובת)'}
        </button>
        {allowWalkIn && !customer.name && (
          <button type="button" onClick={() => set({ name: 'לקוח מזדמן' })} className="text-sm font-medium text-ink-soft underline">
            לקוח מזדמן
          </button>
        )}
      </div>

      {details && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="ח.פ. / ע.מ. / ת.ז.">
            <input value={customer.taxId} onChange={(e) => set({ taxId: e.target.value })} inputMode="numeric" dir="ltr" className={`${inputCls} text-right`} />
          </Field>
          <Field label="טלפון">
            <input value={customer.phone} onChange={(e) => set({ phone: e.target.value })} type="tel" dir="ltr" className={`${inputCls} text-right`} />
          </Field>
          <Field label="אימייל" className="col-span-2">
            <input value={customer.email} onChange={(e) => set({ email: e.target.value })} type="email" dir="ltr" className={`${inputCls} text-right`} />
          </Field>
          <Field label="כתובת" className="col-span-2">
            <input value={customer.address} onChange={(e) => set({ address: e.target.value })} className={inputCls} />
          </Field>
        </div>
      )}
    </div>
  )
}
