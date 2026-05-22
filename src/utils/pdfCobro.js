import { jsPDF } from 'jspdf'
import logoSvgRaw from '../assets/logo-f3d-blanco.svg?raw'

// ── Pre-render SVG logo ────────────────────────────────────────────────────────
const LOGO_W_MM = 65
const LOGO_H_MM = 15.7

async function svgToPng(svgRaw, canvasW, canvasH) {
  return new Promise((resolve) => {
    const blob = new Blob([svgRaw], { type: 'image/svg+xml;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const img  = new window.Image()
    img.onload = () => {
      const canvas  = document.createElement('canvas')
      canvas.width  = canvasW * 2
      canvas.height = canvasH * 2
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

const _logoReady = svgToPng(logoSvgRaw, 520, 126)

// ── Íconos footer (idénticos a pdfCotizacion) ─────────────────────────────────
const _WA_SVG    = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M.057 24l1.687-6.163C.598 16.33.057 14.306.057 12.003.057 5.448 5.396.108 11.954.108c3.18 0 6.163 1.24 8.41 3.489a11.825 11.825 0 013.485 8.413c-.003 6.557-5.341 11.896-11.896 11.896a11.9 11.9 0 01-5.688-1.449L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.867-2.031-.967-.272-.099-.471-.148-.669.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.447-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`
const _EMAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>`
const _IG_SVG    = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`
const _GLOBE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`

const ICON_MM     = 5
const _waReady    = svgToPng(_WA_SVG,    80, 80)
const _emailReady = svgToPng(_EMAIL_SVG, 80, 80)
const _igReady    = svgToPng(_IG_SVG,    80, 80)
const _globeReady = svgToPng(_GLOBE_SVG, 80, 80)

// ── Helpers ───────────────────────────────────────────────────────────────────
const cop     = (v) => `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(v) || 0)}`
const copFull = (v) => `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(v) || 0)} COP`

const fechaMedia = (d) => {
  if (!d) return '—'
  try {
    const s = d.includes('T') ? d : d + 'T00:00:00'
    return new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())
  } catch { return d }
}

// ── Paleta (idéntica a pdfCotizacion) ────────────────────────────────────────
const NAVY   = [20,  34,  54]
const DARK   = [20,  34,  54]
const MID    = [100, 116, 139]
const LIGHT  = [248, 250, 252]
const BORDER = [226, 232, 240]
const WHITE  = [255, 255, 255]
const TGRAY  = [150, 168, 192]
const LMID   = [156, 163, 175]
const LNAV   = [237, 240, 245]
const MNAV   = [205, 213, 225]

const ESTADO_LABEL = { pendiente: 'PENDIENTE', pagado: 'PAGADO', vencido: 'VENCIDO' }
const ESTADO_COLOR = {
  pendiente: [251, 191,  36],
  pagado:    [ 34, 197,  94],
  vencido:   [239,  68,  68],
}
const METODO_LABEL = {
  transferencia: 'Transferencia bancaria',
  efectivo:      'Efectivo',
  nequi:         'Nequi',
  daviplata:     'Daviplata',
  otro:          'Otro',
}

// ── Section title ─────────────────────────────────────────────────────────────
function secTitle(doc, text, x, y, rightEdge) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...MID)
  doc.text(text, x, y)
  const tw = doc.getTextWidth(text) + 4
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(x + tw, y - 1.5, rightEdge, y - 1.5)
}

// ── Builder ───────────────────────────────────────────────────────────────────
async function buildDoc(cobro) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W   = 210
  const ML  = 14
  const MR  = 14
  const CW  = W - ML - MR
  const RE  = W - MR
  let y     = 0

  const num = String(cobro.numero).padStart(4, '0')
  const año = cobro.fecha_emision
    ? new Date(cobro.fecha_emision + 'T00:00:00').getFullYear()
    : new Date().getFullYear()

  const [logoDataUrl, waIcon, emailIcon, igIcon, globeIcon] = await Promise.all([
    _logoReady, _waReady, _emailReady, _igReady, _globeReady,
  ])

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 50, 'F')

  if (logoDataUrl) {
    const ly = (50 - LOGO_H_MM) / 2
    doc.addImage(logoDataUrl, 'PNG', ML, ly, LOGO_W_MM, LOGO_H_MM)
  }

  doc.setDrawColor(45, 65, 95)
  doc.setLineWidth(0.4)
  doc.line(ML + LOGO_W_MM + 12, 10, ML + LOGO_W_MM + 12, 40)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...TGRAY)
  doc.text('COBRO', RE, 17, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.setTextColor(...WHITE)
  doc.text(`#${num}`, RE, 31, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...TGRAY)
  doc.text(String(año), RE, 41, { align: 'right' })

  y = 50

  // ── META BAR ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT)
  doc.rect(0, y, W, 24, 'F')
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(0, y + 24, W, y + 24)

  // Columna 1: Fecha emisión
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MID)
  doc.text('FECHA DE EMISIÓN', ML, y + 8.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.text(fechaMedia(cobro.fecha_emision), ML, y + 18.5)

  // Columna 2: Vencimiento
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MID)
  doc.text('VENCIMIENTO', ML + 61, y + 8.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.text(cobro.fecha_vencimiento ? fechaMedia(cobro.fecha_vencimiento) : '—', ML + 61, y + 18.5)

  // Columna 3: Estado badge
  const estadoX = ML + 122
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MID)
  doc.text('ESTADO', estadoX, y + 8.5)

  const estadoBg = ESTADO_COLOR[cobro.estado] || [150, 168, 192]
  doc.setFillColor(...estadoBg)
  doc.roundedRect(estadoX, y + 11, 30, 8, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  doc.text(ESTADO_LABEL[cobro.estado] || cobro.estado.toUpperCase(), estadoX + 15, y + 16.5, { align: 'center' })

  y += 32

  // ── CLIENTE ───────────────────────────────────────────────────────────────────
  secTitle(doc, 'CLIENTE', ML, y, RE)
  y += 5

  doc.setFillColor(...LIGHT)
  doc.rect(ML, y, CW, 13, 'F')
  doc.setFillColor(...NAVY)
  doc.rect(ML, y, 3, 13, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...DARK)
  doc.text(cobro.cliente_nombre || 'Cliente', ML + 7, y + 8.5)

  y += 13 + 9

  // ── CONCEPTO + MONTO ─────────────────────────────────────────────────────────
  secTitle(doc, 'DETALLE', ML, y, RE)
  y += 5

  const conceptoLines = doc.splitTextToSize(cobro.concepto || '—', CW - 75)
  const detH = Math.max(28, 14 + conceptoLines.length * 6)

  doc.setFillColor(...LIGHT)
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(ML, y, CW, detH, 2, 2, 'FD')
  doc.setFillColor(...NAVY)
  doc.rect(ML, y, 3, detH, 'F')

  // Concepto (izquierda)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MID)
  doc.text('CONCEPTO', ML + 7, y + 8)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...DARK)
  doc.text(conceptoLines, ML + 7, y + 15)

  // Monto (derecha, prominente)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MID)
  doc.text('MONTO', RE - 2, y + 8, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...NAVY)
  doc.text(copFull(cobro.monto), RE - 2, y + 22, { align: 'right' })

  y += detH + 9

  // ── DATOS DE PAGO (si no está pagado) ────────────────────────────────────────
  if (cobro.estado !== 'pagado') {
    if (y + 26 > 254) { doc.addPage(); y = 18 }
    secTitle(doc, 'DATOS DE PAGO', ML, y, RE)
    y += 5

    doc.setFillColor(...LNAV)
    doc.setDrawColor(...MNAV)
    doc.setLineWidth(0.5)
    doc.roundedRect(ML, y, CW, 20, 2, 2, 'FD')
    doc.setFillColor(...NAVY)
    doc.rect(ML, y, 3, 20, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MID)
    doc.text('Envía el pago a:', ML + 7, y + 7)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text('Llave Bre-B  ·  3215735651', ML + 7, y + 13.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MID)
    doc.text('Titular: Dimas Domenech', ML + 7, y + 19)

    // Total derecha
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MID)
    doc.text('Total a pagar:', RE - 2, y + 9, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...NAVY)
    doc.text(cop(cobro.monto), RE - 2, y + 17, { align: 'right' })

    y += 20 + 9
  }

  // ── MÉTODO DE PAGO (si pagado) ────────────────────────────────────────────────
  if (cobro.estado === 'pagado' && cobro.metodo_pago) {
    if (y + 20 > 254) { doc.addPage(); y = 18 }
    secTitle(doc, 'MÉTODO DE PAGO', ML, y, RE)
    y += 5

    doc.setFillColor(240, 253, 244)   // green-50
    doc.setDrawColor(187, 247, 208)   // green-200
    doc.setLineWidth(0.3)
    doc.roundedRect(ML, y, CW, 12, 2, 2, 'FD')
    doc.setFillColor(34, 197, 94)
    doc.rect(ML, y, 3, 12, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(22, 101, 52)   // green-800
    doc.text(METODO_LABEL[cobro.metodo_pago] || cobro.metodo_pago, ML + 7, y + 8)

    y += 12 + 9
  }

  // ── NOTAS ─────────────────────────────────────────────────────────────────────
  if (cobro.notas) {
    if (y + 20 > 254) { doc.addPage(); y = 18 }
    secTitle(doc, 'NOTAS', ML, y, RE)
    y += 5

    const notasLines = doc.splitTextToSize(cobro.notas, CW - 10)
    const notasH     = 7 + notasLines.length * 5.5

    doc.setFillColor(...LIGHT)
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.3)
    doc.roundedRect(ML, y, CW, notasH, 2, 2, 'FD')
    doc.setFillColor(...NAVY)
    doc.rect(ML, y, 3, notasH, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MID)
    doc.text(notasLines, ML + 7, y + 6)
  }

  // ── FOOTER (idéntico a pdfCotizacion) ────────────────────────────────────────
  const footY = 274
  doc.setFillColor(...NAVY)
  doc.rect(0, footY, W, 23, 'F')
  doc.setDrawColor(45, 65, 95)
  doc.setLineWidth(0.4)
  doc.line(0, footY, W, footY)

  const iconY   = footY + 9
  const textY   = iconY + 3.8
  const iconGap = 2

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...LMID)

  const footItems = [
    { icon: waIcon,    text: '+57 310 6531257'        },
    { icon: emailIcon, text: 'fabrica3d.co@gmail.com' },
    { icon: igIcon,    text: '@fabrica3d.co'           },
    { icon: globeIcon, text: 'lafabrica3d.co'          },
  ]

  const itemWidths = footItems.map(it => ICON_MM + iconGap + doc.getTextWidth(it.text))
  const totalW     = itemWidths.reduce((s, w) => s + w, 0)
  const gap        = (W - totalW) / (footItems.length + 1)
  let   curX       = gap

  footItems.forEach((it, i) => {
    if (it.icon) doc.addImage(it.icon, 'PNG', curX, iconY, ICON_MM, ICON_MM)
    doc.text(it.text, curX + ICON_MM + iconGap, textY)
    curX += itemWidths[i] + gap
  })

  return doc
}

// ── Exports ───────────────────────────────────────────────────────────────────
export async function generarPdfCobro(cobro) {
  const doc = await buildDoc(cobro)
  doc.save(`Cobro-${String(cobro.numero).padStart(4, '0')}-${cobro.cliente_nombre || 'cliente'}.pdf`)
}

export async function previewUrlCobro(cobro) {
  const doc = await buildDoc(cobro)
  return doc.output('bloburl')
}

export async function blobCobro(cobro) {
  const doc = await buildDoc(cobro)
  return doc.output('blob')
}
