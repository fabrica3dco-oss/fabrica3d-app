import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Package, Plus } from 'lucide-react'

const estados = ['En cola', 'Imprimiendo', 'Terminado', 'Entregado']

export default function Produccion() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Producción</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Pedidos y estado de impresión</p>
        </div>
        <Button><Plus size={16} /> Nuevo pedido</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {estados.map(e => (
          <div key={e} className="bg-[#f8f9fb] rounded-xl p-3">
            <p className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-3">{e}</p>
            <p className="text-xs text-[#8a9ab0] text-center py-4">Sin pedidos</p>
          </div>
        ))}
      </div>
    </div>
  )
}
