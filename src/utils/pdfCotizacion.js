import { jsPDF } from 'jspdf'
import logoSvgRaw from '../assets/logo-f3d-blanco.svg?raw'

// ── Pre-render SVG logo al cargar el módulo ────────────────────────────────────
// Aspect ratio logo: 1347 × 326 = 4.13:1  →  65mm × 15.7mm en el PDF
const LOGO_W_MM = 65
const LOGO_H_MM = 15.7

async function svgToPng(svgRaw, canvasW, canvasH) {
  return new Promise((resolve) => {
    const blob = new Blob([svgRaw], { type: 'image/svg+xml;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const img  = new window.Image()
    img.onload = () => {
      const canvas  = document.createElement('canvas')
      canvas.width  = canvasW * 2   // 2× para calidad
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

const _logoReady = svgToPng(logoSvgRaw, 520, 126)   // 65mm × 15.7mm a 8px/mm

// ── Íconos footer (SVG blancos, pre-renderizados) ─────────────────────────────
const _WA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M.057 24l1.687-6.163C.598 16.33.057 14.306.057 12.003.057 5.448 5.396.108 11.954.108c3.18 0 6.163 1.24 8.41 3.489a11.825 11.825 0 013.485 8.413c-.003 6.557-5.341 11.896-11.896 11.896a11.9 11.9 0 01-5.688-1.449L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.867-2.031-.967-.272-.099-.471-.148-.669.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.447-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`

const _EMAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`

const _IG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`

// 5mm × 5mm en el PDF → canvas 80×80px (16px/mm)
const ICON_MM  = 5
const _waReady    = svgToPng(_WA_SVG,    80, 80)
const _emailReady = svgToPng(_EMAIL_SVG, 80, 80)
const _igReady    = svgToPng(_IG_SVG,    80, 80)

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

const fmtEntrega = (v) => {
  if (!v) return '—'
  const t = String(v).trim()
  if (/^\d+$/.test(t))          return `${t} días hábiles`
  if (/^\d+[-–]\d+$/.test(t))  return `${t} días hábiles`
  return t
}

// ── Paleta — color de marca #142236 ──────────────────────────────────────────
const NAVY   = [20,  34,  54]    // #142236  BRAND — header, total, barras
const DARK   = [20,  34,  54]    // mismo, para texto principal
const MID    = [100, 116, 139]   // #64748b  labels secundarios
const LIGHT  = [248, 250, 252]   // #f8fafc  fondos sección
const BORDER = [226, 232, 240]   // #e2e8f0  separadores
const WHITE  = [255, 255, 255]
const THEAD  = [245, 247, 250]   // tabla: encabezado gris muy claro
const TGRAY  = [150, 168, 192]   // texto sobre fondo oscuro (semi-visible)
const LMID   = [156, 163, 175]   // footer values
// Tint del brand navy para anticipo:
const LNAV   = [237, 240, 245]   // #142236 ~6% sobre blanco  → fondo caja
const MNAV   = [205, 213, 225]   // #142236 ~15% sobre blanco → borde caja

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

// ── Builder ───────────────────────────────────────────────────────────────────
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

  // ── HEADER: fondo brand navy uniforme ────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 50, 'F')

  // Await logo + iconos (en paralelo, ya están iniciando desde module load)
  const [logoDataUrl, waIcon, emailIcon, igIcon] = await Promise.all([
    _logoReady, _waReady, _emailReady, _igReady,
  ])
  if (logoDataUrl) {
    const ly = (50 - LOGO_H_MM) / 2   // centrado vertical ~17mm
    doc.addImage(logoDataUrl, 'PNG', ML, ly, LOGO_W_MM, LOGO_H_MM)
  }

  // Separador vertical sutil entre logo y número
  doc.setDrawColor(45, 65, 95)   // navy ligeramente más claro
  doc.setLineWidth(0.4)
  doc.line(ML + LOGO_W_MM + 12, 10, ML + LOGO_W_MM + 12, 40)

  // Número de cotización (derecha)
  const textX = ML + LOGO_W_MM + 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...TGRAY)
  doc.text('COTIZACIÓN', RE, 17, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.setTextColor(...WHITE)
  doc.text(`#COT-${num}`, RE, 31, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...TGRAY)
  doc.text(String(año), RE, 41, { align: 'right' })

  // Tagline empresa — solo si el logo no la trae (no necesaria, logo ya es el brand)
  y = 50

  // ── META BAR ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT)
  doc.rect(0, y, W, 24, 'F')
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(0, y + 24, W, y + 24)

  ;[
    { label: 'FECHA',             value: fechaMedia(cotizacion.fecha_emision || cotizacion.created_at) },
    { label: 'VÁLIDA HASTA',      value: cotizacion.valida_hasta ? fechaMedia(cotizacion.valida_hasta) : '—' },
    { label: 'TIEMPO DE ENTREGA', value: fmtEntrega(cotizacion.tiempo_entrega) },
  ].forEach((col, i) => {
    const x = ML + i * 61
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MID)
    doc.text(col.label, x, y + 8.5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)    // ← más grande (era 9pt)
    doc.setTextColor(...DARK)
    doc.text(col.value, x, y + 18.5)
  })

  y += 32   // 50 + 24 meta + 8 gap = 82

  // ── CLIENTE ───────────────────────────────────────────────────────────────────
  secTitle(doc, 'CLIENTE', ML, y, RE)
  y += 5

  const hasDetail = cliente && (cliente.contacto || cliente.email || cliente.whatsapp)
  const clientH   = hasDetail ? 18 : 13

  doc.setFillColor(...LIGHT)
  doc.rect(ML, y, CW, clientH, 'F')
  doc.setFillColor(...NAVY)
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

  const CANT_CX = 120
  const UNIT_RX = 153

  // Encabezado de columnas — gris muy claro, texto navy
  doc.setFillColor(...THEAD)
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
    const subT       = Number(l.cantidad||0) * Number(l.precio_unitario||0)
    const hasDetalle = l.detalle && l.detalle.trim()
    const thisH      = hasDetalle ? 14 : 9

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

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MID)
  doc.text('Subtotal', totX, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(cop(subtotal), RE - 2, y, { align: 'right' })
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(totX, y + 2.5, RE, y + 2.5)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
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

  // Caja TOTAL: brand navy
  doc.setFillColor(...NAVY)
  doc.roundedRect(totX - 2, y - 2, totW + 4, 12, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...WHITE)
  doc.text('TOTAL', totX + 2, y + 7)
  doc.text(copFull(total), RE - 4, y + 7, { align: 'right' })

  y += 18

  // ── ANTICIPO 50% + DATOS DE PAGO ─────────────────────────────────────────────
  if (y + 32 > 254) { doc.addPage(); y = 18 }

  secTitle(doc, 'ANTICIPO PARA INICIAR PRODUCCIÓN', ML, y, RE)
  y += 5

  doc.setFillColor(...LNAV)
  doc.setDrawColor(...MNAV)
  doc.setLineWidth(0.5)
  doc.roundedRect(ML, y, CW, 22, 2, 2, 'FD')
  doc.setFillColor(...NAVY)
  doc.rect(ML, y, 3, 22, 'F')

  // Izquierda: label + monto grande
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MID)
  doc.text('Cancela el 50% del total para comenzar:', ML + 7, y + 7)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...NAVY)
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
  doc.setFillColor(...NAVY)
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
  doc.setFillColor(...NAVY)
  doc.rect(0, footY, W, 23, 'F')

  // Línea separadora sutil
  doc.setDrawColor(45, 65, 95)
  doc.setLineWidth(0.4)
  doc.line(0, footY, W, footY)

  // ── Íconos + contacto HORIZONTAL ─────────────────────────────────────────────
  // 3 ítems a x = 14 | 76 | 138  —  ícono 5mm + gap 2mm + texto
  // centrados verticalmente: iconY = footY + (23 - 5) / 2 = footY + 9
  const iconY   = footY + 9        // top del ícono (5mm de altura)
  const textY   = iconY + 3.8      // baseline texto alineado al centro del ícono
  const iconGap = 2                // mm entre ícono y texto
  const items   = [
    { icon: waIcon,    text: '+57 310 6531257',        x: ML },
    { icon: emailIcon, text: 'fabrica3d.co@gmail.com', x: ML + 62 },
    { icon: igIcon,    text: '@fabrica3d.co',           x: ML + 130 },
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...LMID)

  items.forEach(({ icon, text, x }) => {
    if (icon) doc.addImage(icon, 'PNG', x, iconY, ICON_MM, ICON_MM)
    doc.text(text, x + ICON_MM + iconGap, textY)
  })

  // Dominio — derecha, centrado vertical
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(150, 168, 192)
  doc.text('lafabrica3d.co', RE, textY, { align: 'right' })

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
