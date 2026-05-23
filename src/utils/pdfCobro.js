import { jsPDF } from 'jspdf'
import logoSvgRaw from '../assets/logo-f3d-blanco.svg?raw'
import firmaPngUrl from '../assets/firma-dimas.png'

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

async function loadPng(url) {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

const _logoReady  = svgToPng(logoSvgRaw, 520, 126)
const _firmaReady = loadPng(firmaPngUrl)

// ── Íconos footer ─────────────────────────────────────────────────────────────
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

const fechaLarga = (d) => {
  if (!d) return new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())
  try {
    const s = d.includes('T') ? d : d + 'T00:00:00'
    return new Date(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())
  } catch { return d }
}

// ── Número en letras (español colombiano) ─────────────────────────────────────
function numToWords(n) {
  const int = Math.round(n)
  if (int === 0) return 'cero'
  const ESPECIALES = ['diez','once','doce','trece','catorce','quince',
    'dieciséis','diecisiete','dieciocho','diecinueve',
    'veinte','veintiuno','veintidós','veintitrés','veinticuatro',
    'veinticinco','veintiséis','veintisiete','veintiocho','veintinueve']
  const UNIDADES = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve']
  const DECENAS  = ['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa']
  const CENTENAS = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos']
  function b1000(n) {
    if (n <= 0)   return ''
    if (n < 10)   return UNIDADES[n]
    if (n < 30)   return ESPECIALES[n - 10]
    if (n < 100)  { const d=Math.floor(n/10), u=n%10; return u ? `${DECENAS[d]} y ${UNIDADES[u]}` : DECENAS[d] }
    if (n === 100) return 'cien'
    const c=Math.floor(n/100), r=n%100; return r ? `${CENTENAS[c]} ${b1000(r)}` : CENTENAS[c]
  }
  if (int < 1000) return b1000(int)
  if (int < 1000000) {
    const k=Math.floor(int/1000), r=int%1000
    const kw = k === 1 ? 'mil' : `${b1000(k)} mil`
    return r ? `${kw} ${b1000(r)}` : kw
  }
  const m=Math.floor(int/1000000), r=int%1000000
  const mw = m === 1 ? 'un millón' : `${b1000(m)} millones`
  return r ? `${mw} ${numToWords(r)}` : mw
}

function montoEnLetras(v) {
  const n = Math.round(Number(v) || 0)
  const w = numToWords(n)
  return `${w.charAt(0).toUpperCase()}${w.slice(1)} pesos (${cop(n)})`
}

// ── Paleta ────────────────────────────────────────────────────────────────────
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

const ESTADO_COLOR = { pendiente: [251,191,36], pagado: [34,197,94], vencido: [239,68,68] }
const ESTADO_LABEL = { pendiente: 'PENDIENTE', pagado: 'PAGADO', vencido: 'VENCIDO' }

// ── Separador de sección ──────────────────────────────────────────────────────
function secLabel(doc, text, x, y, rightEdge) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...MID)
  doc.text(text, x, y)
  const tw = doc.getTextWidth(text) + 4
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.25)
  doc.line(x + tw, y - 1.2, rightEdge, y - 1.2)
}

