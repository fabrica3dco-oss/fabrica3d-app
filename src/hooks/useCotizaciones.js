import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'
import { useRealtimeRefresh } from './useRealtimeRefresh'

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCotizaciones = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*')
      .order('numero', { ascending: false })
    if (error) toast.error('Error cargando cotizaciones')
    else setCotizaciones(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCotizaciones() }, [fetchCotizaciones])

  // Cambios desde cualquier otra sección
  useRealtimeRefresh('cotizaciones', fetchCotizaciones)

  async function crearCotizacion(datos) {
    const { error } = await supabase.from('cotizaciones').insert([datos])
    if (error) { toast.error('Error al crear cotización'); return false }
    toast.success('Cotización creada')
    fetchCotizaciones()
    return true
  }

  async function actualizarCotizacion(id, datos) {
    const { error } = await supabase.from('cotizaciones').update(datos).eq('id', id)
    if (error) { toast.error('Error al actualizar cotización'); return false }
    toast.success('Cotización actualizada')
    fetchCotizaciones()
    return true
  }

  async function eliminarCotizacion(id) {
    const { error } = await supabase.from('cotizaciones').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar cotización'); return false }
    toast.success('Cotización eliminada')
    fetchCotizaciones()
    return true
  }

  return { cotizaciones, loading, crearCotizacion, actualizarCotizacion, eliminarCotizacion, refetch: fetchCotizaciones }
}
