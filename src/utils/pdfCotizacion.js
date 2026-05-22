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

// "7" → "7 días hábiles" | "5-7" → "5-7 días hábiles" | "3 semanas" → sin cambio
const formatEntrega = (v) => {
  if (!v) return '—'
  const t = String(v).trim()
  if (/^\d+$/.test(t))         return `${t} días hábiles`
  if (/^\d+[-–]\d+$/.test(t)) return `${t} días hábiles`
  return t
}

// ── Paleta ────────────────────────────────────────────────────────────────────
const DARK   = [15,  23,  42]    // #0f172a  texto principal / header izq
const BLUE   = [37,  99,  235]   // #2563eb  acento azul primario
const MID    = [100, 116, 139]   // #64748b  labels / texto secundario
const LIGHT  = [248, 250, 252]   // #f8fafc  fondos sección
const BORDER = [226, 232, 240]   // #e2e8f0  separadores
const WHITE  = [255, 255, 255]
const LBLUE  = [239, 246, 255]   // #eff6ff  blue-50 (anticipo, tabla header)
const MBLUE  = [219, 234, 254]   // #dbeafe  blue-100 (bordes)
const LBLUE2 = [191, 219, 254]   // #bfdbfe  blue-200 (labels sobre azul)
const LMID   = [156, 163, 175]   // #9ca3af  footer values

const DEFAULT_CONDITIONS = [
  'Anticipo del 50% para iniciar producción.',
  'Saldo al momento de la entrega.',
  'El cliente debe enviar el logo en formato vectorial (AI, SVG, PDF) o PNG de alta resolución.',
  'Cotización válida por 7 días calendario.',
]

// ── Section title: texto gris + línea horizontal ──────────────────────────────
function secTitle(doc, text, x, y, rightEdge) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...MID)
  doc.text(text, x, y)
  const tw = doc.getTextWidth(text) + 4
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(x + tw, y - 1.5, rightEdge, y - 1.5)
}

