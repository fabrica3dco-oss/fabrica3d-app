import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { TrendingUp, Plus } from 'lucide-react'

const columns = ['Prospecto', 'Contactado', 'Cotizando', 'Cerrado']

export default function Leads() {
  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Pipeline de Leads</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Seguimiento de oportunidades</p>
        </div>
        <Button><Plus size={16} /> Nuevo lead</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {columns.map(col => (
          <div key={col} className="bg-[#f8f9fb] rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">{col}</span>
              <Badge variant="gray">0</Badge>
            </div>
            <p className="text-xs text-[#8a9ab0] text-center py-4">Sin leads</p>
          </div>
        ))}
      </div>
    </div>
  )
}
