import { jsPDF } from 'jspdf'

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

// ── Colors ────────────────────────────────────────────────────────────────────
const DARK     = [13,  15,  20]    // #0d0f14  — header / footer / table header / total box
const ACCENT   = [59,  130, 246]   // #3b82f6  — blue (tag, logo, accent bar, links)
const LIGHT    = [240, 244, 255]   // #f0f4ff  — meta bar, client box, payment box
const WHITE    = [255, 255, 255]
const GRAY     = [107, 114, 128]   // #6b7280  — labels, sub-text
const DGRAY    = [156, 163, 175]   // #9ca3af  — doc number
const LGRAY    = [229, 231, 235]   // #e5e7eb  — divider lines
const FDGRAY   = [209, 213, 219]   // #d1d5db  — footer bold labels
const AMBER_BG = [255, 251, 235]   // #fffbeb
const AMBER_BD = [253, 230, 138]   // #fde68a
const AMBER_TX = [146, 64,  14]    // #92400e

const DEFAULT_CONDITIONS = [
  'Anticipo del 50% para iniciar producción.',
  'Saldo al momento de la entrega.',
  'El cliente debe enviar el logo en formato vectorial (AI, SVG, PDF) o PNG de alta resolución.',
  'Cotización válida por 7 días calendario.',
  'Precios sujetos a ajuste según diseño final.',
]

// ── Section title with trailing line ─────────────────────────────────────────
function secTitle(doc, text, x, y, rightEdge) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text(text, x, y)
  const tw = doc.getTextWidth(text) + 5
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.35)
  doc.line(x + tw, y - 1.5, rightEdge, y - 1.5)
}

