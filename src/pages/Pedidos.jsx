import { useState } from 'react'
import { Search, Calendar, User, Hash, ClipboardList, Link2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { usePedidos } from '../hooks/usePedidos'

const ESTADOS = [
  { id: 'en_cola',     label: 'En cola',       color: 'gray' },
  { id: 'diseno_stl',  label: 'Diseño STL',    color: 'blue' },
  { id: 'imprimiendo', label: 'Impresión',      color: 'amber' },
  { id: 'acabado',     label: 'Acabado final',  color: 'gray' },
  { id: 'terminado',   label: 'Terminado',      color: 'green' },
  { id: 'entregado',   label: 'Entregado',      color: 'green' },
]

const BADGE_COLOR = Object.fromEntries(ESTADOS.map(e => [e.id, e.color]))
const LABEL       = Object.fromEntries(ESTADOS.map(e => [e.id, e.label]))

function Skeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="animate-pulse bg-[#e2e6ea] rounded h-12 w-full" />
      ))}
    </div>
  )
}

export default function Pedidos() {
  const { pedidos, loading } = usePedidos()
  const [busqueda,    setBusqueda]    = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const filtrados = pedidos.filter(p => {
    const coincideBusqueda =
      p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase())
    const coincideEstado = !filtroEstado || p.estado === filtroEstado
    return coincideBusqueda && coincideEstado
  })

  const entregados  = pedidos.filter(p => p.estado === 'entregado').length
  const activos     = pedidos.filter(p => p.estado !== 'entregado').length
  const esteMes     = pedidos.filter(p => {
    if (!p.created_at) return false
    const d = new Date(p.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-600">Pedidos</h1>
        <p className="text-sm text-[#8a9ab0] mt-0.5">Historial completo de todos los pedidos</p>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total pedidos', value: pedidos.length },
          { label: 'Activos ahora', value: activos },
          { label: 'Este mes',      value: esteMes },
        ].map(m => (
          <div key={m.label} className="bg-white border border-[#e2e6ea] rounded-xl p-4">
            <p className="text-xs font-medium text-[#8a9ab0] uppercase tracking-wide">{m.label}</p>
            <p className="text-2xl font-bold text-navy-600 mt-1">{loading ? '—' : m.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9ab0]" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por descripción o cliente..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#e2e6ea] rounded-lg bg-white text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="p-4"><Skeleton /></div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center gap-3">
            <ClipboardList size={40} className="text-[#e2e6ea]" />
            <p className="text-sm font-medium text-navy-600">
              {busqueda || filtroEstado ? 'Sin resultados' : 'Sin pedidos registrados'}
            </p>
            <p className="text-xs text-[#8a9ab0]">
              {busqueda || filtroEstado ? 'Prueba con otros filtros.' : 'Los pedidos aparecerán aquí cuando los crees en Producción.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Descripción</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Ref. Cobro</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Entrega</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Creado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f5]">
                  {filtrados.map(p => (
                    <tr key={p.id} className="hover:bg-[#f8f9fb] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-navy-600">{p.descripcion}</p>
                        {p.cantidad && <p className="text-xs text-[#8a9ab0] flex items-center gap-1 mt-0.5"><Hash size={10} />{p.cantidad} unidad{p.cantidad !== 1 ? 'es' : ''}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {p.cliente_nombre
                          ? <span className="flex items-center gap-1.5 text-[#8a9ab0]"><User size={12} />{p.cliente_nombre}</span>
                          : <span className="text-[#c0cad6]">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={BADGE_COLOR[p.estado] || 'gray'}>{LABEL[p.estado] || p.estado}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {p.cobro_ref
                          ? <span className="flex items-center gap-1 text-[#8a9ab0]"><Link2 size={11} />{p.cobro_ref}</span>
                          : <span className="text-[#c0cad6]">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-[#8a9ab0]">
                        {p.fecha_entrega
                          ? <span className="flex items-center gap-1.5"><Calendar size={12} />{new Date(p.fecha_entrega + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          : <span className="text-[#c0cad6]">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-[#8a9ab0] text-xs">
                        {new Date(p.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-[#f0f2f5]">
              {filtrados.map(p => (
                <div key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-navy-600 leading-tight">{p.descripcion}</p>
                    <Badge variant={BADGE_COLOR[p.estado] || 'gray'}>{LABEL[p.estado] || p.estado}</Badge>
                  </div>
                  {p.cliente_nombre && <p className="text-xs text-[#8a9ab0] flex items-center gap-1 mb-0.5"><User size={10} />{p.cliente_nombre}</p>}
                  {p.cobro_ref && <p className="text-xs text-[#8a9ab0] flex items-center gap-1 mb-0.5"><Link2 size={10} />{p.cobro_ref}</p>}
                  {p.fecha_entrega && <p className="text-xs text-[#8a9ab0] flex items-center gap-1"><Calendar size={10} />{new Date(p.fecha_entrega + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
