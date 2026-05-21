import { DollarSign, Clock, TrendingUp, Package, AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useDashboard } from '../hooks/useDashboard'

const cop = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
const dateStr = (d) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-[#e2e6ea] rounded ${className}`} />
}

export default function Dashboard() {
  const { metrics, alertas, cobrosProximos, ultimosMovimientos, loading } = useDashboard()

  const metricDefs = [
    { label: 'Cobrado este mes', value: cop(metrics.cobradoMes), sub: 'Pagos recibidos', icon: DollarSign },
    { label: 'Por cobrar', value: cop(metrics.porCobrar), sub: 'Cobros pendientes', icon: Clock },
    { label: 'Leads activos', value: String(metrics.leadsActivos), sub: 'En pipeline', icon: TrendingUp },
    { label: 'En producción', value: String(metrics.enProduccion), sub: 'Pedidos activos', icon: Package },
  ]

  const totalAlertas = alertas.stockBajo.length + alertas.cobrosVencidos.length

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-600">Dashboard</h1>
        <p className="text-sm text-[#8a9ab0] mt-0.5">Bienvenido de nuevo, Dimas</p>
      </div>

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

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Alertas */}
        <Card>
          <h2 className="text-sm font-semibold text-navy-600 mb-3 flex items-center gap-2">
            Alertas
            {totalAlertas > 0 && (
              <Badge variant="red">{totalAlertas}</Badge>
            )}
          </h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : totalAlertas === 0 ? (
            <p className="text-sm text-[#8a9ab0]">Sin alertas activas. Todo en orden.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {alertas.cobrosVencidos.map(c => (
                <div key={c.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-red-800 truncate">Cobro vencido — {c.cliente_nombre}</p>
                    <p className="text-xs text-red-600 mt-0.5">{cop(c.monto)} · Venció {dateStr(c.fecha_vencimiento)}</p>
                  </div>
                </div>
              ))}
              {alertas.stockBajo.map(s => (
                <div key={s.nombre} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Stock bajo — {s.nombre}</p>
                    <p className="text-xs text-amber-600 mt-0.5">Actual: {s.stock_actual} · Mínimo: {s.stock_minimo}</p>
                  </div>
                </div>
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

        {/* Últimos movimientos */}
        <Card className="lg:col-span-2">
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
