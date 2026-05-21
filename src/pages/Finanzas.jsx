import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { BarChart2, Upload } from 'lucide-react'

export default function Finanzas() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Finanzas</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Ingresos, gastos y extractos</p>
        </div>
        <Button><Upload size={16} /> Subir extracto</Button>
      </div>
      <Card>
        <div className="flex flex-col items-center py-10 text-center gap-3">
          <BarChart2 size={40} className="text-[#e2e6ea]" />
          <p className="text-sm font-medium text-navy-600">Procesador de extractos con IA</p>
          <p className="text-xs text-[#8a9ab0] max-w-xs">
            Sube el PDF del extracto Nu Colombia y la IA categoriza cada transacción automáticamente.
          </p>
          <Button variant="secondary"><Upload size={14} /> Subir PDF</Button>
        </div>
      </Card>
    </div>
  )
}
