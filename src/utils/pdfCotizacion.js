import { jsPDF } from 'jspdf'
import logoSvgRaw from '../assets/logo-f3d-blanco.svg?raw'

// ── Pre-render SVG logo → PNG data URL (inicia cuando carga el módulo) ────────
// Aspect ratio logo: 1347 × 326 ≈ 4.13:1
// En PDF usaremos 82mm × 19.8mm
const LOGO_W_MM = 82
const LOGO_H_MM = 19.8

async function svgToPng(svgRaw, canvasW, canvasH) {
  return new Promise((resolve) => {
    const blob = new Blob([svgRaw], { type: 'image/svg+xml;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const img  = new window.Image()
    img.onload = () => {
      const canvas  = document.createElement('canvas')
      canvas.width  = canvasW
      canvas.height = canvasH
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvasW, canvasH)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// Empieza a renderizar en cuanto se importa el módulo (cache para el primer click)
const _logoReady = svgToPng(logoSvgRaw, 1280, 310)

// ── Helpers numéricos/fecha ───────────────────────────────────────────────────
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

// "7" → "7 días hábiles" | "5-7" → "5-7 días hábiles" | texto libre → sin cambio
const fmtEntrega = (v) => {
  if (!v) return '—'
  const t = String(v).trim()
  if (/^\d+$/.test(t))          return `${t} días hábiles`
  if (/^\d+[-–]\d+$/.test(t))  return `${t} días hábiles`
  return t
}

// ── Paleta — usa el azul de la marca #3b82f6 ─────────────────────────────────
const DARK   = [15,  23,  42]    // #0f172a  texto / header izq
const BLUE   = [59,  130, 246]   // #3b82f6  azul de la marca ← CORREGIDO
const MID    = [100, 116, 139]   // #64748b  labels, textos secundarios
const LIGHT  = [248, 250, 252]   // #f8fafc  fondos neutros
const BORDER = [226, 232, 240]   // #e2e8f0  líneas divisorias
const WHITE  = [255, 255, 255]
// Tints derivados del azul de marca (no de otro azul)
const LBLUE  = [236, 244, 254]   // #3b82f6 al 10% sobre blanco
const MBLUE  = [207, 228, 253]   // #3b82f6 al 20% sobre blanco
const LBLUE2 = [186, 215, 252]   // blue-200 derivado — label sobre panel azul
const LMID   = [156, 163, 175]   // #9ca3af  footer values

const DEFAULT_CONDITIONS = [
  'Anticipo del 50% para iniciar producción.',
  'Saldo al momento de la entrega.',
  'El cliente debe enviar el logo en formato vectorial (AI, SVG, PDF) o PNG de alta resolución.',
  'Cotización válida por 7 días calendario.',
]

// ── Section title + línea extendida ──────────────────────────────────────────
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

// ── Builder principal (async para await del logo) ─────────────────────────────
async function buildDoc(cotizacion, cliente) {
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

  // ── HEADER: panel izq oscuro + panel der azul ────────────────────────────────
  const splitX = 116

  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 52, 'F')

  doc.setFillColor(...BLUE)
  doc.rect(splitX, 0, W - splitX, 52, 'F')

  // Logo SVG como imagen (blanco sobre fondo oscuro)
  const logoDataUrl = await _logoReady
  if (logoDataUrl) {
    const lx = ML
    const ly = (52 - LOGO_H_MM) / 2   // centrado vertical en el header
    doc.addImage(logoDataUrl, 'PNG', lx, ly, LOGO_W_MM, LOGO_H_MM)
  }

  // Panel derecho: número de cotización
  const rcx = splitX + (W - splitX) / 2   // ~163 mm

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...LBLUE2)
  doc.text('COTIZACIÓN', rcx, 18, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...WHITE)
  doc.text(`#COT-${num}`, rcx, 32, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...LBLUE2)
  doc.text(String(año), rcx, 42, { align: 'center' })

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
    { label: 'TIEMPO DE ENTREGA', value: fmtEntrega(cotizacion.tiempo_entrega) },
  ].forEach((col, i) => {
    const x = ML + i * 61
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MID)
    doc.text(col.label, x, y + 8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(col.value, x, y + 17)
  })

  y += 30   // 52 + 22 meta + 8 gap = 82

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
  doc.setFontSize(12)
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

  // Encabezado de columnas — gris neutro, texto oscuro
  doc.setFillColor(...LIGHT)
  doc.rect(ML, y, CW, 8, 'F')
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(ML, y + 8, RE, y + 8)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MID)
  doc.text('PRODUCTO',  ML + 2,  y + 5.5)
  doc.text('CANT.',     CANT_CX, y + 5.5, { align: 'center' })
  doc.text('P. UNIT.',  UNIT_RX, y + 5.5, { align: 'right' })
  doc.text('TOTAL',     RE - 2,  y + 5.5, { align: 'right' })
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

  // Caja TOTAL: azul sólido marca
  doc.setFillColor(...BLUE)
  doc.roundedRect(totX - 2, y - 2, totW + 4, 12, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WHITE)
  doc.text('TOTAL', totX + 2, y + 7)
  doc.text(copFull(total), RE - 4, y + 7, { align: 'right' })

  y += 18

  // ── ANTICIPO 50% + DATOS DE PAGO ─────────────────────────────────────────────
  if (y + 32 > 254) { doc.addPage(); y = 18 }

  secTitle(doc, 'ANTICIPO PARA INICIAR PRODUCCIÓN', ML, y, RE)
  y += 5

  // Caja: tint del azul de marca + borde + barra izquierda
  doc.setFillColor(...LBLUE)
  doc.setDrawColor(...MBLUE)
  doc.setLineWidth(0.5)
  doc.roundedRect(ML, y, CW, 22, 2, 2, 'FD')
  doc.setFillColor(...BLUE)
  doc.rect(ML, y, 3, 22, 'F')

  // Izquierda: label + monto grande
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MID)
  doc.text('Cancela el 50% del total para comenzar:', ML + 7, y + 7)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...BLUE)
  doc.text(cop(anticipo), ML + 7, y + 17.5)

  // Derecha: datos de pago
  const payX = ML + 88
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MID)
  doc.text('Envía a:', payX, y + 7)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.text('Llave Bre-B  ·  3215735651', payX, y + 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MID)
  doc.text('Titular: Dimas Domenech', payX, y + 19.5)

  y += 29

  // ── CONDICIONES ───────────────────────────────────────────────────────────────
  const conditions = cotizacion.notas
    ? cotizacion.notas.split('\n').map(l => l.trim()).filter(Boolean)
    : DEFAULT_CONDITIONS

  const condLH = 5.5
  const condH  = 7 + conditions.length * condLH

  if (y + condH + 8 > 264) { doc.addPage(); y = 18 }

  secTitle(doc, 'CONDICIONES', ML, y, RE)
  y += 5

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

  // Contacto: label bold + valor normal, alineados dinámicamente
  const footerItems = [
    { label: 'WhatsApp:',  value: '+57 310 6531257' },
    { label: 'Email:',     value: 'fabrica3d.co@gmail.com' },
    { label: 'Instagram:', value: '@fabrica3d.co' },
  ]

  footerItems.forEach((item, i) => {
    const fy = footY + 7 + i * 6

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(209, 213, 219)
    doc.text(item.label, ML, fy)

    const lw = doc.getTextWidth(item.label) + 2
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...LMID)
    doc.text(item.value, ML + lw, fy)
  })

  // Derecha: ubicación + web
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...LMID)
  doc.text('Barranquilla, Colombia', RE, footY + 13, { align: 'right' })
  doc.setTextColor(...BLUE)
  doc.text('fabrica3d.co', RE, footY + 19, { align: 'right' })

  return doc
}

// ── Exports ───────────────────────────────────────────────────────────────────
export async function generarPdfCotizacion(cotizacion, cliente = null) {
  const doc = await buildDoc(cotizacion, cliente)
  const num = String(cotizacion.numero).padStart(3, '0')
  doc.save(`COT-${num}-${cotizacion.cliente_nombre || 'cliente'}.pdf`)
}

export async function previewUrlCotizacion(cotizacion, cliente = null) {
  const doc = await buildDoc(cotizacion, cliente)
  return doc.output('bloburl')
}

export async function blobCotizacion(cotizacion, cliente = null) {
  const doc = await buildDoc(cotizacion, cliente)
  return doc.output('blob')
}
