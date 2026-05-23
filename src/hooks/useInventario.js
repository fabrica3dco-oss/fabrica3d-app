import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export function useInventario() {
  const [items,      setItems]      = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading,    setLoading]    = useState(true)

  const fetchCategorias = useCallback(async () => {
    const { data } = await supabase
      .from('categorias_inventario')
      .select('*')
      .order('orden')
    setCategorias(data || [])
  }, [])

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

  useEffect(() => {
    fetchCategorias()
    fetchItems()
  }, [fetchCategorias, fetchItems])

  // ── Items CRUD ─────────────────────────────────────────────────────────────
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

  // ── Categorías CRUD ────────────────────────────────────────────────────────
  async function crearCategoria(nombre) {
    const trimmed = nombre.trim().toLowerCase().replace(/\s+/g, '_')
    if (!trimmed) return false
    const { error } = await supabase
      .from('categorias_inventario')
      .insert([{ nombre: trimmed, emoji: '', orden: categorias.length + 1 }])
    if (error) {
      if (error.code === '23505') toast.error('Ya existe una categoría con ese nombre')
      else toast.error('Error al crear categoría')
      return false
    }
    toast.success('Categoría creada')
    fetchCategorias()
    return true
  }

  async function renombrarCategoria(nombreActual, nuevoNombre) {
    const trimmed = nuevoNombre.trim().toLowerCase().replace(/\s+/g, '_')
    if (!trimmed || trimmed === nombreActual) return true
    const { error: e1 } = await supabase
      .from('inventario')
      .update({ categoria: trimmed })
      .eq('categoria', nombreActual)
    if (e1) { toast.error('Error actualizando ítems'); return false }
    const { error: e2 } = await supabase
      .from('categorias_inventario')
      .update({ nombre: trimmed })
      .eq('nombre', nombreActual)
    if (e2) { toast.error('Error renombrando categoría'); return false }
    toast.success('Categoría renombrada')
    fetchCategorias()
    fetchItems()
    return true
  }

  async function eliminarCategoria(nombre) {
    const enUso = items.some(i => i.categoria === nombre)
    if (enUso) {
      toast.error('Mueve o elimina los ítems de esta categoría primero')
      return false
    }
    const { error } = await supabase
      .from('categorias_inventario')
      .delete()
      .eq('nombre', nombre)
    if (error) { toast.error('Error al eliminar categoría'); return false }
    toast.success('Categoría eliminada')
    fetchCategorias()
    return true
  }

  return {
    items, categorias, loading,
    crearItem, actualizarItem, eliminarItem, ajustarStock,
    crearCategoria, renombrarCategoria, eliminarCategoria,
  }
}