// ── Builder ───────────────────────────────────────────────────────────────────
// cotData: { lineas: [{descripcion, cantidad, precio_unitario, detalle?}], total: number } | null
async function buildDoc(cobro, cotData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W  = 210, ML = 14, MR = 14, CW = W - ML - MR, RE = W - MR
  let y    = 0

  const num = String(cobro.numero).padStart(4, '0')
  const año = cobro.fecha_emision
    ? new Date(cobro.fecha_emision + 'T00:00:00').getFullYear()
    : new Date().getFullYear()

  const [logoDataUrl, waIcon, emailIcon, igIcon, globeIcon, firmaDataUrl] = await Promise.all([
    _logoReady, _waReady, _emailReady, _igReady, _globeReady, _firmaReady,
  ])

  // ── HEADER ───────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 50, 'F')
  if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', ML, (50 - LOGO_H_MM) / 2, LOGO_W_MM, LOGO_H_MM)

  doc.setDrawColor(45, 65, 95); doc.setLineWidth(0.4)
  doc.line(ML + LOGO_W_MM + 12, 10, ML + LOGO_W_MM + 12, 40)

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...TGRAY)
  doc.text('CUENTA DE COBRO', RE, 17, { align: 'right' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(...WHITE)
  doc.text(`#${num}`, RE, 31, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TGRAY)
  doc.text(String(año), RE, 41, { align: 'right' })

  y = 50

  // ── META BAR: fecha + ciudad + estado ─────────────────────────────────────
  doc.setFillColor(...LIGHT); doc.rect(0, y, W, 20, 'F')
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.3); doc.line(0, y + 20, W, y + 20)

  // Fecha
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MID)
  doc.text('FECHA', ML, y + 7)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...DARK)
  doc.text(fechaLarga(cobro.fecha_emision), ML, y + 15.5)

  // Ciudad
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MID)
  doc.text('CIUDAD', ML + 78, y + 7)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...DARK)
  doc.text('Barranquilla, Colombia', ML + 78, y + 15.5)

  // Estado badge
  const estadoX = ML + 145
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MID)
  doc.text('ESTADO', estadoX, y + 7)
  const estadoBg = ESTADO_COLOR[cobro.estado] || [150,168,192]
  doc.setFillColor(...estadoBg)
  doc.roundedRect(estadoX, y + 9.5, 30, 7, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...WHITE)
  doc.text(ESTADO_LABEL[cobro.estado] || cobro.estado.toUpperCase(), estadoX + 15, y + 14.8, { align: 'center' })

  y += 32

  // ── SEÑOR(ES) ─────────────────────────────────────────────────────────────
  secLabel(doc, 'SEÑOR(ES)', ML, y, RE)
  y += 5

  doc.setFillColor(...LIGHT); doc.rect(ML, y, CW, 13, 'F')
  doc.setFillColor(...NAVY); doc.rect(ML, y, 3, 13, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK)
  doc.text(cobro.cliente_nombre || 'Cliente', ML + 7, y + 8.5)

  y += 13 + 6

  // ── DEBE A ────────────────────────────────────────────────────────────────
  secLabel(doc, 'DEBE A', ML, y, RE)
  y += 5

  doc.setFillColor(LNAV[0], LNAV[1], LNAV[2])
  doc.setDrawColor(...MNAV); doc.setLineWidth(0.3)
  doc.roundedRect(ML, y, CW, 14, 2, 2, 'FD')
  doc.setFillColor(...NAVY); doc.rect(ML, y, 3, 14, 'F')

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...NAVY)
  doc.text('Dimas Domenech', ML + 7, y + 7)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MID)
  doc.text('C.C. 1001825424  ·  Persona natural', ML + 7, y + 12)

  y += 14 + 6

  // ── LA SUMA DE ────────────────────────────────────────────────────────────
  secLabel(doc, 'LA SUMA DE', ML, y, RE)
  y += 5

  doc.setFillColor(...LIGHT); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3)
  doc.roundedRect(ML, y, CW, 13, 2, 2, 'FD')
  doc.setFillColor(...NAVY); doc.rect(ML, y, 3, 13, 'F')

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...DARK)
  doc.text(montoEnLetras(cobro.monto), ML + 7, y + 8.5)

  y += 13 + 6

  // ── TABLA DE ÍTEMS ────────────────────────────────────────────────────────
  // Columnas: Descripción | Valor Unit. | Cant. | Total
  const C_UNIT = ML + 90
  const C_CANT = ML + 133
  const C_TOT  = RE

  // Encabezado tabla
  doc.setFillColor(...NAVY); doc.rect(ML, y, CW, 8, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...WHITE)
  doc.text('DESCRIPCIÓN / SERVICIO', ML + 3, y + 5.5)
  doc.text('VALOR UNIT.',  C_UNIT - 2,  y + 5.5, { align: 'right' })
  doc.text('CANT.',        C_CANT,      y + 5.5, { align: 'center' })
  doc.text('VALOR TOTAL',  C_TOT - 2,  y + 5.5, { align: 'right' })
  y += 8

  // Filas
  const lineas = cotData?.lineas?.length
    ? cotData.lineas
    : [{ descripcion: cobro.concepto || '—', cantidad: 1, precio_unitario: cobro.monto, detalle: null }]

  let tableTotal = 0

  lineas.forEach((l, idx) => {
    const subT     = Number(l.cantidad || 0) * Number(l.precio_unitario || 0)
    tableTotal    += subT
    const hasDetail = l.detalle && l.detalle.trim()
    const rowH     = hasDetail ? 14 : 9
    const bg       = idx % 2 === 0 ? [255,255,255] : [248,250,252]

    if (y + rowH > 268) { doc.addPage(); y = 18 }

    doc.setFillColor(...bg); doc.rect(ML, y, CW, rowH, 'F')
    doc.setDrawColor(...BORDER); doc.setLineWidth(0.2); doc.line(ML, y + rowH, RE, y + rowH)

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK)
    doc.text(l.descripcion || '—', ML + 3, y + 6)
    if (hasDetail) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MID)
      doc.text(l.detalle, ML + 3, y + 11)
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MID)
    doc.text(cop(l.precio_unitario), C_UNIT - 2, y + 6, { align: 'right' })
    doc.text(String(l.cantidad || 1), C_CANT, y + 6, { align: 'center' })
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
    doc.text(cop(subT), C_TOT - 2, y + 6, { align: 'right' })

    y += rowH
  })

  y += 4

  // ── TOTALES ───────────────────────────────────────────────────────────────
  const totW = 88
  const totX = RE - totW

  const montoNum        = Number(cobro.monto)
  const anticipoAplicado = cotData?.lineas?.length ? tableTotal - montoNum : 0
  const hayAnticipo      = anticipoAplicado > 1 // margen de redondeo

  if (cotData?.lineas?.length) {
    // Subtotal cotización
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MID)
    doc.text('Subtotal cotización', totX, y)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
    doc.text(cop(tableTotal), RE - 2, y, { align: 'right' })
    doc.setDrawColor(...BORDER); doc.setLineWidth(0.2); doc.line(totX, y + 2.5, RE, y + 2.5)
    y += 8

    if (hayAnticipo) {
      // Anticipo ya aplicado
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MID)
      doc.text('Anticipo aplicado', totX, y)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 60, 60)
      doc.text(`- ${cop(anticipoAplicado)}`, RE - 2, y, { align: 'right' })
      doc.setDrawColor(...BORDER); doc.setLineWidth(0.2); doc.line(totX, y + 2.5, RE, y + 2.5)
      y += 8
    }
  }

  // Caja TOTAL A PAGAR
  doc.setFillColor(...NAVY)
  doc.roundedRect(totX - 2, y - 2, totW + 4, 12, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...WHITE)
  doc.text(hayAnticipo ? 'TOTAL A PAGAR' : 'TOTAL', totX + 2, y + 7)
  doc.text(copFull(cobro.monto), RE - 4, y + 7, { align: 'right' })

  // ── FIRMA ────────────────────────────────────────────────────────────────
  y += 18

  doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...MID)
  doc.text('Atentamente,', ML, y)
  y += 4

  // Imagen de firma (aspect ratio 3:2 → 45mm × 30mm)
  if (firmaDataUrl) {
    doc.addImage(firmaDataUrl, 'PNG', ML, y, 45, 30)
  }
  y += 32

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...DARK)
  doc.text('Dimas Domenech', ML, y)
  y += 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MID)
  doc.text('C.C: 1001825424', ML, y)

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const footY = 274
  doc.setFillColor(...NAVY); doc.rect(0, footY, W, 23, 'F')
  doc.setDrawColor(45, 65, 95); doc.setLineWidth(0.4); doc.line(0, footY, W, footY)

  const iconY = footY + 9, textY = iconY + 3.8, iconGap = 2
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...LMID)

  const footItems = [
    { icon: waIcon,    text: '+57 310 6531257'        },
    { icon: emailIcon, text: 'fabrica3d.co@gmail.com' },
    { icon: igIcon,    text: '@fabrica3d.co'           },
    { icon: globeIcon, text: 'lafabrica3d.co'          },
  ]
  const itemWidths = footItems.map(it => ICON_MM + iconGap + doc.getTextWidth(it.text))
  const totalW     = itemWidths.reduce((s, w) => s + w, 0)
  const gap = (W - totalW) / (footItems.length + 1)
  let curX = gap
  footItems.forEach((it, i) => {
    if (it.icon) doc.addImage(it.icon, 'PNG', curX, iconY, ICON_MM, ICON_MM)
    doc.text(it.text, curX + ICON_MM + iconGap, textY)
    curX += itemWidths[i] + gap
  })

  return doc
}

// ── Exports ───────────────────────────────────────────────────────────────────
// cotData: { lineas, total } | null  — pasar si quieres mostrar ítems de cotización
export async function generarPdfCobro(cobro, cotData = null) {
  const doc = await buildDoc(cobro, cotData)
  doc.save(`CuentaCobro-${String(cobro.numero).padStart(4,'0')}-${cobro.cliente_nombre || 'cliente'}.pdf`)
}

export async function previewUrlCobro(cobro, cotData = null) {
  const doc = await buildDoc(cobro, cotData)
  return doc.output('bloburl')
}

export async function blobCobro(cobro, cotData = null) {
  const doc = await buildDoc(cobro, cotData)
  return doc.output('blob')
}
