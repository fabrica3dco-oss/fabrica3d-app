import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Error cargando clientes')
    else setClientes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  async function crearCliente(datos) {
    const { error } = await supabase.from('clientes').insert([datos])
    if (error) { toast.error('Error al crear cliente'); return false }
    toast.success('Cliente creado')
    fetchClientes()
    return true
  }

  async function actualizarCliente(id, datos) {
    const { error } = await supabase.from('clientes').update(datos).eq('id', id)
    if (error) { toast.error('Error al actualizar cliente'); return false }
    toast.success('Cliente actualizado')
    fetchClientes()
    return true
  }

  async function eliminarCliente(id) {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar cliente'); return false }
    toast.success('Cliente eliminado')
    fetchClientes()
    return true
  }

  return { clientes, loading, crearCliente, actualizarCliente, eliminarCliente, refetch: fetchClientes }
}
