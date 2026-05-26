import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export function useMateriales() {
  const [compras,  setCompras]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [sinTabla, setSinTabla] = useState(false)

  const fetchCompras = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('compras_materiales').select('*').order('fecha', { ascending: false })
    if (error) {
      // 42P01 = table doesn't exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) setSinTabla(true)
      else toast.error('Error cargando materiales')
    } else {
      setCompras(data || [])
      setSinTabla(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchCompras() }, [fetchCompras])

  async function crearCompra(datos) {
    const { error } = await supabase.from('compras_materiales').insert([datos])
    if (error) { toast.error('Error al registrar compra'); return false }
    toast.success('Compra registrada'); fetchCompras(); return true
  }
  async function actualizarCompra(id, datos) {
    const { error } = await supabase.from('compras_materiales').update(datos).eq('id', id)
    if (error) { toast.error('Error al actualizar'); return false }
    toast.success('Actualizado'); fetchCompras(); return true
  }
  async function eliminarCompra(id) {
    const { error } = await supabase.from('compras_materiales').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return false }
    toast.success('Eliminado'); fetchCompras(); return true
  }

  return { compras, loading, sinTabla, crearCompra, actualizarCompra, eliminarCompra }
}
