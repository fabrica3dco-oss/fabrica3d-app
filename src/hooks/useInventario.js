import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export function useInventario() {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('inventario')
      .select('*')
      .order('categoria')
      .order('nombre')
    if (error) toast.error('Error cargando inventario')
    else setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function crearItem(datos) {
    const { error } = await supabase.from('inventario').insert([datos])
    if (error) { toast.error('Error al agregar ítem'); return false }
    toast.success('Ítem agregado')
    fetchItems()
    return true
  }

  async function actualizarItem(id, datos) {
    const { error } = await supabase.from('inventario').update(datos).eq('id', id)
    if (error) { toast.error('Error al actualizar'); return false }
    toast.success('Actualizado')
    fetchItems()
    return true
  }

  async function eliminarItem(id) {
    const { error } = await supabase.from('inventario').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return false }
    toast.success('Ítem eliminado')
    fetchItems()
    return true
  }

  async function ajustarStock(id, delta) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const nueva = Math.max(0, Number(item.stock_actual) + delta)
    return actualizarItem(id, { stock_actual: nueva })
  }

  return { items, loading, crearItem, actualizarItem, eliminarItem, ajustarStock, fetchItems }
}
