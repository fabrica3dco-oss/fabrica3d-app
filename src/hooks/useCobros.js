import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export function useCobros() {
  const [cobros, setCobros] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCobros = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cobros')
      .select('*')
      .order('numero', { ascending: false })
    if (error) toast.error('Error cargando cobros')
    else setCobros(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCobros() }, [fetchCobros])

  async function crearCobro(datos) {
    const { error } = await supabase.from('cobros').insert([datos])
    if (error) { toast.error('Error al crear cobro'); return false }
    toast.success('Cobro creado')
    fetchCobros()
    return true
  }

  async function actualizarCobro(id, datos) {
    const { error } = await supabase.from('cobros').update(datos).eq('id', id)
    if (error) { toast.error('Error al actualizar cobro'); return false }
    toast.success('Cobro actualizado')
    fetchCobros()
    return true
  }

  async function marcarPagado(id, metodo_pago) {
    const { error } = await supabase
      .from('cobros')
      .update({ estado: 'pagado', metodo_pago: metodo_pago || null })
      .eq('id', id)
    if (error) { toast.error('Error al marcar como pagado'); return false }
    toast.success('¡Cobro marcado como pagado!')
    fetchCobros()
    return true
  }

  async function eliminarCobro(id) {
    const { error } = await supabase.from('cobros').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar cobro'); return false }
    toast.success('Cobro eliminado')
    fetchCobros()
    return true
  }

  return { cobros, loading, crearCobro, actualizarCobro, marcarPagado, eliminarCobro }
}
