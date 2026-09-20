import type { Shipment } from '../types'

interface Props {
  shipments: Shipment[]
  onChange: (shipments: Shipment[]) => void
}

export function ShipmentsList({ shipments, onChange }: Props) {
  function updateShipment(id: string, patch: Partial<Shipment>) {
    onChange(shipments.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function addShipment() {
    onChange([...shipments, { id: crypto.randomUUID(), quantity: 0, arrived: false, expectedDate: '' }])
  }

  function removeShipment(id: string) {
    onChange(shipments.filter((s) => s.id !== id))
  }

  const totalQty = shipments.reduce((sum, s) => sum + s.quantity, 0)
  const arrivedQty = shipments.reduce((sum, s) => sum + (s.arrived ? s.quantity : 0), 0)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">משלוחים / הגעה</h3>
        <button
          onClick={addShipment}
          className="rounded-full border border-dashed border-amber-500/40 px-3 py-1 text-xs text-amber-300 hover:bg-amber-500/10"
        >
          + משלוח
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {shipments.map((s, i) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2">
            <span className="w-14 text-xs text-slate-500">חלק {i + 1}</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="כמות"
              value={s.quantity === 0 ? '' : s.quantity}
              onChange={(e) => updateShipment(s.id, { quantity: Number(e.target.value) || 0 })}
              className="w-20 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
            />
            <button
              onClick={() => updateShipment(s.id, { arrived: !s.arrived })}
              className={`whitespace-nowrap rounded border px-2 py-1.5 text-xs ${
                s.arrived
                  ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300'
                  : 'border-amber-800 bg-amber-950/30 text-amber-300'
              }`}
            >
              {s.arrived ? '✓ הגיע' : 'בדרך'}
            </button>
            {!s.arrived && (
              <input
                type="date"
                value={s.expectedDate}
                onChange={(e) => updateShipment(s.id, { expectedDate: e.target.value })}
                className="rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-slate-100"
              />
            )}
            <button
              onClick={() => removeShipment(s.id)}
              className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
            >
              מחק
            </button>
          </div>
        ))}
        {shipments.length === 0 && <p className="text-xs text-slate-500">אין משלוחים עדיין.</p>}
      </div>
      <p className="text-xs text-slate-400">
        הוזמן: <span className="font-semibold text-slate-200">{totalQty}</span> · הגיע:{' '}
        <span className="font-semibold text-emerald-400">{arrivedQty}</span> · ממתין:{' '}
        <span className="font-semibold text-amber-400">{Math.max(0, totalQty - arrivedQty)}</span>
      </p>
    </div>
  )
}
