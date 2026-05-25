import { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart2,
  Plus, Edit2, Trash2, X, Calendar, Users,
  Loader2, ChevronDown,
} from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useFinanzas } from '../hooks/useFinanzas'
import toast from 'react-hot-toast'

// ── Constantes ────────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { id: 'materiales',   label: 'Materiales',   color: 'bg-blue-100 text-blue-700' },
  { id: 'servicios',    label: 'Servicios',     color: 'bg-purple-100 text-purple-700' },
  { id: 'herramientas', label: 'Herramientas',  color: 'bg-orange-100 text-orange-700' },
  { id: 'transporte',   label: 'Transporte',    color: 'bg-green-100 text-green-700' },
  { id: 'marketing',    label: 'Marketing',     color: 'bg-pink-100 text-pink-700' },
  { id: 'nomina',       label: 'Nomina',        color: 'bg-teal-100 text-teal-700' },
  { id: 'otros',        label: 'Otros',         color: 'bg-gray-100 text-gray-600' },
]
const CAT_MAP = Object.fromEntries(CATEGORIAS.map(c => [c.id, c]))

const MESES_LABEL = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const EMPTY_FORM = {
  fecha:       new Date().toISOString().split('T')[0],
  categoria:   'materiales',
  descripcion: '',
  monto:       '',
  notas:       '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const fmtFecha = d =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })

// ── Mini barra horizontal ─────────────────────────────────────────────────────
function MiniBar({ valor, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0
  return (
    <div className="w-full bg-[#f0f2f5] rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Finanzas() {
  const {
    loading,
    anio, setAnio, mes, setMes,
    gastosMes, cobrosMes,
    totalGastos, totalIngresos, utilidad,
    loadingRes,
    resDesde, setResDesde, resHasta, setResHasta,
    resFiltro, aplicarFiltroResumen,
    consolidado, totalPeriodo, splitData,
    saldos, loadingSald, guardarSaldo, eliminarSaldo,
    crearGasto, actualizarGasto, eliminarGasto,
  } = useFinanzas()

  const curYear = new Date().getFullYear()
  const ANIOS = [curYear - 2, curYear - 1, curYear, curYear + 1]

  const [tab,       setTab]       = useState('resumen')
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [busqueda,  setBusqueda]  = useState('')
  const [filtrocat, setFiltrocat] = useState('')

  // Navegar a un mes desde el consolidado
  function irAMes(mesNum, anioNum, destTab = 'ingresos') {
    setAnio(anioNum)
    setMes(mesNum)
    setTab(destTab)
  }

  // ── Handlers modal gasto ──────────────────────────────────────────────────
  function abrirCrear() {
    setForm({ ...EMPTY_FORM, fecha: new Date().toISOString().split('T')[0] })
    setModal({ mode: 'crear' })
  }
  function abrirEditar(g) {
    setForm({ fecha: g.fecha, categoria: g.categoria, descripcion: g.descripcion, monto: String(g.monto), notas: g.notas || '' })
    setModal({ mode: 'editar', id: g.id })
  }
  async function guardar() {
    if (!form.descripcion.trim()) { toast.error('Agrega una descripcion'); return }
    if (!form.monto || Number(form.monto) <= 0) { toast.error('Monto invalido'); return }
    setSaving(true)
    const datos = { ...form, monto: Number(form.monto) }
    const ok = modal.mode === 'crear'
      ? await crearGasto(datos)
      : await actualizarGasto(modal.id, datos)
    setSaving(false)
    if (ok) setModal(null)
  }

  // ── Filtros gastos ────────────────────────────────────────────────────────
  const gastosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return gastosMes.filter(g => {
      const matchQ = !q || g.descripcion?.toLowerCase().includes(q) || g.notas?.toLowerCase().includes(q)
      return matchQ && (!filtrocat || g.categoria === filtrocat)
    })
  }, [gastosMes, busqueda, filtrocat])

  const porCategoria = useMemo(() =>
    CATEGORIAS
      .map(cat => ({ ...cat, total: gastosMes.filter(g => g.categoria === cat.id).reduce((s, g) => s + Number(g.monto), 0) }))
      .filter(c => c.total > 0),
    [gastosMes]
  )

  const margenMes = totalIngresos > 0 ? Math.round((utilidad / totalIngresos) * 100) : null

  // Máximos para escalar barras
  const maxIngreso = Math.max(...consolidado.map(m => m.ingresos), 1)

  // ¿El rango abarca más de un año?
  const multiAnio = resFiltro.desde.split('-')[0] !== resFiltro.hasta.split('-')[0]

  // Atajos de fecha
  function setAtajo(tipo) {
    const y = curYear
    if (tipo === 'este')   { setResDesde(`${y}-01-01`); setResHasta(`${y}-12-31`) }
    if (tipo === 'ant')    { setResDesde(`${y-1}-01-01`); setResHasta(`${y-1}-12-31`) }
    if (tipo === 'h1')     { setResDesde(`${y}-01-01`); setResHasta(`${y}-06-30`) }
    if (tipo === 'h2')     { setResDesde(`${y}-07-01`); setResHasta(`${y}-12-31`) }
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Finanzas</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Ingresos, gastos y consolidado</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Selectores año/mes — solo en tabs de detalle */}
          {tab !== 'resumen' && (
            <>
              {(tab === 'ingresos' || tab === 'gastos') && (
                <div className="relative">
                  <select
                    value={mes}
                    onChange={e => setMes(Number(e.target.value))}
                    className="appearance-none text-sm border border-[#e2e6ea] rounded-lg pl-3 pr-8 py-2 bg-white text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
                  >
                    {MESES_LABEL.map((label, i) => (
                      <option key={i + 1} value={i + 1}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9ab0] pointer-events-none" />
                </div>
              )}
              <div className="relative">
                <select
                  value={anio}
                  onChange={e => setAnio(Number(e.target.value))}
                  className="appearance-none text-sm border border-[#e2e6ea] rounded-lg pl-3 pr-8 py-2 bg-white text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
                >
                  {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9ab0] pointer-events-none" />
              </div>
            </>
          )}
          <Button onClick={abrirCrear}><Plus size={16} /> Gasto</Button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 border-b border-[#e2e6ea]">
        {[
          ['resumen',  'Resumen'],
          ['ingresos', 'Ingresos'],
          ['gastos',   'Gastos'],
          ['extracto', 'Extracto'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-accent text-accent' : 'border-transparent text-[#8a9ab0] hover:text-navy-600'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB RESUMEN
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'resumen' && (
        <div>
          {/* Filtro de fechas */}
          <Card className="p-4 mb-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex items-center gap-1.5">
                <Calendar size={15} className="text-[#8a9ab0]" />
                <span className="text-xs font-medium text-[#8a9ab0] uppercase tracking-wide">Período</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-[#8a9ab0] whitespace-nowrap">Desde</label>
                  <input
                    type="date"
                    value={resDesde}
                    onChange={e => setResDesde(e.target.value)}
                    className="text-sm border border-[#e2e6ea] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-[#8a9ab0] whitespace-nowrap">Hasta</label>
                  <input
                    type="date"
                    value={resHasta}
                    onChange={e => setResHasta(e.target.value)}
                    className="text-sm border border-[#e2e6ea] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <Button onClick={aplicarFiltroResumen} className="shrink-0">Aplicar</Button>
              </div>
              {/* Atajos */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  ['este', 'Este año'],
                  ['ant',  'Año anterior'],
                  ['h1',   'Ene – Jun'],
                  ['h2',   'Jul – Dic'],
                ].map(([tipo, label]) => (
                  <button
                    key={tipo}
                    onClick={() => setAtajo(tipo)}
                    className="text-xs px-2.5 py-1 rounded-full border border-[#e2e6ea] text-[#8a9ab0] hover:border-accent hover:text-accent transition-colors"
                  >{label}</button>
                ))}
              </div>
            </div>
          </Card>

          {/* Cards del período */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <TrendingUp size={12} className="text-green-500" /> Ingresos
              </p>
              <p className="text-xl font-bold text-green-600">{fmt(totalPeriodo.ingresos)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <TrendingDown size={12} className="text-red-500" /> Gastos
              </p>
              <p className="text-xl font-bold text-red-600">{fmt(totalPeriodo.gastos)}</p>
            </Card>
            <Card className={`p-4 ${totalPeriodo.utilidad >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-medium uppercase tracking-wide flex items-center gap-1 mb-1 ${totalPeriodo.utilidad >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                <DollarSign size={12} /> Utilidad neta
              </p>
              <p className={`text-xl font-bold ${totalPeriodo.utilidad >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(totalPeriodo.utilidad)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <BarChart2 size={12} /> Margen
              </p>
              <p className="text-xl font-bold text-navy-600">
                {totalPeriodo.margen !== null ? `${totalPeriodo.margen}%` : '—'}
              </p>
            </Card>
          </div>

          {/* Tabla consolidado */}
          {loadingRes ? (
            <div className="text-center py-10 text-[#8a9ab0] text-sm flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Cargando...
            </div>
          ) : (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[130px]">Mes</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[150px]">Ingresos</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[140px]">Gastos</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[140px]">Utilidad</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[70px]">Margen</th>
                    <th className="px-4 py-3 w-[90px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e6ea]">
                  {consolidado.map(m => (
                    <tr
                      key={m.prefix}
                      className={`transition-colors ${m.tieneData ? 'hover:bg-[#f8f9fb] cursor-pointer' : 'opacity-40'}`}
                      onClick={() => m.tieneData && irAMes(m.mesNum, m.anio, 'ingresos')}
                    >
                      <td className="px-4 py-3 font-medium text-navy-600">
                        {m.nombre}{multiAnio && <span className="text-xs text-[#8a9ab0] ml-1">{m.anio}</span>}
                      </td>

                      {/* Ingresos con barra */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-green-700 font-semibold tabular-nums">{m.ingresos > 0 ? fmt(m.ingresos) : '—'}</span>
                          {m.ingresos > 0 && <MiniBar valor={m.ingresos} max={maxIngreso} color="bg-green-400" />}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="text-red-600 font-semibold tabular-nums">{m.gastos > 0 ? fmt(m.gastos) : '—'}</span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {m.tieneData ? (
                          <span className={`font-bold tabular-nums ${m.utilidad >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {fmt(m.utilidad)}
                          </span>
                        ) : <span className="text-[#c0cad6]">—</span>}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {m.margen !== null
                          ? <span className={`font-medium ${m.margen >= 0 ? 'text-green-600' : 'text-red-500'}`}>{m.margen}%</span>
                          : <span className="text-[#c0cad6]">—</span>
                        }
                      </td>

                      <td className="px-4 py-3 text-right">
                        {m.tieneData && (
                          <span className="text-xs text-accent font-medium">Ver →</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#e2e6ea] bg-[#f8f9fb] font-bold">
                    <td className="px-4 py-3 text-navy-600 text-sm">Total período</td>
                    <td className="px-4 py-3 text-right text-green-700 tabular-nums">{fmt(totalPeriodo.ingresos)}</td>
                    <td className="px-4 py-3 text-right text-red-600 tabular-nums">{fmt(totalPeriodo.gastos)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${totalPeriodo.utilidad >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(totalPeriodo.utilidad)}
                    </td>
                    <td className={`px-4 py-3 text-right ${totalPeriodo.margen !== null && totalPeriodo.margen >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {totalPeriodo.margen !== null ? `${totalPeriodo.margen}%` : '—'}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </Card>
          )}

          {/* Desglose por trabajo — cobros pagados con datos de calculadora */}
          {!loadingRes && (() => {
            const jobs = cobrosRes.filter(c => c.receta_json?.utilidad_total != null)
            if (jobs.length === 0) return null
            const pctMayor = jobs[0].receta_json.pct_mayor ?? 75
            const pctMenor = jobs[0].receta_json.pct_menor ?? 25
            const totCosto  = jobs.reduce((s, c) => s + Number(c.receta_json.costo_total    || 0), 0)
            const totPrecio = jobs.reduce((s, c) => s + Number(c.receta_json.precio_total   || 0), 0)
            const totUtil   = jobs.reduce((s, c) => s + Number(c.receta_json.utilidad_total || 0), 0)
            const totMayor  = jobs.reduce((s, c) => s + Number(c.receta_json.parte_mayor    || 0), 0)
            const totMenor  = jobs.reduce((s, c) => s + Number(c.receta_json.parte_menor    || 0), 0)
            return (
              <Card className="mt-4 overflow-hidden p-0">
                {/* Encabezado con totales del split */}
                <div className="px-4 py-3 border-b border-[#e2e6ea] bg-[#f8f9fb] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-accent" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0]">
                      Desglose por trabajo · {jobs.length} cobro{jobs.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1">
                      <span className="text-xs font-semibold text-green-600">{pctMayor}%</span>
                      <span className="text-sm font-bold text-green-700">{fmt(totMayor)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-100 rounded-lg px-2.5 py-1">
                      <span className="text-xs font-semibold text-yellow-600">{pctMenor}%</span>
                      <span className="text-sm font-bold text-yellow-700">{fmt(totMenor)}</span>
                    </div>
                  </div>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: 640 }}>
                    <thead>
                      <tr className="border-b border-[#e2e6ea]">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Fecha</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Cliente</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Producto</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide whitespace-nowrap">Costo mat.</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide whitespace-nowrap">A cobrar</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Utilidad</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-green-600 uppercase tracking-wide">{pctMayor}%</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-yellow-600 uppercase tracking-wide">{pctMenor}%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e6ea]">
                      {jobs.map(c => {
                        const rj = c.receta_json
                        return (
                          <tr key={c.id} className="hover:bg-[#f8f9fb] transition-colors">
                            <td className="px-4 py-2.5 text-[#8a9ab0] text-xs whitespace-nowrap">
                              {c.fecha_emision ? fmtFecha(c.fecha_emision) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-navy-600 font-medium truncate max-w-[110px]">
                              {c.cliente_nombre || '—'}
                            </td>
                            <td className="px-4 py-2.5 text-navy-600 truncate max-w-[110px]">
                              {rj.producto || '—'}
                              {rj.cantidad > 1 && <span className="ml-1 text-xs text-[#8a9ab0]">×{rj.cantidad}</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right text-[#8a9ab0] tabular-nums text-xs">
                              {rj.costo_total ? fmt(rj.costo_total) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-navy-600 tabular-nums">
                              {rj.precio_total ? fmt(rj.precio_total) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-green-700 tabular-nums">
                              {rj.utilidad_total ? fmt(rj.utilidad_total) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-green-600 tabular-nums">
                              {rj.parte_mayor ? fmt(rj.parte_mayor) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-yellow-600 tabular-nums">
                              {rj.parte_menor ? fmt(rj.parte_menor) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#e2e6ea] bg-[#f8f9fb] font-bold">
                        <td colSpan={3} className="px-4 py-2.5 text-navy-600 text-sm">Total período</td>
                        <td className="px-4 py-2.5 text-right text-[#8a9ab0] tabular-nums text-xs">{fmt(totCosto)}</td>
                        <td className="px-4 py-2.5 text-right text-navy-600 tabular-nums">{fmt(totPrecio)}</td>
                        <td className="px-4 py-2.5 text-right text-green-700 tabular-nums">{fmt(totUtil)}</td>
                        <td className="px-4 py-2.5 text-right text-green-600 tabular-nums">{fmt(totMayor)}</td>
                        <td className="px-4 py-2.5 text-right text-yellow-600 tabular-nums">{fmt(totMenor)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-[11px] text-[#8a9ab0] px-4 py-2 border-t border-[#f0f2f5]">
                  Solo cobros pagados generados desde la calculadora de precios
                </p>
              </Card>
            )
          })()}

          {!loadingRes && totalPeriodo.ingresos === 0 && totalPeriodo.gastos === 0 && (
            <div className="mt-6 text-center py-12">
              <BarChart2 size={40} className="text-[#e2e6ea] mx-auto mb-3" />
              <p className="text-sm font-medium text-navy-600">Sin datos para el período seleccionado</p>
              <p className="text-xs text-[#8a9ab0] mt-1">Registra gastos o marca cobros como pagados para ver el consolidado</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB INGRESOS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'ingresos' && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <TrendingUp size={12} className="text-green-500" /> Ingresos
              </p>
              <p className="text-xl font-bold text-green-600">{fmt(totalIngresos)}</p>
              <p className="text-xs text-[#8a9ab0] mt-0.5">{cobrosMes.length} cobro{cobrosMes.length !== 1 ? 's' : ''} pagado{cobrosMes.length !== 1 ? 's' : ''}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <TrendingDown size={12} className="text-red-500" /> Gastos
              </p>
              <p className="text-xl font-bold text-red-600">{fmt(totalGastos)}</p>
              <p className="text-xs text-[#8a9ab0] mt-0.5">{gastosMes.length} registro{gastosMes.length !== 1 ? 's' : ''}</p>
            </Card>
            <Card className={`p-4 ${utilidad >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-medium uppercase tracking-wide flex items-center gap-1 mb-1 ${utilidad >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                <DollarSign size={12} /> Utilidad neta
              </p>
              <p className={`text-xl font-bold ${utilidad >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(utilidad)}</p>
              <p className="text-xs text-[#8a9ab0] mt-0.5">{margenMes !== null ? `${margenMes}% de margen` : 'Sin ingresos aun'}</p>
            </Card>
          </div>

          {loading ? (
            <div className="text-center py-10 text-[#8a9ab0] text-sm">Cargando...</div>
          ) : cobrosMes.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center py-12 gap-3">
                <TrendingUp size={36} className="text-[#e2e6ea]" />
                <p className="text-sm font-medium text-navy-600">Sin ingresos en {MESES_LABEL[mes - 1]} {anio}</p>
                <p className="text-xs text-[#8a9ab0]">Los cobros marcados como pagados aparecen aqui</p>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[105px]" />
                  <col />
                  <col className="w-[150px]" />
                  <col className="w-[130px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Concepto</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e6ea]">
                  {cobrosMes.map(c => (
                    <tr key={c.id} className="hover:bg-[#f8f9fb] transition-colors">
                      <td className="px-4 py-3 text-[#8a9ab0] whitespace-nowrap text-xs">{fmtFecha(c.fecha_emision)}</td>
                      <td className="px-4 py-3 text-navy-600 font-medium truncate">{c.cliente_nombre}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">{c.concepto || 'Pago'}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700 whitespace-nowrap">{fmt(c.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB GASTOS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'gastos' && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <TrendingUp size={12} className="text-green-500" /> Ingresos
              </p>
              <p className="text-xl font-bold text-green-600">{fmt(totalIngresos)}</p>
              <p className="text-xs text-[#8a9ab0] mt-0.5">{cobrosMes.length} cobro{cobrosMes.length !== 1 ? 's' : ''}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <TrendingDown size={12} className="text-red-500" /> Gastos
              </p>
              <p className="text-xl font-bold text-red-600">{fmt(totalGastos)}</p>
              <p className="text-xs text-[#8a9ab0] mt-0.5">{gastosMes.length} registro{gastosMes.length !== 1 ? 's' : ''}</p>
            </Card>
            <Card className={`p-4 ${utilidad >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-medium uppercase tracking-wide flex items-center gap-1 mb-1 ${utilidad >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                <DollarSign size={12} /> Utilidad neta
              </p>
              <p className={`text-xl font-bold ${utilidad >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(utilidad)}</p>
              <p className="text-xs text-[#8a9ab0] mt-0.5">{margenMes !== null ? `${margenMes}% de margen` : 'Sin ingresos aun'}</p>
            </Card>
          </div>

          {porCategoria.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setFiltrocat('')}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${!filtrocat ? 'bg-navy-600 text-white border-navy-600' : 'bg-white text-[#8a9ab0] border-[#e2e6ea] hover:border-navy-600 hover:text-navy-600'}`}>
                Todos
              </button>
              {porCategoria.map(cat => (
                <button key={cat.id} onClick={() => setFiltrocat(filtrocat === cat.id ? '' : cat.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${filtrocat === cat.id ? 'bg-navy-600 text-white border-navy-600' : 'bg-white text-navy-600 border-[#e2e6ea] hover:border-navy-600'}`}>
                  {cat.label} · {fmt(cat.total)}
                </button>
              ))}
            </div>
          )}

          <div className="mb-3">
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar gasto..." className="w-full px-4 py-2 text-sm border border-[#e2e6ea] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>

          {loading ? (
            <div className="text-center py-10 text-[#8a9ab0] text-sm">Cargando...</div>
          ) : gastosFiltrados.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center py-12 gap-3">
                <TrendingDown size={36} className="text-[#e2e6ea]" />
                <p className="text-sm font-medium text-navy-600">Sin gastos en {MESES_LABEL[mes - 1]} {anio}</p>
                <p className="text-xs text-[#8a9ab0]">Registra los gastos del mes</p>
                <Button variant="secondary" onClick={abrirCrear}><Plus size={14} /> Registrar gasto</Button>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[105px]" />
                  <col className="w-[120px]" />
                  <col />
                  <col className="w-[130px]" />
                  <col className="w-[76px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Categoria</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Descripcion</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Monto</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e6ea]">
                  {gastosFiltrados.map(g => {
                    const cat = CAT_MAP[g.categoria] || CAT_MAP['otros']
                    return (
                      <tr key={g.id} className="hover:bg-[#f8f9fb] transition-colors">
                        <td className="px-4 py-3 text-[#8a9ab0] whitespace-nowrap text-xs">{fmtFecha(g.fecha)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cat.color}`}>{cat.label}</span>
                        </td>
                        <td className="px-4 py-3 text-navy-600">
                          <p className="font-medium truncate">{g.descripcion}</p>
                          {g.notas && <p className="text-xs text-[#8a9ab0] truncate mt-0.5">{g.notas}</p>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-navy-600 whitespace-nowrap">{fmt(g.monto)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => abrirEditar(g)} className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-navy-600 hover:bg-[#f0f2f5] transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => { if (confirm('Eliminar este gasto?')) eliminarGasto(g.id) }} className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB EXTRACTO
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'extracto' && (
        <ExtractoTab
          saldos={saldos}
          loadingSald={loadingSald}
          guardarSaldo={guardarSaldo}
          eliminarSaldo={eliminarSaldo}
        />
      )}

      {/* ── Modal gasto ────────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e2e6ea]">
              <h2 className="font-semibold text-navy-600">{modal.mode === 'crear' ? 'Registrar gasto' : 'Editar gasto'}</h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-[#f8f9fb]"><X size={18} /></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy-600 mb-1">Fecha *</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-600 mb-1">Categoria *</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
                    {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Descripcion *</label>
                <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Filamento PLA azul 1 kg"
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Monto (COP) *</label>
                <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  placeholder="0" min="0"
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Notas (opcional)</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2} placeholder="Observaciones adicionales..."
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : modal.mode === 'crear' ? 'Registrar' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Subcomponente: Tab Extracto (saldo mensual) ───────────────────────────────
function ExtractoTab({ saldos, loadingSald, guardarSaldo, eliminarSaldo }) {
  const [modal,  setModal]  = useState(null)
  const [form,   setForm]   = useState({ mes: '', saldo: '', notas: '' })
  const [saving, setSaving] = useState(false)

  function mesLabel(mesStr) {
    if (!mesStr) return '—'
    const [y, m] = mesStr.split('-')
    return `${MESES_LABEL[parseInt(m) - 1]} ${y}`
  }

  // Variación respecto al mes anterior (saldos viene desc por mes)
  function variacion(index) {
    if (index >= saldos.length - 1) return null
    return saldos[index].saldo - saldos[index + 1].saldo
  }

  function abrirCrear() {
    const now = new Date()
    const mesStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setForm({ mes: mesStr, saldo: '', notas: '' })
    setModal({ mode: 'crear' })
  }

  function abrirEditar(s) {
    setForm({ mes: s.mes, saldo: String(s.saldo), notas: s.notas || '' })
    setModal({ mode: 'editar', id: s.id })
  }

  async function guardar() {
    if (!form.mes) { toast.error('Selecciona el mes'); return }
    const saldoNum = Number(form.saldo)
    if (form.saldo === '' || isNaN(saldoNum) || saldoNum < 0) { toast.error('Ingresa un saldo válido'); return }
    setSaving(true)
    const datos = { mes: form.mes, saldo: saldoNum, notas: form.notas }
    if (modal.mode === 'editar') datos.id = modal.id
    const ok = await guardarSaldo(datos)
    setSaving(false)
    if (ok) setModal(null)
  }

  // Saldo actual (mes más reciente)
  const saldoActual  = saldos.length > 0 ? saldos[0].saldo : null
  const variActual   = saldos.length > 1 ? saldos[0].saldo - saldos[1].saldo : null

  return (
    <div>
      {/* Header del tab */}
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-navy-600">Saldo mensual · Nu Colombia</p>
          <p className="text-xs text-[#8a9ab0] mt-0.5">Registra el saldo de tu cuenta al cierre de cada mes</p>
        </div>
        <Button onClick={abrirCrear}><Plus size={16} /> Registrar saldo</Button>
      </div>

      {/* Tarjeta saldo actual */}
      {saldoActual !== null && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
              <DollarSign size={12} className="text-accent" /> Saldo actual
            </p>
            <p className="text-xl font-bold text-navy-600">{fmt(saldoActual)}</p>
            <p className="text-xs text-[#8a9ab0] mt-0.5">{mesLabel(saldos[0].mes)}</p>
          </Card>
          {variActual !== null && (
            <Card className={`p-4 ${variActual >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-medium uppercase tracking-wide flex items-center gap-1 mb-1 ${variActual >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {variActual >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} Variación
              </p>
              <p className={`text-xl font-bold ${variActual >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {variActual >= 0 ? '+' : ''}{fmt(variActual)}
              </p>
              <p className="text-xs text-[#8a9ab0] mt-0.5">vs {mesLabel(saldos[1]?.mes)}</p>
            </Card>
          )}
        </div>
      )}

      {/* Tabla */}
      {loadingSald ? (
        <div className="text-center py-10 text-[#8a9ab0] text-sm flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Cargando...
        </div>
      ) : saldos.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12 gap-3">
            <DollarSign size={36} className="text-[#e2e6ea]" />
            <p className="text-sm font-medium text-navy-600">Sin saldos registrados</p>
            <p className="text-xs text-[#8a9ab0]">Registra el saldo de tu cuenta al cierre de cada mes para llevar el historial</p>
            <Button variant="secondary" onClick={abrirCrear}><Plus size={14} /> Registrar primer saldo</Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Mes</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Saldo cierre</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Variación</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Notas</th>
                <th className="w-[76px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e6ea]">
              {saldos.map((s, i) => {
                const v = variacion(i)
                return (
                  <tr key={s.id} className="hover:bg-[#f8f9fb] transition-colors">
                    <td className="px-4 py-3 font-medium text-navy-600">{mesLabel(s.mes)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-navy-600 tabular-nums">{fmt(s.saldo)}</td>
                    <td className="px-4 py-3 text-right">
                      {v !== null ? (
                        <span className={`font-medium tabular-nums text-sm ${v >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {v >= 0 ? '+' : ''}{fmt(v)}
                        </span>
                      ) : <span className="text-[#c0cad6]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#8a9ab0] text-xs max-w-[180px] truncate">{s.notas || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => abrirEditar(s)} className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-navy-600 hover:bg-[#f0f2f5] transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => { if (confirm('Eliminar este saldo?')) eliminarSaldo(s.id) }} className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e2e6ea]">
              <h2 className="font-semibold text-navy-600">
                {modal.mode === 'crear' ? 'Registrar saldo' : 'Editar saldo'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-[#f8f9fb]"><X size={18} /></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Mes *</label>
                <input
                  type="month"
                  value={form.mes}
                  onChange={e => setForm(f => ({ ...f, mes: e.target.value }))}
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Saldo al cierre del mes (COP) *</label>
                <input
                  type="number"
                  value={form.saldo}
                  onChange={e => setForm(f => ({ ...f, saldo: e.target.value }))}
                  placeholder="0"
                  min="0"
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Notas (opcional)</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2}
                  placeholder="Ej: incluye transferencia pendiente..."
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
