import { useState, useMemo, useRef } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart2,
  Plus, Upload, Edit2, Trash2, X, FileText,
  CheckSquare, Square, AlertCircle, Loader2, ChevronDown,
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

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
    anio, setAnio,
    mes,  setMes,
    gastosMes, cobrosMes,
    totalGastos, totalIngresos, utilidad,
    consolidado, totalAnual,
    crearGasto, actualizarGasto, eliminarGasto,
  } = useFinanzas()

  const currentYear = new Date().getFullYear()
  const ANIOS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

  const [tab,       setTab]       = useState('resumen')
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [busqueda,  setBusqueda]  = useState('')
  const [filtrocat, setFiltrocat] = useState('')

  const mesActual = mes

  // Navegar a un mes desde el consolidado
  function irAMes(mesNum, destTab = 'gastos') {
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

  // Máximo para escalar barras en la tabla
  const maxIngreso = Math.max(...consolidado.map(m => m.ingresos), 1)

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Finanzas</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Ingresos, gastos y consolidado anual</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">

          {/* Mes — solo visible en tabs de detalle */}
          {(tab === 'ingresos' || tab === 'gastos' || tab === 'extracto') && (
            <div className="relative">
              <select
                value={mesActual}
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

          {/* Año — siempre visible */}
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

          <Button onClick={abrirCrear}><Plus size={16} /> Gasto</Button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 border-b border-[#e2e6ea]">
        {[
          ['resumen',  'Resumen anual'],
          ['ingresos', 'Ingresos'],
          ['gastos',   'Gastos'],
          ['extracto', 'Extracto bancario'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-accent text-accent' : 'border-transparent text-[#8a9ab0] hover:text-navy-600'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB RESUMEN ANUAL
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'resumen' && (
        <div>
          {/* Cards anuales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <TrendingUp size={12} className="text-green-500" /> Ingresos {anio}
              </p>
              <p className="text-xl font-bold text-green-600">{fmt(totalAnual.ingresos)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <TrendingDown size={12} className="text-red-500" /> Gastos {anio}
              </p>
              <p className="text-xl font-bold text-red-600">{fmt(totalAnual.gastos)}</p>
            </Card>
            <Card className={`p-4 ${totalAnual.utilidad >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-medium uppercase tracking-wide flex items-center gap-1 mb-1 ${totalAnual.utilidad >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                <DollarSign size={12} /> Utilidad neta
              </p>
              <p className={`text-xl font-bold ${totalAnual.utilidad >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(totalAnual.utilidad)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <BarChart2 size={12} /> Margen
              </p>
              <p className="text-xl font-bold text-navy-600">
                {totalAnual.margen !== null ? `${totalAnual.margen}%` : '—'}
              </p>
            </Card>
          </div>

          {/* Tabla consolidado */}
          {loading ? (
            <div className="text-center py-10 text-[#8a9ab0] text-sm">Cargando...</div>
          ) : (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[110px]">Mes</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[140px]">Ingresos</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[140px]">Gastos</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[140px]">Utilidad</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[70px]">Margen</th>
                    <th className="px-4 py-3 w-[120px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e6ea]">
                  {consolidado.map(m => (
                    <tr
                      key={m.mesNum}
                      className={`transition-colors ${m.tieneData ? 'hover:bg-[#f8f9fb] cursor-pointer' : 'opacity-40'}`}
                      onClick={() => m.tieneData && irAMes(m.mesNum, 'ingresos')}
                    >
                      <td className="px-4 py-3 font-medium text-navy-600">{m.nombre}</td>

                      {/* Ingresos con barra */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-green-700 font-semibold tabular-nums">{m.ingresos > 0 ? fmt(m.ingresos) : '—'}</span>
                          {m.ingresos > 0 && <MiniBar valor={m.ingresos} max={maxIngreso} color="bg-green-400" />}
                        </div>
                      </td>

                      {/* Gastos */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-red-600 font-semibold tabular-nums">{m.gastos > 0 ? fmt(m.gastos) : '—'}</span>
                      </td>

                      {/* Utilidad */}
                      <td className="px-4 py-3 text-right">
                        {m.tieneData ? (
                          <span className={`font-bold tabular-nums ${m.utilidad >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {fmt(m.utilidad)}
                          </span>
                        ) : <span className="text-[#c0cad6]">—</span>}
                      </td>

                      {/* Margen */}
                      <td className="px-4 py-3 text-right">
                        {m.margen !== null
                          ? <span className={`font-medium ${m.margen >= 0 ? 'text-green-600' : 'text-red-500'}`}>{m.margen}%</span>
                          : <span className="text-[#c0cad6]">—</span>
                        }
                      </td>

                      {/* Accion */}
                      <td className="px-4 py-3 text-right">
                        {m.tieneData && (
                          <span className="text-xs text-accent font-medium opacity-0 group-hover:opacity-100">Ver detalle →</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#e2e6ea] bg-[#f8f9fb] font-bold">
                    <td className="px-4 py-3 text-navy-600 text-sm">Total {anio}</td>
                    <td className="px-4 py-3 text-right text-green-700 tabular-nums">{fmt(totalAnual.ingresos)}</td>
                    <td className="px-4 py-3 text-right text-red-600 tabular-nums">{fmt(totalAnual.gastos)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${totalAnual.utilidad >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(totalAnual.utilidad)}
                    </td>
                    <td className={`px-4 py-3 text-right ${totalAnual.margen !== null && totalAnual.margen >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {totalAnual.margen !== null ? `${totalAnual.margen}%` : '—'}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </Card>
          )}

          {/* Nota */}
          {!loading && totalAnual.ingresos === 0 && totalAnual.gastos === 0 && (
            <div className="mt-6 text-center py-12">
              <BarChart2 size={40} className="text-[#e2e6ea] mx-auto mb-3" />
              <p className="text-sm font-medium text-navy-600">Sin datos para {anio}</p>
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
          {/* Cards mensuales */}
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
          {/* Cards mensuales */}
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

          {/* Chips de categoría */}
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
                <p className="text-xs text-[#8a9ab0]">Registra un gasto o importa desde el extracto bancario</p>
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
      {tab === 'extracto' && <ExtractoTab crearGasto={crearGasto} />}

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

// ── Subcomponente: Tab Extracto ───────────────────────────────────────────────
function ExtractoTab({ crearGasto }) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  const keyOk  = apiKey && apiKey !== 'tu_key_aqui' && apiKey.startsWith('sk-ant-')

  const fileRef = useRef(null)
  const [archivo,       setArchivo]       = useState(null)
  const [procesando,    setProcesando]    = useState(false)
  const [transacciones, setTransacciones] = useState(null)
  const [seleccionadas, setSeleccionadas] = useState(new Set())
  const [catTxn,        setCatTxn]        = useState({})
  const [importando,    setImportando]    = useState(false)

  function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') { toast.error('Solo archivos PDF'); return }
    setArchivo(f); setTransacciones(null)
  }
  function onDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') { toast.error('Solo archivos PDF'); return }
    setArchivo(f); setTransacciones(null)
  }

  async function analizar() {
    if (!archivo) return
    setProcesando(true)
    try {
      const base64 = await fileToBase64(archivo)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-allow-browser': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5', max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
              { type: 'text', text: `Eres un asistente contable. Analiza este extracto bancario Nu Colombia y extrae TODAS las transacciones.
Devuelve UNICAMENTE un JSON array (sin markdown, sin explicacion) con este formato exacto:
[{"fecha":"YYYY-MM-DD","descripcion":"descripcion concisa","monto":12345,"tipo":"debito"}]
Reglas: tipo "debito"=salida de dinero, tipo "credito"=entrada. monto siempre positivo. fecha YYYY-MM-DD. descripcion max 60 chars.` },
            ],
          }],
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `Error ${res.status}`) }
      const data = await res.json()
      const texto = data.content?.[0]?.text || ''
      const match = texto.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('No se encontraron transacciones')
      const txns = JSON.parse(match[0])
      if (!Array.isArray(txns) || txns.length === 0) throw new Error('El extracto no contiene transacciones legibles')
      setTransacciones(txns)
      setSeleccionadas(new Set(txns.map((t, i) => t.tipo === 'debito' ? i : -1).filter(i => i >= 0)))
      const map = {}; txns.forEach((_, i) => { map[i] = 'otros' }); setCatTxn(map)
      toast.success(`${txns.length} transacciones encontradas`)
    } catch (err) {
      toast.error(err.message || 'Error al analizar el extracto')
    } finally { setProcesando(false) }
  }

  function toggleTxn(i) { setSeleccionadas(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s }) }
  function toggleTodos() {
    const debitos = (transacciones || []).map((t, i) => t.tipo === 'debito' ? i : -1).filter(i => i >= 0)
    const todos = debitos.every(i => seleccionadas.has(i))
    setSeleccionadas(todos ? new Set() : new Set(debitos))
  }

  async function importarGastos() {
    const aImportar = (transacciones || [])
      .filter((t, i) => seleccionadas.has(i) && t.tipo === 'debito')
      .map(t => ({ fecha: t.fecha, categoria: catTxn[transacciones.indexOf(t)] || 'otros', descripcion: t.descripcion, monto: Number(t.monto), notas: 'Importado desde extracto Nu Colombia' }))
    if (aImportar.length === 0) { toast.error('Selecciona al menos un gasto'); return }
    setImportando(true)
    let ok = 0
    for (const g of aImportar) { if (await crearGasto(g)) ok++ }
    setImportando(false)
    if (ok > 0) { toast.success(`${ok} gasto${ok !== 1 ? 's' : ''} importado${ok !== 1 ? 's' : ''}`); setTransacciones(null); setArchivo(null); setSeleccionadas(new Set()) }
  }

  if (!keyOk) return (
    <Card>
      <div className="flex flex-col items-center py-12 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center"><AlertCircle size={26} className="text-amber-500" /></div>
        <div>
          <p className="text-sm font-semibold text-navy-600">API Key de Claude no configurada</p>
          <p className="text-xs text-[#8a9ab0] max-w-xs mt-1.5 leading-relaxed">Agrega tu key en <code className="bg-[#f8f9fb] px-1 rounded">.env.local</code> como VITE_ANTHROPIC_API_KEY</p>
        </div>
      </div>
    </Card>
  )

  if (!archivo && !transacciones) return (
    <div>
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={onFile} />
      <div onDragOver={e => e.preventDefault()} onDrop={onDrop} onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-[#c0cad6] rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-accent hover:bg-accent/5 transition-all text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center"><FileText size={28} className="text-accent" /></div>
        <div>
          <p className="text-sm font-semibold text-navy-600">Sube tu extracto Nu Colombia</p>
          <p className="text-xs text-[#8a9ab0] mt-1">Arrastra el PDF aqui o haz clic para seleccionarlo</p>
        </div>
        <Button variant="secondary"><Upload size={14} /> Seleccionar PDF</Button>
      </div>
    </div>
  )

  if (procesando) return (
    <Card><div className="flex flex-col items-center py-14 gap-4"><Loader2 size={32} className="text-accent animate-spin" /><p className="text-sm font-semibold text-navy-600">Analizando extracto con Claude AI...</p></div></Card>
  )

  if (archivo && !transacciones) return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0"><FileText size={22} className="text-red-500" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-600 truncate">{archivo.name}</p>
          <p className="text-xs text-[#8a9ab0]">{(archivo.size / 1024).toFixed(0)} KB · PDF</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={() => setArchivo(null)}><X size={14} /> Quitar</Button>
          <Button onClick={analizar}><FileText size={14} /> Analizar con IA</Button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={onFile} />
    </Card>
  )

  if (transacciones) {
    const debitos = transacciones.filter(t => t.tipo === 'debito')
    const nSel = transacciones.filter((t, i) => seleccionadas.has(i) && t.tipo === 'debito').length
    const totalSel = transacciones.filter((t, i) => seleccionadas.has(i) && t.tipo === 'debito').reduce((s, t) => s + Number(t.monto), 0)
    return (
      <div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-3"><p className="text-xs text-[#8a9ab0]">Transacciones</p><p className="text-lg font-bold text-navy-600">{transacciones.length}</p></Card>
          <Card className="p-3"><p className="text-xs text-red-500">Debitos</p><p className="text-lg font-bold text-red-600">{debitos.length}</p></Card>
          <Card className="p-3"><p className="text-xs text-green-500">Creditos</p><p className="text-lg font-bold text-green-600">{transacciones.filter(t => t.tipo === 'credito').length}</p></Card>
        </div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-3">
            <button onClick={toggleTodos} className="flex items-center gap-1.5 text-xs text-[#8a9ab0] hover:text-navy-600">
              {debitos.every((_, ii) => seleccionadas.has(transacciones.indexOf(debitos[ii]))) ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} />}
              Seleccionar todos los gastos
            </button>
            {nSel > 0 && <span className="text-xs text-[#8a9ab0]">{nSel} seleccionado{nSel !== 1 ? 's' : ''} · {fmt(totalSel)}</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setTransacciones(null); setArchivo(null) }}><X size={14} /> Nuevo extracto</Button>
            <Button onClick={importarGastos} disabled={importando || nSel === 0}>
              {importando ? <><Loader2 size={14} className="animate-spin" /> Importando...</> : <><Upload size={14} /> Importar {nSel > 0 ? `${nSel} gasto${nSel !== 1 ? 's' : ''}` : ''}</>}
            </Button>
          </div>
        </div>
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                <th className="w-10 px-3 py-3" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[105px]">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Descripcion</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[140px]">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[90px]">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[120px]">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e6ea]">
              {transacciones.map((t, i) => {
                const esDebito = t.tipo === 'debito'; const sel = seleccionadas.has(i)
                return (
                  <tr key={i} className={`transition-colors ${esDebito ? (sel ? 'bg-blue-50/40' : 'hover:bg-[#f8f9fb]') : 'opacity-50 bg-[#f8f9fb]'}`}>
                    <td className="px-3 py-3">{esDebito ? <button onClick={() => toggleTxn(i)} className="text-accent">{sel ? <CheckSquare size={16} /> : <Square size={16} className="text-[#c0cad6]" />}</button> : <span className="w-4 h-4 block" />}</td>
                    <td className="px-4 py-3 text-[#8a9ab0] whitespace-nowrap text-xs">{t.fecha}</td>
                    <td className="px-4 py-3 text-navy-600 text-xs">{t.descripcion}</td>
                    <td className="px-4 py-3">{esDebito ? <select value={catTxn[i] || 'otros'} onChange={e => setCatTxn(prev => ({ ...prev, [i]: e.target.value }))} className="text-xs border border-[#e2e6ea] rounded-lg px-2 py-1 bg-white focus:outline-none w-full">{CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select> : <span className="text-xs text-[#c0cad6]">—</span>}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${esDebito ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{esDebito ? 'Debito' : 'Credito'}</span></td>
                    <td className={`px-4 py-3 text-right font-semibold text-xs ${esDebito ? 'text-red-600' : 'text-green-600'}`}>{esDebito ? '-' : '+'}{fmt(t.monto)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>
    )
  }
  return null
}
