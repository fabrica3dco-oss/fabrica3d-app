import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { UsersRound } from 'lucide-react'

const equipo = [
  { nombre: 'Dimas Domenech', rol: 'Admin / Fundador', color: 'blue' },
  { nombre: 'Andrés', rol: 'Vendedor · 25% comisión', color: 'green' },
]

export default function Equipo() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-600">Equipo</h1>
        <p className="text-sm text-[#8a9ab0] mt-0.5">Miembros y roles de Fabrica3D</p>
      </div>
      <div className="flex flex-col gap-3">
        {equipo.map(m => (
          <Card key={m.nombre} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-navy-600">{m.nombre[0]}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-navy-600">{m.nombre}</p>
              <p className="text-xs text-[#8a9ab0]">{m.rol}</p>
            </div>
            <Badge variant={m.color}>{m.rol.split(' ')[0]}</Badge>
          </Card>
        ))}
      </div>
    </div>
  )
}