// ── Main builder ──────────────────────────────────────────────────────────────
function buildDoc(cotizacion, cliente) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W   = 210
  const ML  = 14
  const MR  = 14
  const CW  = W - ML - MR   // 182 mm
  const RE  = W - MR        // right edge = 196 mm
  let y     = 0

  const lineas    = cotizacion.lineas || []
  const subtotal  = lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0)
  const descuento = Number(cotizacion.descuento || 0)
  const total     = subtotal - descuento
  const num       = String(cotizacion.numero).padStart(3, '0')
  const año       = new Date(cotizacion.created_at).getFullYear()

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 46, 'F')

  // F3D icon
  doc.setFillColor(...ACCENT)
  doc.roundedRect(ML, 11, 21, 21, 2.5, 2.5, 'F')
  doc.setFont('courier', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...WHITE)
  doc.text('F3D', ML + 10.5, 24, { align: 'center' })

  // Company name (Space Mono → courier)
  doc.setFont('courier', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...WHITE)
  doc.text('Fabrica3D', ML + 25, 22.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...GRAY)
  doc.text('IMPRESIÓN 3D FUNCIONAL', ML + 25, 28)

  // COTIZACIÓN tag (top-right)
  const tagW = 28
  const tagX = RE - tagW
  doc.setFillColor(...ACCENT)
  doc.roundedRect(tagX, 11, tagW, 8, 1.5, 1.5, 'F')
  doc.setFont('courier', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...WHITE)
  doc.text('COTIZACIÓN', tagX + tagW / 2, 16.2, { align: 'center' })

  // Doc number
  doc.setFont('courier', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...DGRAY)
  doc.text(`#COT-${num}  ·  ${año}`, RE, 25.5, { align: 'right' })

  y = 46

  // ── META BAR ────────────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT)
  doc.rect(0, y, W, 22, 'F')
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.line(0, y + 22, W, y + 22)

  const metaCols = [
    { label: 'FECHA',             value: fechaMedia(cotizacion.fecha_emision || cotizacion.created_at) },
    { label: 'VÁLIDA HASTA',      value: cotizacion.valida_hasta ? fechaMedia(cotizacion.valida_hasta) : '—' },
    { label: 'TIEMPO DE ENTREGA', value: cotizacion.tiempo_entrega || '—' },
  ]
  metaCols.forEach((col, i) => {
    const x = ML + i * 61
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY)
    doc.text(col.label, x, y + 8)
    doc.setFont('courier', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...DARK)
    doc.text(col.value, x, y + 16.5)
  })

  y += 28   // 46 + 22 meta + 6 gap = 74

  // ── CLIENTE ──────────────────────────────────────────────────────────────────
  secTitle(doc, 'CLIENTE', ML, y, RE)
  y += 5

  const hasClientDetail = cliente && (cliente.contacto || cliente.email || cliente.whatsapp)
  const clientH = hasClientDetail ? 18 : 13

  doc.setFillColor(...LIGHT)
  doc.rect(ML, y, CW, clientH, 'F')
  doc.setFillColor(...ACCENT)
  doc.rect(ML, y, 3, clientH, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...DARK)
  doc.text(cotizacion.cliente_nombre || 'Cliente', ML + 7, y + 8.5)

  if (hasClientDetail) {
    const parts = []
    if (cliente.contacto) parts.push(`Contacto: ${cliente.contacto}`)
    if (cliente.email)    parts.push(cliente.email)
    if (cliente.whatsapp) parts.push(cliente.whatsapp)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(parts.join('  ·  '), ML + 7, y + 14.5)
  }

  y += clientH + 10

  // ── PRODUCTOS TABLE ──────────────────────────────────────────────────────────
  secTitle(doc, 'DETALLE DEL PEDIDO', ML, y, RE)
  y += 5

  // Column x positions
  const CANT_CX = 118   // qty column center
  const UNIT_RX = 152   // unit price right edge
  const ROW_H   = 9     // base row height

  // Header
  doc.setFillColor(...DARK)
  doc.rect(ML, y, CW, 9, 'F')
  doc.setFont('courier', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...WHITE)
  doc.text('PRODUCTO', ML + 2,    y + 6)
  doc.text('CANT.',    CANT_CX,   y + 6, { align: 'center' })
  doc.text('P. UNIT.', UNIT_RX,   y + 6, { align: 'right' })
  doc.text('TOTAL',    RE - 2,    y + 6, { align: 'right' })
  y += 9

  lineas.forEach((l) => {
    const subT      = Number(l.cantidad || 0) * Number(l.precio_unitario || 0)
    const hasDetalle = l.detalle && l.detalle.trim()
    const thisH     = hasDetalle ? ROW_H + 5 : ROW_H

    if (y + thisH > 205) { doc.addPage(); y = 18 }

    doc.setDrawColor(...LGRAY)
    doc.setLineWidth(0.2)
    doc.line(ML, y + thisH, RE, y + thisH)

    // Product name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(l.descripcion || '—', ML + 2, y + 6)

    // Optional sub-description
    if (hasDetalle) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...GRAY)
      doc.text(l.detalle, ML + 2, y + 11)
    }

    // Qty + prices (monospace)
    doc.setFont('courier', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(80, 100, 130)
    doc.text(String(l.cantidad || 1), CANT_CX, y + 6, { align: 'center' })
    doc.text(cop(l.precio_unitario),  UNIT_RX,  y + 6, { align: 'right' })

    doc.setFont('courier', 'bold')
    doc.setTextColor(...DARK)
    doc.text(cop(subT), RE - 2, y + 6, { align: 'right' })

    y += thisH
  })

  y += 8

  // ── TOTALS (right-aligned block) ─────────────────────────────────────────────
  const totW = 82
  const totX = RE - totW

  // Subtotal
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  doc.text('Subtotal', totX, y)
  doc.setFont('courier', 'bold')
  doc.setTextColor(...DARK)
  doc.text(cop(subtotal), RE - 2, y, { align: 'right' })
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.line(totX, y + 2.5, RE, y + 2.5)
  y += 8

  // Descuento
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  doc.text('Descuento', totX, y)
  if (descuento > 0) {
    doc.setFont('courier', 'bold')
    doc.setTextColor(200, 60, 60)
    doc.text(`-${cop(descuento)}`, RE - 2, y, { align: 'right' })
  } else {
    doc.setFont('courier', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('—', RE - 2, y, { align: 'right' })
  }
  doc.setDrawColor(...LGRAY)
  doc.line(totX, y + 2.5, RE, y + 2.5)
  y += 10

  // TOTAL final box (dark bg, monospace, like the HTML)
  doc.setFillColor(...DARK)
  doc.roundedRect(totX - 2, y - 2, totW + 4, 11, 1.5, 1.5, 'F')
  doc.setFont('courier', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...WHITE)
  doc.text('TOTAL', totX + 2, y + 6)
  doc.text(copFull(total), RE - 4, y + 6, { align: 'right' })

  y += 16

  // ── CONDITIONS ───────────────────────────────────────────────────────────────
  const conditions = cotizacion.notas
    ? cotizacion.notas.split('\n').map(l => l.trim()).filter(Boolean)
    : DEFAULT_CONDITIONS

  const condLH = 5.5
  const condH  = 8 + conditions.length * condLH

  if (y + condH + 28 > 252) { doc.addPage(); y = 18 }

  secTitle(doc, 'CONDICIONES', ML, y, RE)
  y += 5

  doc.setFillColor(...AMBER_BG)
  doc.setDrawColor(...AMBER_BD)
  doc.setLineWidth(0.5)
  doc.roundedRect(ML, y, CW, condH, 2, 2, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...AMBER_TX)
  conditions.forEach((line, i) => {
    const text = line.startsWith('•') || line.startsWith('-') ? line : `• ${line}`
    doc.text(text, ML + 5, y + 6 + i * condLH)
  })

  y += condH + 10

  // ── DATOS DE PAGO ─────────────────────────────────────────────────────────────
  if (y + 22 > 254) { doc.addPage(); y = 18 }

  secTitle(doc, 'DATOS DE PAGO', ML, y, RE)
  y += 5

  doc.setFillColor(...LIGHT)
  doc.rect(ML, y, CW, 15, 'F')
  doc.setFillColor(...ACCENT)
  doc.rect(ML, y, 3, 15, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...DARK)
  doc.text('Llave Bre-B', ML + 7, y + 6)

  doc.setFont('courier', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...ACCENT)
  doc.text('3215735651', ML + 7 + doc.getTextWidth('Llave Bre-B') + 5, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('Titular: Dimas Domenech', ML + 7, y + 12)

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  const footY = 274
  doc.setFillColor(...DARK)
  doc.rect(0, footY, W, 23, 'F')

  // Left: contact info
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...FDGRAY)
  doc.text('WhatsApp:', ML, footY + 7)
  doc.text('Email:',    ML, footY + 13)
  doc.text('Instagram:', ML, footY + 19)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('+57 310 6531257',        ML + 18, footY + 7)
  doc.text('fabrica3d.co@gmail.com', ML + 13, footY + 13)
  doc.text('@fabrica3d.co',           ML + 19, footY + 19)

  // Right: location + website
  doc.setTextColor(...GRAY)
  doc.text('Barranquilla, Colombia', RE, footY + 13, { align: 'right' })
  doc.setTextColor(...ACCENT)
  doc.text('fabrica3d.co', RE, footY + 19, { align: 'right' })

  return doc
}

// ── Descargar PDF ─────────────────────────────────────────────────────────────
export function generarPdfCotizacion(cotizacion, cliente = null) {
  const doc = buildDoc(cotizacion, cliente)
  const num = String(cotizacion.numero).padStart(3, '0')
  doc.save(`COT-${num}-${cotizacion.cliente_nombre || 'cliente'}.pdf`)
}

// ── URL para previsualizar en iframe ──────────────────────────────────────────
export function previewUrlCotizacion(cotizacion, cliente = null) {
  const doc = buildDoc(cotizacion, cliente)
  return doc.output('bloburl')
}

// ── Blob para compartir via Web Share API ─────────────────────────────────────
export function blobCotizacion(cotizacion, cliente = null) {
  const doc = buildDoc(cotizacion, cliente)
  return doc.output('blob')
}
