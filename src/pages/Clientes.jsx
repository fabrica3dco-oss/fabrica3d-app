import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Users, Plus } from 'lucide-react'

export default function Clientes() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Clientes</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Gestión de clientes activos</p>
        </div>
        <Button><Plus size={16} /> Nuevo cliente</Button>
      </div>
      <Card>
        <div className="flex flex-col items-center py-10 text-center gap-3">
          <Users size={40} className="text-[#e2e6ea]" />
          <p className="text-sm font-medium text-navy-600">Sin clientes aún</p>
          <p className="text-xs text-[#8a9ab0]">Los clientes aparecerán aquí al conectar Supabase.</p>
        </div>
      </Card>
    </div>
  )
}
