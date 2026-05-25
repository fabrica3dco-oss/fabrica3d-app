import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function getMesesEnRango(desde, hasta) {
  const meses = []
  let [curY, curM] = desde.split('-').map(Number)
  const [endY, endM] = hasta.split('-').map(Number)
  while (curY < endY || (curY === endY && curM <= endM)) {
    meses.push({ anio: curY, mes: curM, prefix: `${curY}-${String(curM).padStart(2, '0')}` })
    curM++
    if (curM > 12) { curM = 1; curY++ }
  }
  return meses
}

export function useFinanzas() {
  const curY = new Date().getFullYear()
  const curM = new Date().getMonth() + 1

  // ── Detail tabs (Ingresos / Gastos) ───────────────────────────────────────
  const [gastos,  setGastos]  = useState([])
  const [cobros,  setCobros]  = useState([])
  const [loading, setLoading] = useState(true)
  const [anio, setAnio] = useState(curY)
  const [mes,  setMes]  = useState(curM)

  const fetchGastos = useCallback(async () => {
    const { data, error } = await supabase
      .from('gastos').select('*')
      .gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`)
      .order('fecha', { ascending: false })
    if (error) toast.error('Error cargando gastos')
    else setGastos(data || [])
  }, [anio])

  const fetchCobros = useCallback(async () => {
    const { data, error } = await supabase
      .from('cobros').select('id, monto, estado, fecha_emision, cliente_nombre, concepto')
      .eq('estado', 'pagado')
      .gte('fecha_emision', `${anio}-01-01`).lte('fecha_emision', `${anio}-12-31`)
    if (error) toast.error('Error cargando ingresos')
    else setCobros(data || [])
  }, [anio])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchGastos(), fetchCobros()]).finally(() => setLoading(false))
  }, [fetchGastos, fetchCobros])

  // ── Resumen tab (rango personalizado) ─────────────────────────────────────
  const [gastosRes,  setGastosRes]  = useState([])
  const [cobrosRes,  setCobrosRes]  = useState([])
  const [loadingRes, setLoadingRes] = useState(true)
  const [resDesde,   setResDesde]   = useState(`${curY}-01-01`)
  const [resHasta,   setResHasta]   = useState(`${curY}-12-31`)
  const [resFiltro,  setResFiltro]  = useState({ desde: `${curY}-01-01`, hasta: `${curY}-12-31` })

  const fetchResumen = useCallback(async () => {
    setLoadingRes(true)
    const [{ data: g, error: eg }, { data: c, error: ec }] = await Promise.all([
      supabase.from('gastos').select('*')
        .gte('fecha', resFiltro.desde).lte('fecha', resFiltro.hasta),
      supabase.from('cobros').select('id, monto, estado, fecha_emision, cliente_nombre, concepto, receta_json')
        .eq('estado', 'pagado')
        .gte('fecha_emision', resFiltro.desde).lte('fecha_emision', resFiltro.hasta),
    ])
    if (!eg) setGastosRes(g || [])
    if (!ec) setCobrosRes(c || [])
    setLoadingRes(false)
  }, [resFiltro])

  useEffect(() => { fetchResumen() }, [fetchResumen])

  function aplicarFiltroResumen() {
    if (!resDesde || !resHasta) { toast.error('Selecciona las fechas'); return }
    if (resDesde > resHasta) { toast.error('La fecha inicio debe ser antes que la fecha fin'); return }
    setResFiltro({ desde: resDesde, hasta: resHasta })
  }

  // ── Saldos cuenta (extracto manual) ───────────────────────────────────────
  const [saldos,      setSaldos]      = useState([])
  const [loadingSald, setLoadingSald] = useState(false)

  const fetchSaldos = useCallback(async () => {
    setLoadingSald(true)
    const { data, error } = await supabase
      .from('saldos_cuenta').select('*').order('mes', { ascending: false })
    if (!error) setSaldos(data || [])
    setLoadingSald(false)
  }, [])

  useEffect(() => { fetchSaldos() }, [fetchSaldos])

  async function guardarSaldo({ id, mes: mesStr, saldo, notas }) {
    const payload = { mes: mesStr, saldo: Number(saldo), notas: notas || null }
    const { error } = id
      ? await supabase.from('saldos_cuenta').update(payload).eq('id', id)
      : await supabase.from('saldos_cuenta').insert([payload])
    if (error) { toast.error(error.message || 'Error al guardar saldo'); return false }
    toast.success('Saldo registrado'); fetchSaldos(); return true
  }

  async function eliminarSaldo(id) {
    const { error } = await supabase.from('saldos_cuenta').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return false }
    toast.success('Eliminado'); fetchSaldos(); return true
  }

  // ── Consolidado (resumen rango) ────────────────────────────────────────────
  const mesesRango = useMemo(() => getMesesEnRango(resFiltro.desde, resFiltro.hasta), [resFiltro])

  const consolidado = useMemo(() =>
    mesesRango.map(({ anio: a, mes: m, prefix }) => {
      const ing  = cobrosRes.filter(c => c.fecha_emision?.startsWith(prefix)).reduce((s, c) => s + Number(c.monto), 0)
      const gas  = gastosRes.filter(g => g.fecha?.startsWith(prefix)).reduce((s, g) => s + Number(g.monto), 0)
      const util = ing - gas
      return {
        nombre: MESES[m - 1], anio: a, mesNum: m, prefix,
        ingresos: ing, gastos: gas, utilidad: util,
        margen: ing > 0 ? Math.round((util / ing) * 100) : null,
        tieneData: ing > 0 || gas > 0,
      }
    }), [cobrosRes, gastosRes, mesesRango]
  )

  const totalPeriodo = useMemo(() => {
    const ing  = consolidado.reduce((s, m) => s + m.ingresos, 0)
    const gas  = consolidado.reduce((s, m) => s + m.gastos,   0)
    const util = ing - gas
    return { ingresos: ing, gastos: gas, utilidad: util, margen: ing > 0 ? Math.round((util / ing) * 100) : null }
  }, [consolidado])

  // Desglose de utilidades (solo cobros generados desde calculadora con receta_json)
  const splitData = useMemo(() => {
    const conReceta = cobrosRes.filter(c => c.receta_json?.utilidad_total != null)
    if (conReceta.length === 0) return null
    const utilidad_total = conReceta.reduce((s, c) => s + Number(c.receta_json.utilidad_total || 0), 0)
    const parte_mayor    = conReceta.reduce((s, c) => s + Number(c.receta_json.parte_mayor    || 0), 0)
    const parte_menor    = conReceta.reduce((s, c) => s + Number(c.receta_json.parte_menor    || 0), 0)
    const pct_mayor = conReceta[0]?.receta_json?.pct_mayor ?? 75
    const pct_menor = conReceta[0]?.receta_json?.pct_menor ?? 25
    return { utilidad_total, parte_mayor, parte_menor, pct_mayor, pct_menor, pedidos: conReceta.length }
  }, [cobrosRes])

  // ── Detail: mes seleccionado ──────────────────────────────────────────────
  const mesPad    = String(mes).padStart(2, '0')
  const mesFiltro = `${anio}-${mesPad}`
  const gastosMes     = useMemo(() => gastos.filter(g => g.fecha?.startsWith(mesFiltro)),         [gastos, mesFiltro])
  const cobrosMes     = useMemo(() => cobros.filter(c => c.fecha_emision?.startsWith(mesFiltro)), [cobros, mesFiltro])
  const totalGastos   = useMemo(() => gastosMes.reduce((s, g) => s + Number(g.monto), 0),         [gastosMes])
  const totalIngresos = useMemo(() => cobrosMes.reduce((s, c) => s + Number(c.monto), 0),         [cobrosMes])
  const utilidad      = totalIngresos - totalGastos

  // ── CRUD gastos ───────────────────────────────────────────────────────────
  async function crearGasto(datos) {
    const { error } = await supabase.from('gastos').insert([datos])
    if (error) { toast.error('Error al registrar gasto'); return false }
    toast.success('Gasto registrado'); fetchGastos(); return true
  }
  async function actualizarGasto(id, datos) {
    const { error } = await supabase.from('gastos').update(datos).eq('id', id)
    if (error) { toast.error('Error al actualizar'); return false }
    toast.success('Gasto actualizado'); fetchGastos(); return true
  }
  async function eliminarGasto(id) {
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return false }
    toast.success('Gasto eliminado'); fetchGastos(); return true
  }

  return {
    gastos, cobros, loading,
    anio, setAnio, mes, setMes, mesFiltro,
    gastosMes, cobrosMes, totalGastos, totalIngresos, utilidad,
    gastosRes, cobrosRes, loadingRes,
    resDesde, setResDesde, resHasta, setResHasta,
    resFiltro, aplicarFiltroResumen,
    consolidado, totalPeriodo, splitData,
    saldos, loadingSald, guardarSaldo, eliminarSaldo,
    crearGasto, actualizarGasto, eliminarGasto,
  }
}
