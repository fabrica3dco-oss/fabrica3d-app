import jsPDF from 'jspdf'

const cop = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0)
const fechaLarga = (d) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return d || '' } }

const ESTADO_LABEL = { pendiente: 'PENDIENTE', pagado: 'PAGADO', vencido: 'VENCIDO' }
const METODO_LABEL = { transferencia: 'Transferencia bancaria', efectivo: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', otro: 'Otro' }

export function generarPdfCobro(cobro) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 18

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(20, 34, 54)
  doc.rect(0, 0, W, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Fabrica', margin, 14)
  doc.setTextColor(59, 130, 246)
  doc.text('3D', margin + 28.5, 14)

  doc.setTextColor(200, 210, 220)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Impresión 3D · Barranquilla, Colombia', margin, 21)
  doc.text('fabrica3d.co', margin, 26)

  // Número top-right
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`COBRO #${String(cobro.numero).padStart(4, '0')}`, W - margin, 14, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(200, 210, 220)
  if (cobro.fecha_emision) doc.text(`Emisión: ${fechaLarga(cobro.fecha_emision)}`, W - margin, 21, { align: 'right' })
  if (cobro.fecha_vencimiento) doc.text(`Vencimiento: ${fechaLarga(cobro.fecha_vencimiento)}`, W - margin, 26, { align: 'right' })

  let y = 44

  // Estado badge
  const estadoColor = cobro.estado === 'pagado' ? [34, 197, 94] : cobro.estado === 'vencido' ? [239, 68, 68] : [251, 191, 36]
  doc.setFillColor(...estadoColor)
  doc.roundedRect(margin, y, 30, 8, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text(ESTADO_LABEL[cobro.estado] || cobro.estado.toUpperCase(), margin + 15, y + 5.5, { align: 'center' })
  y += 16

  // Cliente
  doc.setTextColor(20, 34, 54)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('PARA:', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  doc.text(cobro.cliente_nombre || 'Cliente', margin, y)
  y += 14

  // Separador
  doc.setDrawColor(224, 230, 234)
  doc.setLineWidth(0.4)
  doc.line(margin, y, W - margin, y)
  y += 8

  // Concepto + monto
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 34, 54)
  doc.text('CONCEPTO', margin, y)
  doc.text('MONTO', W - margin, y, { align: 'right' })
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  const conceptoLines = doc.splitTextToSize(cobro.concepto || '', W - margin * 2 - 60)
  doc.text(conceptoLines, margin, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(20, 34, 54)
  doc.text(cop(cobro.monto), W - margin, y + 2, { align: 'right' })
  y += Math.max(conceptoLines.length * 6, 14) + 6

  // Separador
  doc.setDrawColor(224, 230, 234)
  doc.line(margin, y, W - margin, y)
  y += 8

  // Método de pago (si pagado)
  if (cobro.estado === 'pagado' && cobro.metodo_pago) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 120, 140)
    doc.text('MÉTODO DE PAGO:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 34, 54)
    doc.text(METODO_LABEL[cobro.metodo_pago] || cobro.metodo_pago, margin + 38, y)
    y += 10
  }

  // Notas
  if (cobro.notas) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 120, 140)
    doc.text('NOTAS:', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 100, 120)
    const notasLines = doc.splitTextToSize(cobro.notas, W - margin * 2)
    doc.text(notasLines, margin, y)
    y += notasLines.length * 5 + 6
  }

  // Footer
  doc.setDrawColor(20, 34, 54)
  doc.setLineWidth(0.4)
  doc.line(margin, 277, W - margin, 277)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130, 154, 176)
  doc.text('Gracias por confiar en Fabrica3D · fabrica3d.co · Barranquilla, Colombia', W / 2, 281, { align: 'center' })

  doc.save(`Cobro-${String(cobro.numero).padStart(4, '0')}-${cobro.cliente_nombre || 'cliente'}.pdf`)
}
