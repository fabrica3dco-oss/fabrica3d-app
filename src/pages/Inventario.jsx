import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Archive, AlertTriangle } from 'lucide-react'

const initialStock = [
  { nombre: 'Filamento PLA Negro 1kg', unidad: 'g', actual: 800, minimo: 200, costo: 75 },
  { nombre: 'Filamento PLA Blanco 1kg', unidad: 'g', actual: 600, minimo: 200, costo: 75 },
  { nombre: 'Filamento PETG 1kg', unidad: 'g', actual: 400, minimo: 200, costo: 90 },
  { nombre: 'Chips NFC NTAG215', unidad: 'u', actual: 45, minimo: 20, costo: 800 },
  { nombre: 'Stickers personalizados', unidad: 'u', actual: 60, minimo: 30, costo: 500 },
  { nombre: 'Bolsas de empaque', unidad: 'u', actual: 35, minimo: 20, costo: 200 },
  { nombre: 'Aros para llaveros', unidad: 'u', actual: 120, minimo: 50, costo: 100 },
]

export default function Inventario() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Inventario</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Control de insumos y materiales</p>
        </div>
        <Button variant="secondary">+ Agregar insumo</Button>
      </div>

      <div className="flex flex-col gap-3">
        {initialStock.map(item => {
          const pct = Math.min((item.actual / (item.minimo * 3)) * 100, 100)
          const bajo = item.actual <= item.minimo
          return (
            <Card key={item.nombre} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-navy-600 truncate">{item.nombre}</p>
                    {bajo && <Badge variant="red">Stock bajo</Badge>}
                  </div>
                  <p className="text-xs text-[#8a9ab0] mt-0.5">
                    {item.actual.toLocaleString()} {item.unidad} disponibles · mín {item.minimo} {item.unidad} · ${item.costo.toLocaleString()} COP/{item.unidad}
                  </p>
                </div>
                <a
                  href={`https://wa.me/`}
                  className="text-xs text-accent font-medium hover:underline shrink-0"
                  target="_blank" rel="noreferrer"
                >
                  Pedir
                </a>
              </div>
              <div className="w-full bg-[#f0f2f5] rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${bajo ? 'bg-red-400' : 'bg-accent'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
