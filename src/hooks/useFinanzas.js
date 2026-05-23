import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export function useFinanzas() {
  const [gastos,  setGastos]  = useState([])
  const [cobros,  setCobros]  = useState([])
  const [loading, setLoading] = useState(true)
  const [mesFiltro, setMesFiltro] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const fetchGastos = useCallback(async () => {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false })
    if (error) toast.error('Error cargando gastos')
    else setGastos(data || [])
  }, [])

  const fetchCobros = useCallback(async () => {
    const { data, error } = await supabase
      .from('cobros')
      .select('id, monto, estado, fecha_emision, cliente_nombre, concepto')
      .eq('estado', 'pagado')
    if (error) toast.error('Error cargando ingresos')
    else setCobros(data || [])
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchGastos(), fetchCobros()]).finally(() => setLoading(false))
  }, [fetchGastos, fetchCobros])

  const gastosMes = useMemo(
    () => gastos.filter(g => g.fecha?.startsWith(mesFiltro)),
    [gastos, mesFiltro]
  )
  const cobrosMes = useMemo(
    () => cobros.filter(c => c.fecha_emision?.startsWith(mesFiltro)),
    [cobros, mesFiltro]
  )
  const totalGastos   = useMemo(() => gastosMes.reduce((s, g) => s + Number(g.monto), 0), [gastosMes])
  const totalIngresos = useMemo(() => cobrosMes.reduce((s, c) => s + Number(c.monto), 0), [cobrosMes])
  const utilidad      = totalIngresos - totalGastos

  async function crearGasto(datos) {
    const { error } = await supabase.from('gastos').insert([datos])
    if (error) { toast.error('Error al registrar gasto'); return false }
    toast.success('Gasto registrado')
    fetchGastos()
    return true
  }

  async function actualizarGasto(id, datos) {
    const { error } = await supabase.from('gastos').update(datos).eq('id', id)
    if (error) { toast.error('Error al actualizar'); return false }
    toast.success('Gasto actualizado')
    fetchGastos()
    return true
  }

  async function eliminarGasto(id) {
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return false }
    toast.success('Gasto eliminado')
    fetchGastos()
    return true
  }

  return {
    gastos, cobros, loading,
    gastosMes, cobrosMes,
    totalGastos, totalIngresos, utilidad,
    mesFiltro, setMesFiltro,
    crearGasto, actualizarGasto, eliminarGasto,
  }
}
