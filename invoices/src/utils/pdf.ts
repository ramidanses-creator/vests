// Turns the rendered document into a real A4 PDF file (image-based, so Hebrew,
// the logo and the layout come out exactly as on screen). Libraries load on demand.

const A4_W_MM = 210
const A4_H_MM = 297

export async function renderPdf(node: HTMLElement, fileName: string): Promise<File> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')])
  await document.fonts?.ready
  const opts = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: false }
  let canvas: HTMLCanvasElement
  try {
    canvas = await toCanvas(node, opts)
  } catch {
    // Web font couldn't be embedded (e.g. offline) — fall back to the system font.
    canvas = await toCanvas(node, { ...opts, skipFonts: true })
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const pxPerMm = canvas.width / A4_W_MM
  const pageHeightPx = Math.floor(A4_H_MM * pxPerMm)
  const pages = Math.max(1, Math.ceil(canvas.height / pageHeightPx))

  for (let i = 0; i < pages; i++) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - i * pageHeightPx)
    const page = document.createElement('canvas')
    page.width = canvas.width
    page.height = sliceHeight
    const ctx = page.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, page.width, page.height)
    ctx.drawImage(canvas, 0, i * pageHeightPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)
    if (i > 0) pdf.addPage()
    pdf.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_W_MM, sliceHeight / pxPerMm)
  }

  return new File([pdf.output('blob')], fileName, { type: 'application/pdf' })
}

export function pdfFileName(title: string, customerName: string): string {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').trim()
  return `${clean(title)}${customerName ? ` - ${clean(customerName)}` : ''}.pdf`
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Opens the phone's share sheet with the PDF attached. Returns false when the device can't share files. */
export async function shareFile(file: File, text: string): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!navigator.canShare?.({ files: [file] })) return 'unsupported'
  try {
    await navigator.share({ files: [file], title: file.name.replace(/\.pdf$/, ''), text })
    return 'shared'
  } catch (err) {
    return (err as DOMException).name === 'AbortError' ? 'cancelled' : 'unsupported'
  }
}
