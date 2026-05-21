import jsPDF from 'jspdf'

const cop = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0)
const fecha = (d) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

export function generarPdfCotizacion(cotizacion) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 18
  let y = 0

  // ── Header band ─────────────────────────────────────────────────────────────
  doc.setFillColor(20, 34, 54)         // navy-600
  doc.rect(0, 0, W, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Fabrica', margin, 14)

  doc.setTextColor(59, 130, 246)       // accent blue
  doc.text('3D', margin + 28.5, 14)

  doc.setTextColor(200, 210, 220)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Impresión 3D · Barranquilla, Colombia', margin, 21)
  doc.text('fabrica3d.co', margin, 26)

  // Quote number top-right
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`COTIZACIÓN #${String(cotizacion.numero).padStart(4, '0')}`, W - margin, 14, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(200, 210, 220)
  doc.text(`Fecha: ${fecha(cotizacion.created_at)}`, W - margin, 21, { align: 'right' })
  if (cotizacion.valida_hasta) {
    doc.text(`Válida hasta: ${fecha(cotizacion.valida_hasta + 'T00:00:00')}`, W - margin, 26, { align: 'right' })
  }

  y = 44

  // ── Client block ─────────────────────────────────────────────────────────────
  doc.setTextColor(20, 34, 54)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('PARA:', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(cotizacion.cliente_nombre || 'Cliente', margin, y)
  y += 12

  // ── Items table ───────────────────────────────────────────────────────────────
  const colX  = { desc: margin, cant: 112, precio: 138, subtotal: 172 }
  const rowH  = 8
  const tableW = W - margin * 2

  // Table header
  doc.setFillColor(20, 34, 54)
  doc.rect(margin, y, tableW, rowH, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('DESCRIPCIÓN',    colX.desc    + 2, y + 5.5)
  doc.text('CANT.',          colX.cant,        y + 5.5, { align: 'center' })
  doc.text('PRECIO UNIT.',   colX.precio  + 10, y + 5.5, { align: 'right' })
  doc.text('SUBTOTAL',       W - margin   - 2,  y + 5.5, { align: 'right' })
  y += rowH

  // Rows
  const lineas = cotizacion.lineas || []
  lineas.forEach((linea, i) => {
    const subtotal = Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)
    if (i % 2 === 0) {
      doc.setFillColor(248, 249, 251)
      doc.rect(margin, y, tableW, rowH, 'F')
    }
    doc.setTextColor(20, 34, 54)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)

    const desc = doc.splitTextToSize(linea.descripcion || '', 85)
    doc.text(desc[0], colX.desc + 2, y + 5.5)
    doc.text(String(linea.cantidad || 1), colX.cant, y + 5.5, { align: 'center' })
    doc.text(cop(linea.precio_unitario), colX.precio + 10, y + 5.5, { align: 'right' })
    doc.text(cop(subtotal), W - margin - 2, y + 5.5, { align: 'right' })

    doc.setDrawColor(224, 230, 234)
    doc.line(margin, y + rowH, W - margin, y + rowH)
    y += rowH
  })

  y += 4

  // ── Totals block ─────────────────────────────────────────────────────────────
  const totalsX = 130
  const subtotal = lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0)
  const descuento = Number(cotizacion.descuento || 0)
  const total = subtotal - descuento

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 120, 140)

  doc.text('Subtotal:', totalsX, y); doc.setTextColor(20, 34, 54); doc.text(cop(subtotal), W - margin - 2, y, { align: 'right' }); y += 6

  if (descuento > 0) {
    doc.setTextColor(100, 120, 140)
    doc.text('Descuento:', totalsX, y)
    doc.setTextColor(220, 50, 50)
    doc.text(`-${cop(descuento)}`, W - margin - 2, y, { align: 'right' })
    y += 6
  }

  // Total row
  doc.setFillColor(20, 34, 54)
  doc.rect(totalsX - 4, y - 4, W - margin - totalsX + 4, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text('TOTAL:', totalsX, y + 2.5)
  doc.text(cop(total), W - margin - 2, y + 2.5, { align: 'right' })
  y += 16

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (cotizacion.notas) {
    doc.setTextColor(20, 34, 54)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('NOTAS:', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 100, 120)
    const notasLines = doc.splitTextToSize(cotizacion.notas, tableW)
    doc.text(notasLines, margin, y)
    y += notasLines.length * 5 + 6
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  doc.setDrawColor(20, 34, 54)
  doc.setLineWidth(0.4)
  doc.line(margin, 277, W - margin, 277)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130, 154, 176)
  doc.text('Gracias por confiar en Fabrica3D · fabrica3d.co · Barranquilla, Colombia', W / 2, 281, { align: 'center' })

  doc.save(`Cotizacion-${String(cotizacion.numero).padStart(4, '0')}-${cotizacion.cliente_nombre || 'cliente'}.pdf`)
}
