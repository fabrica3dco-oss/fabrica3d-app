import { DollarSign, Clock, TrendingUp, Package, AlertTriangle } from 'lucide-react'
import MetricCard from '../components/ui/MetricCard'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

const metrics = [
  { label: 'Cobrado este mes', value: '$0 COP', sub: 'Actualiza al conectar Supabase', icon: DollarSign },
  { label: 'Por cobrar', value: '$0 COP', sub: 'Cobros pendientes', icon: Clock },
  { label: 'Leads activos', value: '0', sub: 'En pipeline', icon: TrendingUp },
  { label: 'En producción', value: '0', sub: 'Pedidos activos', icon: Package },
]

export default function Dashboard() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-600">Dashboard</h1>
        <p className="text-sm text-[#8a9ab0] mt-0.5">Bienvenido de nuevo, Dimas</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {metrics.map(m => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold text-navy-600 mb-3">Alertas</h2>
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Conecta Supabase</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Agrega tus credenciales en <code className="bg-amber-100 px-1 rounded text-xs">.env.local</code> para ver datos reales.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-navy-600 mb-3">Cobros próximos a vencer</h2>
          <p className="text-sm text-[#8a9ab0]">Sin cobros pendientes por ahora.</p>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-navy-600 mb-3">Últimos movimientos</h2>
          <p className="text-sm text-[#8a9ab0]">Los movimientos aparecerán aquí al conectar Supabase.</p>
        </Card>
      </div>
    </div>
  )
}
