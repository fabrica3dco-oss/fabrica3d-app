import { useNavigate } from 'react-router-dom'
import {
  DollarSign, Clock, TrendingUp, Package, AlertTriangle,
  ArrowUpRight, ArrowDownLeft, FileText, ChevronRight,
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useDashboard } from '../hooks/useDashboard'

const cop = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
const dateStr = (d) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })

const ESTADO_BG = {
  en_cola: 'bg-gray-400', diseno_stl: 'bg-blue-400',
  imprimiendo: 'bg-amber-500', acabado: 'bg-purple-400', terminado: 'bg-green-400',
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-[#e2e6ea] rounded ${className}`} />
}

function PctBadge({ actual, anterior }) {
  if (!anterior) return null
  const pct = Math.round(((actual - anterior) / anterior) * 100)
  const up  = pct >= 0
  return (
    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {up ? '+' : ''}{pct}% vs mes ant.
    </span>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { metrics, alertas, cobrosProximos, ultimosMovimientos, pedidosPorEstado, loading } = useDashboard()

  const metricDefs = [
    {
      label: 'Cobrado este mes', value: cop(metrics.cobradoMes),
      sub: metrics.cobradoMesAnterior > 0
        ? <PctBadge actual={metrics.cobradoMes} anterior={metrics.cobradoMesAnterior} />
        : 'Pagos recibidos',
      icon: DollarSign,
    },
    { label: 'Por cobrar', value: cop(metrics.porCobrar), sub: 'Cobros pendientes', icon: Clock },
    { label: 'Leads activos', value: String(metrics.leadsActivos), sub: 'En pipeline', icon: TrendingUp },
    { label: 'En producción', value: String(metrics.enProduccion), sub: 'Pedidos activos', icon: Package },
  ]

  const totalAlertas = alertas.stockBajo.length + alertas.cobrosVencidos.length + alertas.cotizPendientes.length

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-600">Dashboard</h1>
        <p className="text-sm text-[#8a9ab0] mt-0.5">Bienvenido de nuevo, Dimas</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white border border-[#e2e6ea] rounded-xl p-4 flex flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-28 mt-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))
          : metricDefs.map(m => <MetricCard key={m.label} {...m} />)
        }
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Alertas */}
        <Card>
          <h2 className="text-sm font-semibold text-navy-600 mb-3 flex items-center gap-2">
            Alertas
            {totalAlertas > 0 && <Badge variant="red">{totalAlertas}</Badge>}
          </h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : totalAlertas === 0 ? (
            <p className="text-sm text-[#8a9ab0]">Sin alertas activas. Todo en orden. ✓</p>
          ) : (
            <div className="flex flex-col gap-2">
              {alertas.cobrosVencidos.map(c => (
                <button key={c.id} onClick={() => navigate('/cobros')}
                  className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg text-left hover:border-red-300 transition-colors w-full">
                  <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-red-800 truncate">Cobro vencido — {c.cliente_nombre}</p>
                    <p className="text-xs text-red-600 mt-0.5">{cop(c.monto)} · Venció {dateStr(c.fecha_vencimiento)}</p>
                  </div>
                  <ChevronRight size={14} className="text-red-400 mt-0.5 shrink-0" />
                </button>
              ))}
              {alertas.cotizPendientes.map(c => (
                <button key={c.id} onClick={() => navigate('/cotizaciones')}
                  className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-left hover:border-blue-300 transition-colors w-full">
                  <FileText size={15} className="text-blue-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-blue-800 truncate">Cotización sin respuesta — {c.cliente_nombre}</p>
                    <p className="text-xs text-blue-600 mt-0.5">Enviada el {dateStr(c.fecha_emision)} · más de 15 días</p>
                  </div>
                  <ChevronRight size={14} className="text-blue-400 mt-0.5 shrink-0" />
                </button>
              ))}
              {alertas.stockBajo.map(s => (
                <button key={s.nombre} onClick={() => navigate('/inventario')}
                  className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-left hover:border-amber-300 transition-colors w-full">
                  <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-amber-800">Stock bajo — {s.nombre}</p>
                    <p className="text-xs text-amber-600 mt-0.5">Actual: {s.stock_actual} · Mínimo: {s.stock_minimo}</p>
                  </div>
                  <ChevronRight size={14} className="text-amber-400 mt-0.5 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Cobros próximos */}
        <Card>
          <h2 className="text-sm font-semibold text-navy-600 mb-3">Cobros próximos a vencer</h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : cobrosProximos.length === 0 ? (
            <p className="text-sm text-[#8a9ab0]">Sin cobros pendientes próximos.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[#f0f2f5]">
              {cobrosProximos.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-navy-600 truncate">{c.cliente_nombre}</p>
                    <p className="text-xs text-[#8a9ab0]">Vence {dateStr(c.fecha_vencimiento)}</p>
                  </div>
                  <span className="text-sm font-semibold text-navy-600 shrink-0">{cop(c.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Estado producción */}
        <Card>
          <h2 className="text-sm font-semibold text-navy-600 mb-3 flex items-center gap-2">
            Producción en curso
            {!loading && pedidosPorEstado.length > 0 && (
              <Badge variant="blue">{pedidosPorEstado.reduce((s, e) => s + e.count, 0)}</Badge>
            )}
          </h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : pedidosPorEstado.length === 0 ? (
            <p className="text-sm text-[#8a9ab0]">No hay pedidos activos en producción.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pedidosPorEstado.map(e => {
                const total = pedidosPorEstado.reduce((s, x) => s + x.count, 0)
                const pct   = total > 0 ? Math.round((e.count / total) * 100) : 0
                return (
                  <button key={e.id} onClick={() => navigate('/produccion')}
                    className="flex items-center gap-3 hover:bg-[#f8f9fb] rounded-lg px-1 py-1 transition-colors w-full text-left">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${ESTADO_BG[e.id] || 'bg-gray-400'}`} />
                    <span className="text-sm text-navy-600 flex-1">{e.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 bg-[#f0f2f5] rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${ESTADO_BG[e.id] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-navy-600 w-4 text-right">{e.count}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        {/* Últimos movimientos */}
        <Card>
          <h2 className="text-sm font-semibold text-navy-600 mb-3">Últimos movimientos</h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : ultimosMovimientos.length === 0 ? (
            <p className="text-sm text-[#8a9ab0]">Sin movimientos registrados.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[#f0f2f5]">
              {ultimosMovimientos.map((m, i) => {
                const esIngreso = m.tipo === 'ingreso'
                return (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1.5 rounded-full shrink-0 ${esIngreso ? 'bg-green-100' : 'bg-red-100'}`}>
                        {esIngreso
                          ? <ArrowUpRight size={13} className="text-green-600" />
                          : <ArrowDownLeft size={13} className="text-red-600" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-navy-600 truncate">{m.descripcion}</p>
                        <p className="text-xs text-[#8a9ab0]">{dateStr(m.fecha)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ml-3 ${esIngreso ? 'text-green-700' : 'text-red-600'}`}>
                      {esIngreso ? '+' : '-'}{cop(m.monto)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
