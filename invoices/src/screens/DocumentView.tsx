import { PrintableDoc } from '../components/PrintableDoc'
import { DocRow } from '../components/DocRow'
import { Card, Icon, TopBar } from '../components/ui'
import { go, useRoute } from '../router'
import { useStore } from '../store'
import type { DocType } from '../types'
import { DOC_META, computeTotals, docTitle, isOpen } from '../utils/docs'
import { ils, waPhone } from '../utils/format'

export function DocumentView({ id }: { id?: string }) {
  const { data, setDocClosed } = useStore()
  const { query } = useRoute()
  const doc = data.docs.find((d) => d.id === id)

  if (!doc) {
    return (
      <div>
        <TopBar title="מסמך" />
        <p className="p-8 text-center text-ink-soft">המסמך לא נמצא.</p>
      </div>
    )
  }

  const { business } = data
  const t = computeTotals(doc)
  const title = docTitle(doc)
  const related = data.docs.find((d) => d.id === doc.relatedDocId)
  const children = data.docs.filter((d) => d.relatedDocId === doc.id)
  const exempt = business.type === 'exempt'

  const message = `שלום ${doc.customer.name},\nמצורפת ${title} מאת ${business.name} על סך ${ils(t.total)}.\nתודה!`

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: message })
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard?.writeText(message)
      alert('הטקסט הועתק')
    }
  }

  const followUps: { label: string; icon: string; tone: string; to: string }[] = []
  const from = (type: DocType, how = '') => `/new/${type}?from=${doc.id}${how ? `&how=${how}` : ''}`
  if (isOpen(doc)) {
    if (doc.type === 'deal_invoice' && !exempt) followUps.push({ label: 'קיבלתי תשלום — הפקת חשבונית מס/קבלה', icon: 'coins', tone: 'bg-lime', to: from('tax_invoice_receipt') })
    else followUps.push({ label: 'קיבלתי תשלום — הפקת קבלה', icon: 'coins', tone: 'bg-lime', to: from('receipt') })
  }
  if (doc.type === 'quote') {
    if (exempt) followUps.push({ label: 'המרה לחשבון עסקה', icon: 'receipt', tone: 'bg-sky', to: from('deal_invoice') })
    else {
      followUps.push({ label: 'המרה לחשבונית מס', icon: 'receipt', tone: 'bg-sky', to: from('tax_invoice') })
      followUps.push({ label: 'המרה לחשבונית מס/קבלה', icon: 'receipt', tone: 'bg-lavender', to: from('tax_invoice_receipt') })
    }
  }
  if ((doc.type === 'tax_invoice' || doc.type === 'tax_invoice_receipt') && !exempt)
    followUps.push({ label: 'הפקת חשבונית זיכוי', icon: 'arrow-forward', tone: 'bg-peach', to: from('credit_invoice') })
  followUps.push({ label: 'שכפול למסמך חדש', icon: 'copy', tone: 'bg-mist', to: from(doc.type, 'duplicate') })

  return (
    <div className="print-wrap min-h-dvh pb-16">
      <TopBar title={title} onBack={() => go('/docs')} />

      {query.get('fresh') === '1' && (
        <div className="no-print animate-pop mx-4 mb-3 flex items-center gap-3 rounded-2xl bg-lime p-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-lime">
            <Icon name="check" />
          </span>
          <div>
            <p className="font-bold">{DOC_META[doc.type].label} הופקה בהצלחה</p>
            <p className="text-sm">מספר {doc.number} · {ils(t.total)}</p>
          </div>
        </div>
      )}

      <div className="no-print mx-4 mb-4 grid grid-cols-4 gap-2">
        {[
          { icon: 'print', label: 'הדפסה / PDF', onClick: () => window.print(), tone: 'bg-white' },
          {
            icon: 'chat',
            label: 'וואטסאפ',
            onClick: () => window.open(`https://wa.me/${doc.customer.phone ? waPhone(doc.customer.phone) : ''}?text=${encodeURIComponent(message)}`, '_blank'),
            tone: 'bg-white',
          },
          {
            icon: 'mail',
            label: 'מייל',
            onClick: () => (window.location.href = `mailto:${doc.customer.email}?subject=${encodeURIComponent(`${title} — ${business.name}`)}&body=${encodeURIComponent(message)}`),
            tone: 'bg-white',
          },
          { icon: 'share', label: 'שיתוף', onClick: share, tone: 'bg-white' },
        ].map((a) => (
          <button key={a.label} onClick={a.onClick} className={`flex flex-col items-center gap-1.5 rounded-2xl ${a.tone} py-3 text-xs font-medium`}>
            <Icon name={a.icon} />
            {a.label}
          </button>
        ))}
      </div>

      <div className="px-3 sm:px-4">
        <PrintableDoc doc={doc} business={business} relatedTitle={related ? docTitle(related) : undefined} />
      </div>

      <div className="no-print mx-4 mt-4 space-y-3">
        {DOC_META[doc.type].awaitsPayment && doc.status === 'issued' && (
          <Card className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{doc.closed ? 'שולם / סגור' : 'ממתין לתשלום'}</p>
              <p className="text-sm text-ink-soft">{doc.closed ? 'המסמך לא נספר בחיובים הפתוחים' : 'נספר בחיובים הפתוחים בדף הבית'}</p>
            </div>
            <button onClick={() => setDocClosed(doc.id, !doc.closed)} className="rounded-xl bg-mist px-3 py-2 text-sm font-medium">
              {doc.closed ? 'פתיחה מחדש' : 'סימון כשולם'}
            </button>
          </Card>
        )}

        <Card className="!p-3">
          {followUps.map((f) => (
            <button key={f.label} onClick={() => go(f.to)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-right hover:bg-mist">
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${f.tone}`}>
                <Icon name={f.icon} />
              </span>
              <span className="flex-1 font-medium">{f.label}</span>
              <Icon name="arrow-forward" size={18} className="text-ink-soft" />
            </button>
          ))}
        </Card>

        {(related || children.length > 0) && (
          <Card>
            <h2 className="mb-1 font-bold">מסמכים מקושרים</h2>
            {related && <DocRow doc={related} />}
            {children.map((c) => (
              <DocRow key={c.id} doc={c} />
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
