import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'
import { useRealtimeRefresh } from './useRealtimeRefresh'

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

  // Cobros auto-crea pedidos; Producción los mueve de estado directo en Supabase
  useRealtimeRefresh('pedidos', fetchPedidos)

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
    const pedido = pedidos.find(p => p.id === id)
    // Agregar al historial de estados para tracking de tiempos
    const historialActual = pedido?.historial_estados || []
    const nuevoHistorial  = [...historialActual, { estado, fecha: new Date().toISOString() }]
    const { error } = await supabase
      .from('pedidos')
      .update({ estado, historial_estados: nuevoHistorial })
      .eq('id', id)
    if (error) {
      // Si falla por columna inexistente, intentar sin historial
      const { error: e2 } = await supabase.from('pedidos').update({ estado }).eq('id', id)
      if (e2) { toast.error('Error al mover pedido'); return }
    }
    setPedidos(prev => prev.map(p =>
      p.id === id ? { ...p, estado, historial_estados: nuevoHistorial } : p
    ))
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
