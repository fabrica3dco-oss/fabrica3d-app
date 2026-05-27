const cop = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0)
const fechaLarga = (d) => { try { const ds = typeof d === 'string' && d.length === 10 ? d + 'T12:00:00' : d; return new Date(ds).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return d } }

const ESTADO_STYLE = {
  borrador:  'bg-gray-100 text-gray-700',
  enviada:   'bg-blue-100 text-blue-700',
  aprobada:  'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
}
const ESTADO_LABEL = { borrador: 'Borrador', enviada: 'Enviada', aprobada: 'Aprobada', rechazada: 'Rechazada' }

export default function CotizacionVista({ cotizacion }) {
  const lineas    = cotizacion.lineas || []
  const subtotal  = lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0)
  const descuento = Number(cotizacion.descuento || 0)
  const total     = subtotal - descuento

  return (
    <div className="bg-white font-sans text-navy-600 max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-[#142236] text-white px-8 py-6 flex items-start justify-between">
        <div>
          <p className="text-xl font-bold tracking-tight">
            Fabrica<span className="text-blue-400">3D</span>
          </p>
          <p className="text-xs text-[#8aa0b8] mt-0.5">Impresión 3D · Barranquilla, Colombia</p>
          <p className="text-xs text-[#8aa0b8]">fabrica3d.co</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">COTIZACIÓN #{String(cotizacion.numero).padStart(4, '0')}</p>
          <p className="text-xs text-[#8aa0b8] mt-1">Fecha: {fechaLarga(cotizacion.fecha_emision || cotizacion.created_at)}</p>
          {cotizacion.valida_hasta && (
            <p className="text-xs text-[#8aa0b8]">Válida hasta: {fechaLarga(cotizacion.valida_hasta)}</p>
          )}
          {cotizacion.estado && (
            <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLE[cotizacion.estado]}`}>
              {ESTADO_LABEL[cotizacion.estado]}
            </span>
          )}
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Para */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#8a9ab0] uppercase tracking-widest mb-1">Para</p>
          <p className="text-lg font-bold text-navy-600">{cotizacion.cliente_nombre || 'Cliente'}</p>
        </div>

        {/* Tabla de ítems */}
        <div className="mb-6">
          <div className="grid grid-cols-[1fr_60px_130px_130px] bg-[#142236] text-white text-xs font-semibold uppercase tracking-wide rounded-t-lg">
            <div className="px-3 py-2.5">Descripción</div>
            <div className="px-2 py-2.5 text-center">Cant.</div>
            <div className="px-3 py-2.5 text-right">Precio unit.</div>
            <div className="px-3 py-2.5 text-right">Subtotal</div>
          </div>
          {lineas.map((l, i) => {
            const sub = Number(l.cantidad || 0) * Number(l.precio_unitario || 0)
            return (
              <div key={i} className={`grid grid-cols-[1fr_60px_130px_130px] text-sm border-b border-[#f0f2f5] ${i % 2 === 0 ? 'bg-[#f8f9fb]' : 'bg-white'}`}>
                <div className="px-3 py-2.5 text-navy-600">{l.descripcion || '—'}</div>
                <div className="px-2 py-2.5 text-center text-[#8a9ab0]">{l.cantidad}</div>
                <div className="px-3 py-2.5 text-right text-[#8a9ab0]">{cop(l.precio_unitario)}</div>
                <div className="px-3 py-2.5 text-right font-medium text-navy-600">{cop(sub)}</div>
              </div>
            )
          })}
          {lineas.length === 0 && (
            <div className="px-3 py-4 text-sm text-[#8a9ab0] text-center border-b border-[#f0f2f5] bg-[#f8f9fb]">Sin ítems</div>
          )}
        </div>

        {/* Totales */}
        <div className="flex justify-end mb-6">
          <div className="w-64">
            <div className="flex justify-between text-sm py-1.5 border-b border-[#f0f2f5]">
              <span className="text-[#8a9ab0]">Subtotal</span>
              <span className="font-medium text-navy-600">{cop(subtotal)}</span>
            </div>
            {descuento > 0 && (
              <div className="flex justify-between text-sm py-1.5 border-b border-[#f0f2f5]">
                <span className="text-[#8a9ab0]">Descuento</span>
                <span className="font-medium text-red-600">-{cop(descuento)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 mt-1 bg-[#142236] text-white rounded-lg px-3">
              <span className="font-bold text-sm">TOTAL</span>
              <span className="font-bold text-sm">{cop(total)}</span>
            </div>
          </div>
        </div>

        {/* Notas */}
        {cotizacion.notas && (
          <div className="bg-[#f8f9fb] rounded-lg px-4 py-3 mb-6">
            <p className="text-xs font-semibold text-[#8a9ab0] uppercase tracking-widest mb-1">Notas</p>
            <p className="text-sm text-navy-600 whitespace-pre-line">{cotizacion.notas}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#e2e6ea] pt-4 text-center">
          <p className="text-xs text-[#8a9ab0]">Gracias por confiar en Fabrica3D · fabrica3d.co · Barranquilla, Colombia</p>
        </div>
      </div>
    </div>
  )
}
