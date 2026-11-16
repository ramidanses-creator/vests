import { useEffect, useRef, useState } from 'react'
import type { Business, Doc } from '../types'
import { waPhone } from '../utils/format'
import { downloadFile, pdfFileName, renderPdf, shareFile } from '../utils/pdf'
import { PrintableDoc } from './PrintableDoc'
import { Icon } from './ui'

interface Props {
  doc: Doc
  business: Business
  title: string
  relatedTitle?: string
  message: string
}

export function ShareBar({ doc, business, title, relatedTitle, message }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [failed, setFailed] = useState(false)
  const [notice, setNotice] = useState('')
  const docKey = JSON.stringify(doc) + (business.logo?.length ?? 0) + business.name

  // Build the PDF ahead of time: phones only open the share sheet if it's called right on the tap.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      if (!sheetRef.current) return
      renderPdf(sheetRef.current, pdfFileName(title, doc.customer.name))
        .then((f) => !cancelled && setFile(f))
        .catch(() => !cancelled && setFailed(true))
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(timer)
      setFile(null)
      setFailed(false)
    }
  }, [docKey, title, doc.customer.name])

  function flash(text: string) {
    setNotice(text)
    setTimeout(() => setNotice(''), 5000)
  }

  async function sendPdf(fallback?: () => void) {
    if (!file) return
    const result = await shareFile(file, message)
    if (result !== 'unsupported') return
    // Computers can't attach a file to WhatsApp/mail from a web page: save it and open the app.
    downloadFile(file)
    fallback?.()
    flash(fallback ? 'קובץ ה־PDF נשמר במחשב — צרפו אותו להודעה שנפתחה.' : 'קובץ ה־PDF נשמר במכשיר.')
  }

  const ready = !!file
  const wa = `https://wa.me/${doc.customer.phone ? waPhone(doc.customer.phone) : ''}?text=${encodeURIComponent(message)}`
  const mail = `mailto:${doc.customer.email}?subject=${encodeURIComponent(`${title} — ${business.name}`)}&body=${encodeURIComponent(message)}`

  const secondary = [
    { icon: 'chat', label: 'וואטסאפ', onClick: () => sendPdf(() => window.open(wa, '_blank')), needsFile: true },
    { icon: 'mail', label: 'מייל', onClick: () => sendPdf(() => (window.location.href = mail)), needsFile: true },
    { icon: 'download', label: 'הורדת PDF', onClick: () => file && downloadFile(file), needsFile: true },
    { icon: 'print', label: 'הדפסה', onClick: () => window.print(), needsFile: false },
  ]

  return (
    <div className="no-print mx-4 mb-4 space-y-2">
      <button
        onClick={() => sendPdf()}
        disabled={!ready}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-lg font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
      >
        <Icon name="share" />
        {ready ? 'שליחת PDF ללקוח' : failed ? 'לא הצלחתי להכין PDF' : 'מכין PDF…'}
      </button>
      <div className="grid grid-cols-4 gap-2">
        {secondary.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            disabled={a.needsFile && !ready}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-white py-3 text-xs font-medium disabled:opacity-50"
          >
            <Icon name={a.icon} />
            {a.label}
          </button>
        ))}
      </div>
      {notice && <p className="rounded-xl bg-lime p-3 text-sm">{notice}</p>}
      {failed && <p className="rounded-xl bg-peach p-3 text-sm text-orange">אפשר עדיין לשמור PDF דרך "הדפסה" ← "שמירה כ־PDF".</p>}

      {/* Off-screen A4 copy that the PDF is drawn from. */}
      <div aria-hidden="true" className="pointer-events-none fixed top-0 -z-10" style={{ left: -10000 }}>
        <div ref={sheetRef} className="bg-white">
          <PrintableDoc doc={doc} business={business} relatedTitle={relatedTitle} flat />
        </div>
      </div>
    </div>
  )
}
