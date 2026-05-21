import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export function usePedidos() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPedidos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Error cargando pedidos')
    else setPedidos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPedidos() }, [fetchPedidos])

  async function crearPedido(datos) {
    const { error } = await supabase.from('pedidos').insert([datos])
    if (error) { toast.error('Error al crear pedido'); return false }
    toast.success('Pedido creado')
    fetchPedidos()
    return true
  }

  async function actualizarPedido(id, datos) {
    const { error } = await supabase.from('pedidos').update(datos).eq('id', id)
    if (error) { toast.error('Error al actualizar pedido'); return false }
    toast.success('Pedido actualizado')
    fetchPedidos()
    return true
  }

  async function moverEstado(id, estado) {
    const { error } = await supabase.from('pedidos').update({ estado }).eq('id', id)
    if (error) toast.error('Error al mover pedido')
    else setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado } : p))
  }

  async function eliminarPedido(id) {
    const { error } = await supabase.from('pedidos').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar pedido'); return false }
    toast.success('Pedido eliminado')
    fetchPedidos()
    return true
  }

  return { pedidos, loading, crearPedido, actualizarPedido, moverEstado, eliminarPedido }
}
