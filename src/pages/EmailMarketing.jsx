import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Mail, Plus } from 'lucide-react'

export default function EmailMarketing() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Email Marketing</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Contactos y campañas</p>
        </div>
        <Button><Plus size={16} /> Nueva campaña</Button>
      </div>
      <Card>
        <div className="flex flex-col items-center py-10 text-center gap-3">
          <Mail size={40} className="text-[#e2e6ea]" />
          <p className="text-sm font-medium text-navy-600">Sin campañas aún</p>
          <p className="text-xs text-[#8a9ab0]">Crea contactos y campañas para prospectar nuevos clientes B2B.</p>
        </div>
      </Card>
    </div>
  )
}
