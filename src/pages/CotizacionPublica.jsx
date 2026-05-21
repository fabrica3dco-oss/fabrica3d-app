import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import CotizacionVista from '../components/CotizacionVista'
import { supabase } from '../services/supabase'
import { generarPdfCotizacion } from '../utils/pdfCotizacion'

export default function CotizacionPublica() {
  const { id } = useParams()
  const [cotizacion, setCotizacion] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)

  useEffect(() => {
    supabase.from('cotizaciones').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) setError(true)
        else setCotizacion(data)
        setLoading(false)
      })
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
      <div className="animate-pulse text-[#8a9ab0] text-sm">Cargando cotización...</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center gap-3">
      <p className="text-lg font-semibold text-navy-600">Cotización no encontrada</p>
      <p className="text-sm text-[#8a9ab0]">El link puede haber expirado o ser incorrecto.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f0f2f5] py-6 px-4">
      {/* Barra superior */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between">
        <p className="text-xs text-[#8a9ab0]">
          Cotización #{String(cotizacion.numero).padStart(4, '0')} · Fabrica3D
        </p>
        <button
          onClick={() => generarPdfCotizacion(cotizacion)}
          className="flex items-center gap-2 bg-[#142236] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1e3450] transition-colors"
        >
          <Download size={14} /> Descargar PDF
        </button>
      </div>

      {/* Vista de la cotización */}
      <div className="max-w-2xl mx-auto shadow-lg rounded-xl overflow-hidden">
        <CotizacionVista cotizacion={cotizacion} />
      </div>

      <p className="text-center text-xs text-[#8a9ab0] mt-6">
        Generado por Fabrica3D Business OS
      </p>
    </div>
  )
}
