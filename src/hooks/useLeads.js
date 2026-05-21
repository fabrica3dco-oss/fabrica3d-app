import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export function useLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Error cargando leads')
    else setLeads(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  async function crearLead(datos) {
    const { error } = await supabase.from('leads').insert([datos])
    if (error) { toast.error('Error al crear lead'); return false }
    toast.success('Lead creado')
    fetchLeads()
    return true
  }

  async function actualizarLead(id, datos) {
    const { error } = await supabase.from('leads').update(datos).eq('id', id)
    if (error) { toast.error('Error al actualizar'); return false }
    fetchLeads()
    return true
  }

  async function moverEtapa(id, etapa) {
    const { error } = await supabase.from('leads').update({ etapa }).eq('id', id)
    if (error) toast.error('Error al mover lead')
    else setLeads(prev => prev.map(l => l.id === id ? { ...l, etapa } : l))
  }

  async function eliminarLead(id) {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar lead'); return false }
    toast.success('Lead eliminado')
    fetchLeads()
    return true
  }

  return { leads, loading, crearLead, actualizarLead, moverEtapa, eliminarLead, refetch: fetchLeads }
}
