import { jsPDF } from 'jspdf'

// ── helpers ───────────────────────────────────────────────────────────────────
const cop  = (v) => `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(v) || 0)}`
const copFull = (v) => `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(v) || 0)} COP`
const fechaMedia = (d) => {
  if (!d) return '—'
  try {
    const s = d.includes('T') ? d : d + 'T00:00:00'
    return new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())
  } catch { return d }
}

const NAVY   = [20,  34,  54]
const BLUE   = [37,  99, 235]
const LGRAY  = [245, 247, 250]
const MGRAY  = [224, 230, 234]
const LBLUE  = [239, 246, 255]
const AMBER  = [255, 251, 235]
const AMBER2 = [253, 230, 138]
const WHITE  = [255, 255, 255]
const TGRAY  = [138, 154, 176]
const TNAV   = [20,  34,  54]

const DEFAULT_CONDITIONS = [
  'Anticipo del 50% para iniciar producción.',
  'Saldo al momento de la entrega.',
  'El cliente debe enviar el logo en formato vectorial (AI, SVG, PDF) o PNG de alta resolución.',
  'Cotización válida por 7 días calendario.',
  'Precios sujetos a ajuste según diseño final.',
]

// ── Función interna que construye el PDF y lo retorna ─────────────────────────
function buildDoc(cotizacion, cliente) {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const W     = 210
  const ML    = 15
  const MR    = 15
  const CW    = W - ML - MR
  let y       = 0

  const lineas    = cotizacion.lineas || []
  const subtotal  = lineas.reduce((s, l) => s + Number(l.cantidad||0)*Number(l.precio_unitario||0), 0)
  const descuento = Number(cotizacion.descuento || 0)
  const total     = subtotal - descuento
  const num       = String(cotizacion.numero).padStart(3, '0')
  const año       = new Date(cotizacion.created_at).getFullYear()

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 44, 'F')

  doc.setFillColor(...BLUE)
  doc.roundedRect(ML, 12, 17, 17, 2, 2, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('F3D', ML + 8.5, 22.5, { align: 'center' })

  doc.setFontSize(17)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('Fabrica3D', ML + 21, 22)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TGRAY)
  doc.text('IMPRESIÓN 3D FUNCIONAL', ML + 21, 27.5)

  const badgeW = 30
  const badgeX = W - MR - badgeW
  doc.setFillColor(...BLUE)
  doc.roundedRect(badgeX, 11, badgeW, 8, 1.5, 1.5, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('COTIZACIÓN', badgeX + badgeW / 2, 16.2, { align: 'center' })

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TGRAY)
  doc.text(`#COT-${num}  ·  ${año}`, W - MR, 24, { align: 'right' })

  y = 44

  // ── INFO BAR ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...LGRAY)
  doc.rect(0, y, W, 16, 'F')

  const cols = [
    { label: 'FECHA',             value: fechaMedia(cotizacion.fecha_emision || cotizacion.created_at) },
    { label: 'VÁLIDA HASTA',      value: cotizacion.valida_hasta ? fechaMedia(cotizacion.valida_hasta) : '—' },
    { label: 'TIEMPO DE ENTREGA', value: cotizacion.tiempo_entrega || '—' },
  ]
  cols.forEach((col, i) => {
    const x = ML + i * 60
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TGRAY)
    doc.text(col.label, x, y + 5)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TNAV)
    doc.text(col.value, x, y + 12)
  })

  y += 22

  // ── CLIENTE ───────────────────────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TGRAY)
  doc.text('CLIENTE', ML, y)
  doc.setDrawColor(...MGRAY)
  doc.setLineWidth(0.3)
  doc.line(ML + 16, y - 1.5, W - MR, y - 1.5)

  y += 4

  const boxH = cliente ? 18 : 12
  doc.setFillColor(...LBLUE)
  doc.rect(ML, y, CW, boxH, 'F')
  doc.setFillColor(...BLUE)
  doc.rect(ML, y, 3, boxH, 'F')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TNAV)
  doc.text(cotizacion.cliente_nombre || 'Cliente', ML + 6, y + 7)

  if (cliente) {
    const parts = []
    if (cliente.contacto) parts.push(`Contacto: ${cliente.contacto}`)
    if (cliente.email)    parts.push(cliente.email)
    if (cliente.whatsapp) parts.push(cliente.whatsapp)
    if (parts.length) {
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(70, 100, 140)
      doc.text(parts.join('  ·  '), ML + 6, y + 13)
    }
  }

  y += boxH + 10

  // ── DETALLE DEL PEDIDO ────────────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TGRAY)
  doc.text('DETALLE DEL PEDIDO', ML, y)
  doc.setDrawColor(...MGRAY)
  doc.setLineWidth(0.3)
  doc.line(ML + 36, y - 1.5, W - MR, y - 1.5)

  y += 4

  const COL   = { prod: ML, cant: ML + 95, precio: ML + 118, total: ML + 152 }
  const ROW_H = 8

  doc.setFillColor(...NAVY)
  doc.rect(ML, y, CW, ROW_H, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUCTO',  COL.prod  + 2,   y + 5.2)
  doc.text('CANT.',     COL.cant  + 10,  y + 5.2, { align: 'center' })
  doc.text('P. UNIT.',  COL.precio + 15, y + 5.2, { align: 'right' })
  doc.text('TOTAL',     W - MR - 2,      y + 5.2, { align: 'right' })

  y += ROW_H

  lineas.forEach((l, i) => {
    const subT     = Number(l.cantidad||0) * Number(l.precio_unitario||0)
    const hasDetalle = l.detalle && l.detalle.trim()
    const thisH    = hasDetalle ? ROW_H + 5 : ROW_H

    if (y + thisH > 240) { doc.addPage(); y = 20 }

    if (i % 2 === 0) {
      doc.setFillColor(...LGRAY)
      doc.rect(ML, y, CW, thisH, 'F')
    }
    doc.setDrawColor(...MGRAY)
    doc.setLineWidth(0.2)
    doc.line(ML, y + thisH, W - MR, y + thisH)

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TNAV)
    doc.text(l.descripcion || '—', COL.prod + 2, y + 5.5)

    if (hasDetalle) {
      doc.setFontSize(7)
      doc.setTextColor(...TGRAY)
      doc.text(l.detalle, COL.prod + 2, y + 10)
    }

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 100, 130)
    doc.text(String(l.cantidad || 1), COL.cant + 10, y + 5.5, { align: 'center' })
    doc.text(cop(l.precio_unitario), COL.precio + 15, y + 5.5, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TNAV)
    doc.text(cop(subT), W - MR - 2, y + 5.5, { align: 'right' })

    y += thisH
  })

  y += 6

  // ── TOTALS ────────────────────────────────────────────────────────────────────
  const totX = ML + 100

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TGRAY)
  doc.text('Subtotal', totX, y)
  doc.setTextColor(...TNAV)
  doc.setFont('helvetica', 'bold')
  doc.text(cop(subtotal), W - MR - 2, y, { align: 'right' })
  y += 6

  doc.setTextColor(...TGRAY)
  doc.setFont('helvetica', 'normal')
  doc.text('Descuento', totX, y)
  if (descuento > 0) {
    doc.setTextColor(200, 60, 60)
    doc.setFont('helvetica', 'bold')
    doc.text(`-${cop(descuento)}`, W - MR - 2, y, { align: 'right' })
  } else {
    doc.setTextColor(...TGRAY)
    doc.text('—', W - MR - 2, y, { align: 'right' })
  }
  y += 7

  doc.setFillColor(...NAVY)
  doc.rect(totX - 2, y - 2, W - MR - totX + 4, 10, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', totX + 1, y + 5)
  doc.text(copFull(total), W - MR - 3, y + 5, { align: 'right' })

  y += 16

  // ── CONDITIONS ────────────────────────────────────────────────────────────────
  const conditions = cotizacion.notas
    ? cotizacion.notas.split('\n').map(l => l.trim()).filter(Boolean)
    : DEFAULT_CONDITIONS

  const condLineH = 5.5
  const condH     = 8 + conditions.length * condLineH

  if (y + condH > 257) { doc.addPage(); y = 20 }

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TGRAY)
  doc.text('CONDICIONES', ML, y)
  doc.setDrawColor(...MGRAY)
  doc.setLineWidth(0.3)
  doc.line(ML + 24, y - 1.5, W - MR, y - 1.5)
  y += 4

  doc.setFillColor(...AMBER)
  doc.setDrawColor(...AMBER2)
  doc.setLineWidth(0.5)
  doc.rect(ML, y, CW, condH, 'FD')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(146, 64, 14)
  conditions.forEach((line, i) => {
    const text = line.startsWith('•') || line.startsWith('-') ? line : `• ${line}`
    doc.text(text, ML + 4, y + 6 + i * condLineH)
  })

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  const footY = 275
  doc.setFillColor(...NAVY)
  doc.rect(0, footY, W, 22, 'F')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('WhatsApp:', ML, footY + 6)
  doc.text('Email:', ML, footY + 11)
  doc.text('Instagram:', ML, footY + 16)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TGRAY)
  doc.text('+57 310 6531257',       ML + 17, footY + 6)
  doc.text('fabrica3d.co@gmail.com', ML + 13, footY + 11)
  doc.text('@fabrica3d.co',          ML + 18, footY + 16)

  doc.setTextColor(...TGRAY)
  doc.text('Barranquilla, Colombia', W - MR, footY + 11, { align: 'right' })
  doc.setTextColor(...BLUE)
  doc.text('fabrica3d.co', W - MR, footY + 16, { align: 'right' })

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