// ── Construcción del PDF ──────────────────────────────────────────────────────
function buildDoc(cotizacion, cliente) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W   = 210
  const ML  = 14
  const MR  = 14
  const CW  = W - ML - MR   // 182 mm
  const RE  = W - MR        // 196 mm
  let y     = 0

  const lineas    = cotizacion.lineas || []
  const subtotal  = lineas.reduce((s, l) => s + Number(l.cantidad||0) * Number(l.precio_unitario||0), 0)
  const descuento = Number(cotizacion.descuento || 0)
  const total     = subtotal - descuento
  const anticipo  = total * 0.5
  const num       = String(cotizacion.numero).padStart(3, '0')
  const año       = new Date(cotizacion.created_at).getFullYear()

  // ── HEADER: split izq oscuro + der azul ─────────────────────────────────────
  const splitX = 118   // punto de división

  // Fondo oscuro (todo el header)
  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 52, 'F')

  // Bloque azul derecho
  doc.setFillColor(...BLUE)
  doc.rect(splitX, 0, W - splitX, 52, 'F')

  // — Izquierda: icono F3D + nombre —
  doc.setFillColor(...BLUE)
  doc.roundedRect(ML, 14, 22, 22, 2.5, 2.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...WHITE)
  doc.text('F3D', ML + 11, 27.5, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...WHITE)
  doc.text('Fabrica3D', ML + 27, 24.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...MID)
  doc.text('IMPRESIÓN 3D FUNCIONAL', ML + 27, 30.5)

  // — Derecha (panel azul): número de cotización —
  const rcx = splitX + (W - splitX) / 2   // ~164 mm

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...LBLUE2)
  doc.text('COTIZACIÓN', rcx, 19, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...WHITE)
  doc.text(`#COT-${num}`, rcx, 33.5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...LBLUE2)
  doc.text(String(año), rcx, 43, { align: 'center' })

  y = 52

  // ── META BAR ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT)
  doc.rect(0, y, W, 22, 'F')
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(0, y + 22, W, y + 22)

  ;[
    { label: 'FECHA',             value: fechaMedia(cotizacion.fecha_emision || cotizacion.created_at) },
    { label: 'VÁLIDA HASTA',      value: cotizacion.valida_hasta ? fechaMedia(cotizacion.valida_hasta) : '—' },
    { label: 'TIEMPO DE ENTREGA', value: formatEntrega(cotizacion.tiempo_entrega) },
  ].forEach((col, i) => {
    const x = ML + i * 61
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...MID)
    doc.text(col.label, x, y + 8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(col.value, x, y + 17)
  })

  y += 30   // 52 + 22 + 8 gap = 82

  // ── CLIENTE ───────────────────────────────────────────────────────────────────
  secTitle(doc, 'CLIENTE', ML, y, RE)
  y += 5

  const hasDetail = cliente && (cliente.contacto || cliente.email || cliente.whatsapp)
  const clientH   = hasDetail ? 18 : 13

  doc.setFillColor(...LIGHT)
  doc.rect(ML, y, CW, clientH, 'F')
  doc.setFillColor(...BLUE)
  doc.rect(ML, y, 3, clientH, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...DARK)
  doc.text(cotizacion.cliente_nombre || 'Cliente', ML + 7, y + 8.5)

  if (hasDetail) {
    const parts = []
    if (cliente.contacto) parts.push(cliente.contacto)
    if (cliente.email)    parts.push(cliente.email)
    if (cliente.whatsapp) parts.push(cliente.whatsapp)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MID)
    doc.text(parts.join('  ·  '), ML + 7, y + 14.5)
  }

  y += clientH + 9

  // ── TABLA DE PRODUCTOS ────────────────────────────────────────────────────────
  secTitle(doc, 'DETALLE DEL PEDIDO', ML, y, RE)
  y += 5

  const CANT_CX = 120   // centro columna cantidad
  const UNIT_RX = 153   // borde derecho precio unitario

  // Header de columnas: fondo azul claro, texto azul
  doc.setFillColor(...LBLUE)
  doc.rect(ML, y, CW, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...BLUE)
  doc.text('PRODUCTO',  ML + 2,   y + 5.5)
  doc.text('CANT.',     CANT_CX,  y + 5.5, { align: 'center' })
  doc.text('P. UNIT.',  UNIT_RX,  y + 5.5, { align: 'right' })
  doc.text('TOTAL',     RE - 2,   y + 5.5, { align: 'right' })
  y += 8

  lineas.forEach((l) => {
    const subT      = Number(l.cantidad||0) * Number(l.precio_unitario||0)
    const hasDetalle = l.detalle && l.detalle.trim()
    const thisH     = hasDetalle ? 14 : 9

    if (y + thisH > 210) { doc.addPage(); y = 18 }

    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.2)
    doc.line(ML, y + thisH, RE, y + thisH)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(l.descripcion || '—', ML + 2, y + 6)

    if (hasDetalle) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...MID)
      doc.text(l.detalle, ML + 2, y + 11)
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MID)
    doc.text(String(l.cantidad || 1), CANT_CX, y + 6, { align: 'center' })
    doc.text(cop(l.precio_unitario),  UNIT_RX,  y + 6, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(cop(subT), RE - 2, y + 6, { align: 'right' })

    y += thisH
  })

  y += 6

  // ── TOTALES ───────────────────────────────────────────────────────────────────
  const totW = 82
  const totX = RE - totW

  // Subtotal
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MID)
  doc.text('Subtotal', totX, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(cop(subtotal), RE - 2, y, { align: 'right' })
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(totX, y + 2.5, RE, y + 2.5)
  y += 7

  // Descuento
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MID)
  doc.text('Descuento', totX, y)
  if (descuento > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38)
    doc.text(`– ${cop(descuento)}`, RE - 2, y, { align: 'right' })
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MID)
    doc.text('—', RE - 2, y, { align: 'right' })
  }
  doc.setDrawColor(...BORDER)
  doc.line(totX, y + 2.5, RE, y + 2.5)
  y += 9

  // Caja TOTAL: azul sólido
  doc.setFillColor(...BLUE)
  doc.roundedRect(totX - 2, y - 2, totW + 4, 12, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WHITE)
  doc.text('TOTAL', totX + 2, y + 7)
  doc.text(copFull(total), RE - 4, y + 7, { align: 'right' })

  y += 18

  // ── ANTICIPO (50%) + DATOS DE PAGO ───────────────────────────────────────────
  if (y + 32 > 254) { doc.addPage(); y = 18 }

  secTitle(doc, 'ANTICIPO PARA INICIAR PRODUCCIÓN', ML, y, RE)
  y += 5

  // Caja azul claro con borde y barra izquierda
  doc.setFillColor(...LBLUE)
  doc.setDrawColor(...MBLUE)
  doc.setLineWidth(0.5)
  doc.roundedRect(ML, y, CW, 21, 2, 2, 'FD')
  doc.setFillColor(...BLUE)
  doc.rect(ML, y, 3, 21, 'F')

  // — Izquierda: label + monto grande —
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...MID)
  doc.text('Cancela el 50% del total para comenzar:', ML + 7, y + 7)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...BLUE)
  doc.text(cop(anticipo), ML + 7, y + 17)

  // — Derecha: datos de pago —
  const payX = splitX - 4   // ~114mm desde izquierda

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...MID)
  doc.text('Envía a:', payX, y + 7)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.text('Llave Bre-B  ·  3215735651', payX, y + 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MID)
  doc.text('Titular: Dimas Domenech', payX, y + 18.5)

  y += 28

  // ── CONDICIONES ───────────────────────────────────────────────────────────────
  const conditions = cotizacion.notas
    ? cotizacion.notas.split('\n').map(l => l.trim()).filter(Boolean)
    : DEFAULT_CONDITIONS

  const condLH = 5.5
  const condH  = 7 + conditions.length * condLH

  if (y + condH + 8 > 264) { doc.addPage(); y = 18 }

  secTitle(doc, 'CONDICIONES', ML, y, RE)
  y += 5

  // Caja gris claro + barra azul izq (mismo lenguaje visual)
  doc.setFillColor(...LIGHT)
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(ML, y, CW, condH, 2, 2, 'FD')
  doc.setFillColor(...BLUE)
  doc.rect(ML, y, 3, condH, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MID)
  conditions.forEach((line, i) => {
    const text = line.startsWith('•') || line.startsWith('-') ? line : `• ${line}`
    doc.text(text, ML + 7, y + 6 + i * condLH)
  })

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  const footY = 274
  doc.setFillColor(...DARK)
  doc.rect(0, footY, W, 23, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(209, 213, 219)   // gray-300
  doc.text('WhatsApp:',  ML, footY + 7)
  doc.text('Email:',     ML, footY + 13)
  doc.text('Instagram:', ML, footY + 19)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LMID)
  doc.text('+57 310 6531257',        ML + 18, footY + 7)
  doc.text('fabrica3d.co@gmail.com', ML + 13, footY + 13)
  doc.text('@fabrica3d.co',          ML + 19, footY + 19)

  doc.setTextColor(...LMID)
  doc.text('Barranquilla, Colombia', RE, footY + 13, { align: 'right' })
  doc.setTextColor(...BLUE)
  doc.text('fabrica3d.co', RE, footY + 19, { align: 'right' })

  return doc
}

// ── Exports ───────────────────────────────────────────────────────────────────
export function generarPdfCotizacion(cotizacion, cliente = null) {
  const doc = buildDoc(cotizacion, cliente)
  const num = String(cotizacion.numero).padStart(3, '0')
  doc.save(`COT-${num}-${cotizacion.cliente_nombre || 'cliente'}.pdf`)
}

export function previewUrlCotizacion(cotizacion, cliente = null) {
  const doc = buildDoc(cotizacion, cliente)
  return doc.output('bloburl')
}

export function blobCotizacion(cotizacion, cliente = null) {
  const doc = buildDoc(cotizacion, cliente)
  return doc.output('blob')
}
