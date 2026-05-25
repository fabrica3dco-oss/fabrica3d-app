import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

export function useFinanzas() {
  const [gastos,  setGastos]  = useState([])
  const [cobros,  setCobros]  = useState([])
  const [loading, setLoading] = useState(true)

  const [anio, setAnio] = useState(() => new Date().getFullYear())
  const [mes,  setMes]  = useState(() => new Date().getMonth() + 1)

  // ── Fetch filtrado por año ────────────────────────────────────────────────
  const fetchGastos = useCallback(async () => {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .gte('fecha', `${anio}-01-01`)
      .lte('fecha', `${anio}-12-31`)
      .order('fecha', { ascending: false })
    if (error) toast.error('Error cargando gastos')
    else setGastos(data || [])
  }, [anio])

  const fetchCobros = useCallback(async () => {
    const { data, error } = await supabase
      .from('cobros')
      .select('id, monto, estado, fecha_emision, cliente_nombre, concepto')
      .eq('estado', 'pagado')
      .gte('fecha_emision', `${anio}-01-01`)
      .lte('fecha_emision', `${anio}-12-31`)
    if (error) toast.error('Error cargando ingresos')
    else setCobros(data || [])
  }, [anio])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchGastos(), fetchCobros()]).finally(() => setLoading(false))
  }, [fetchGastos, fetchCobros])

  // ── Vista del mes seleccionado ────────────────────────────────────────────
  const mesPad    = String(mes).padStart(2, '0')
  const mesFiltro = `${anio}-${mesPad}`

  const gastosMes     = useMemo(() => gastos.filter(g => g.fecha?.startsWith(mesFiltro)),         [gastos,  mesFiltro])
  const cobrosMes     = useMemo(() => cobros.filter(c => c.fecha_emision?.startsWith(mesFiltro)), [cobros,  mesFiltro])
  const totalGastos   = useMemo(() => gastosMes.reduce((s, g) => s + Number(g.monto), 0),         [gastosMes])
  const totalIngresos = useMemo(() => cobrosMes.reduce((s, c) => s + Number(c.monto), 0),         [cobrosMes])
  const utilidad      = totalIngresos - totalGastos

  // ── Consolidado anual (12 meses) ──────────────────────────────────────────
  const consolidado = useMemo(() =>
    MESES.map((nombre, i) => {
      const m      = String(i + 1).padStart(2, '0')
      const prefix = `${anio}-${m}`
      const ing    = cobros.filter(c => c.fecha_emision?.startsWith(prefix)).reduce((s, c) => s + Number(c.monto), 0)
      const gas    = gastos.filter(g => g.fecha?.startsWith(prefix)).reduce((s, g) => s + Number(g.monto), 0)
      const util   = ing - gas
      return {
        nombre,
        mesNum:    i + 1,
        ingresos:  ing,
        gastos:    gas,
        utilidad:  util,
        margen:    ing > 0 ? Math.round((util / ing) * 100) : null,
        tieneData: ing > 0 || gas > 0,
      }
    }),
    [cobros, gastos, anio]
  )

  const totalAnual = useMemo(() => {
    const ing  = consolidado.reduce((s, m) => s + m.ingresos, 0)
    const gas  = consolidado.reduce((s, m) => s + m.gastos,   0)
    const util = ing - gas
    return {
      ingresos: ing,
      gastos:   gas,
      utilidad: util,
      margen:   ing > 0 ? Math.round((util / ing) * 100) : null,
    }
  }, [consolidado])

  // ── CRUD gastos ───────────────────────────────────────────────────────────
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
    anio, setAnio,
    mes,  setMes,
    mesFiltro,
    gastosMes, cobrosMes,
    totalGastos, totalIngresos, utilidad,
    consolidado, totalAnual,
    crearGasto, actualizarGasto, eliminarGasto,
  }
}
