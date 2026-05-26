import { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart2,
  Plus, Edit2, Trash2, X, Users, Loader2, ChevronDown,
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

// ── Tarjeta KPI ───────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, valueColor = 'text-navy-600', bg = '' }) {
  return (
    <Card className={`p-4 ${bg}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
        {icon} {label}
      </p>
      <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-[#8a9ab0] mt-0.5">{sub}</p>}
    </Card>
  )
}

// ── Strip de desglose financiero por cobro ────────────────────────────────────
function RecetaStrip({ rj }) {
  return (
    <div className="mt-2 bg-[#f0f4f8] rounded-xl px-3 py-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
      {rj.costo_total > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#8a9ab0] mb-0.5">Costo mat.</p>
          <p className="text-xs font-semibold text-[#8a9ab0]">{fmt(rj.costo_total)}</p>
        </div>
      )}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-[#8a9ab0] mb-0.5">Utilidad</p>
        <p className="text-xs font-bold text-green-700">{rj.utilidad_total ? fmt(rj.utilidad_total) : '—'}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-green-600 mb-0.5">{rj.pct_mayor ?? 75}%</p>
        <p className="text-xs font-semibold text-green-600">{rj.parte_mayor ? fmt(rj.parte_mayor) : '—'}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-yellow-600 mb-0.5">{rj.pct_menor ?? 25}%</p>
        <p className="text-xs font-semibold text-yellow-600">{rj.parte_menor ? fmt(rj.parte_menor) : '—'}</p>
      </div>
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

  // Cobros con receta del mes (para Resumen e Ingresos)
  const cobrosConReceta = useMemo(() =>
    cobrosMes.filter(c => c.receta_json?.utilidad_total != null),
    [cobrosMes]
  )
  const totReceta = useMemo(() => {
    if (cobrosConReceta.length === 0) return null
    return {
      costo:    cobrosConReceta.reduce((s, c) => s + Number(c.receta_json.costo_total    || 0), 0),
      util:     cobrosConReceta.reduce((s, c) => s + Number(c.receta_json.utilidad_total || 0), 0),
      mayor:    cobrosConReceta.reduce((s, c) => s + Number(c.receta_json.parte_mayor    || 0), 0),
      menor:    cobrosConReceta.reduce((s, c) => s + Number(c.receta_json.parte_menor    || 0), 0),
      pctMayor: cobrosConReceta[0]?.receta_json?.pct_mayor ?? 75,
      pctMenor: cobrosConReceta[0]?.receta_json?.pct_menor ?? 25,
    }
  }, [cobrosConReceta])

  const mesLabel = `${MESES_LABEL[mes - 1]} ${anio}`

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Finanzas</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Ingresos, gastos y utilidades</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Selectores mes/año — siempre visibles */}
          {(tab === 'resumen' || tab === 'ingresos' || tab === 'gastos') && (
            <>
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
      <div className="flex gap-1 mb-6 border-b border-[#e2e6ea]">
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
          {/* KPI del mes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard
              icon={<TrendingUp size={12} className="text-green-500" />}
              label="Ingresos"
              value={fmt(totalIngresos)}
              sub={`${cobrosMes.length} cobro${cobrosMes.length !== 1 ? 's' : ''} pagado${cobrosMes.length !== 1 ? 's' : ''}`}
              valueColor="text-green-600"
            />
            <KpiCard
              icon={<TrendingDown size={12} className="text-red-500" />}
              label="Gastos"
              value={fmt(totalGastos)}
              sub={`${gastosMes.length} registro${gastosMes.length !== 1 ? 's' : ''}`}
              valueColor="text-red-600"
            />
            <KpiCard
              icon={<DollarSign size={12} />}
              label="Utilidad neta"
              value={fmt(utilidad)}
              sub={margenMes !== null ? `${margenMes}% de margen` : 'Sin ingresos aún'}
              valueColor={utilidad >= 0 ? 'text-green-700' : 'text-red-700'}
              bg={utilidad >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
            />
            <KpiCard
              icon={<BarChart2 size={12} />}
              label="Margen"
              value={margenMes !== null ? `${margenMes}%` : '—'}
              valueColor="text-navy-600"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[#8a9ab0] text-sm">
              <Loader2 size={16} className="animate-spin" /> Cargando {mesLabel}...
            </div>
          ) : (cobrosMes.length === 0 && gastosMes.length === 0) ? (
            <div className="text-center py-16">
              <BarChart2 size={40} className="text-[#e2e6ea] mx-auto mb-3" />
              <p className="text-sm font-medium text-navy-600">Sin datos en {mesLabel}</p>
              <p className="text-xs text-[#8a9ab0] mt-1">Registra gastos o marca cobros como pagados</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">

              {/* ── Ventas del mes ─────────────────────────────────────────── */}
              {cobrosMes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0]">
                      Ventas · {mesLabel}
                    </p>
                    {totReceta && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1">
                          <span className="text-[10px] font-semibold text-green-600">{totReceta.pctMayor}%</span>
                          <span className="text-sm font-bold text-green-700">{fmt(totReceta.mayor)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1">
                          <span className="text-[10px] font-semibold text-yellow-600">{totReceta.pctMenor}%</span>
                          <span className="text-sm font-bold text-yellow-700">{fmt(totReceta.menor)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Card className="overflow-hidden p-0">
                    <div className="divide-y divide-[#e2e6ea]">
                      {cobrosMes.map(c => {
                        const rj = c.receta_json
                        const tieneReceta = rj?.utilidad_total != null
                        return (
                          <div key={c.id} className="px-4 py-3.5 hover:bg-[#f8f9fb] transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-[#8a9ab0] w-[72px] shrink-0">{fmtFecha(c.fecha_emision)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-navy-600 text-sm truncate">{c.cliente_nombre || '—'}</p>
                                {tieneReceta && rj.producto && (
                                  <p className="text-xs text-[#8a9ab0] truncate">
                                    {rj.producto}{rj.cantidad > 1 ? ` ×${rj.cantidad}` : ''}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap shrink-0">
                                {c.concepto || 'Pago'}
                              </span>
                              <span className="font-bold text-navy-600 tabular-nums shrink-0">{fmt(c.monto)}</span>
                            </div>
                            {tieneReceta && (
                              <div className="ml-[84px]">
                                <RecetaStrip rj={rj} />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {/* Total ventas */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#f8f9fb] border-t-2 border-[#e2e6ea]">
                      <span className="text-sm font-semibold text-navy-600">Total ventas</span>
                      <span className="text-base font-bold text-green-700 tabular-nums">{fmt(totalIngresos)}</span>
                    </div>
                  </Card>
                </div>
              )}

              {/* ── Gastos del mes ─────────────────────────────────────────── */}
              {gastosMes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0] mb-3">
                    Gastos · {mesLabel}
                  </p>

                  {/* Por categoría */}
                  {porCategoria.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {porCategoria.map(cat => (
                        <div key={cat.id} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cat.color}`}>
                          {cat.label}
                          <span className="font-bold">{fmt(cat.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Card className="overflow-hidden p-0">
                    <div className="divide-y divide-[#e2e6ea]">
                      {gastosMes.map(g => {
                        const cat = CAT_MAP[g.categoria] || CAT_MAP['otros']
                        return (
                          <div key={g.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8f9fb] transition-colors">
                            <span className="text-xs text-[#8a9ab0] w-[72px] shrink-0">{fmtFecha(g.fecha)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-navy-600 truncate">{g.descripcion}</p>
                              {g.notas && <p className="text-xs text-[#8a9ab0] truncate">{g.notas}</p>}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 ${cat.color}`}>{cat.label}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-semibold text-navy-600 tabular-nums text-sm">{fmt(g.monto)}</span>
                              <button onClick={() => abrirEditar(g)} className="p-1 rounded hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600 transition-colors"><Edit2 size={13} /></button>
                              <button onClick={() => { if (confirm('Eliminar este gasto?')) eliminarGasto(g.id) }} className="p-1 rounded hover:bg-red-50 text-[#8a9ab0] hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-[#f8f9fb] border-t-2 border-[#e2e6ea]">
                      <span className="text-sm font-semibold text-navy-600">Total gastos</span>
                      <span className="text-base font-bold text-red-600 tabular-nums">{fmt(totalGastos)}</span>
                    </div>
                  </Card>
                </div>
              )}

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
            <KpiCard
              icon={<TrendingUp size={12} className="text-green-500" />}
              label="Ingresos"
              value={fmt(totalIngresos)}
              sub={`${cobrosMes.length} cobro${cobrosMes.length !== 1 ? 's' : ''} pagado${cobrosMes.length !== 1 ? 's' : ''}`}
              valueColor="text-green-600"
            />
            <KpiCard
              icon={<TrendingDown size={12} className="text-red-500" />}
              label="Gastos"
              value={fmt(totalGastos)}
              sub={`${gastosMes.length} registro${gastosMes.length !== 1 ? 's' : ''}`}
              valueColor="text-red-600"
            />
            <KpiCard
              icon={<DollarSign size={12} />}
              label="Utilidad neta"
              value={fmt(utilidad)}
              sub={margenMes !== null ? `${margenMes}% de margen` : 'Sin ingresos aún'}
              valueColor={utilidad >= 0 ? 'text-green-700' : 'text-red-700'}
              bg={utilidad >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
            />
          </div>

          {/* Resumen split del mes */}
          {totReceta && (
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                <span className="text-xs font-semibold text-green-600">{totReceta.pctMayor}%</span>
                <span className="text-base font-bold text-green-700">{fmt(totReceta.mayor)}</span>
              </div>
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5">
                <span className="text-xs font-semibold text-yellow-600">{totReceta.pctMenor}%</span>
                <span className="text-base font-bold text-yellow-700">{fmt(totReceta.menor)}</span>
              </div>
              <div className="flex items-center gap-2 bg-[#f8f9fb] border border-[#e2e6ea] rounded-xl px-4 py-2.5">
                <span className="text-xs text-[#8a9ab0]">Costo materiales</span>
                <span className="text-base font-bold text-navy-600">{fmt(totReceta.costo)}</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[#8a9ab0] text-sm">
              <Loader2 size={16} className="animate-spin" /> Cargando...
            </div>
          ) : cobrosMes.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center py-12 gap-3">
                <TrendingUp size={36} className="text-[#e2e6ea]" />
                <p className="text-sm font-medium text-navy-600">Sin ingresos en {mesLabel}</p>
                <p className="text-xs text-[#8a9ab0]">Los cobros marcados como pagados aparecen aquí</p>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="divide-y divide-[#e2e6ea]">
                {cobrosMes.map(c => {
                  const rj = c.receta_json
                  const tieneReceta = rj?.utilidad_total != null
                  return (
                    <div key={c.id} className="px-4 py-3.5 hover:bg-[#f8f9fb] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#8a9ab0] w-[72px] shrink-0">{fmtFecha(c.fecha_emision)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-navy-600 text-sm truncate">{c.cliente_nombre || '—'}</p>
                          {tieneReceta && rj.producto && (
                            <p className="text-xs text-[#8a9ab0] truncate">
                              {rj.producto}{rj.cantidad > 1 ? ` ×${rj.cantidad}` : ''}
                            </p>
                          )}
                        </div>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap shrink-0">
                          {c.concepto || 'Pago'}
                        </span>
                        <span className="font-bold text-navy-600 tabular-nums shrink-0">{fmt(c.monto)}</span>
                      </div>
                      {tieneReceta && (
                        <div className="ml-[84px]">
                          <RecetaStrip rj={rj} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-[#f8f9fb] border-t-2 border-[#e2e6ea]">
                <span className="text-sm font-semibold text-navy-600">{mesLabel}</span>
                <span className="text-base font-bold text-green-700 tabular-nums">{fmt(totalIngresos)}</span>
              </div>
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
            <KpiCard
              icon={<TrendingUp size={12} className="text-green-500" />}
              label="Ingresos"
              value={fmt(totalIngresos)}
              sub={`${cobrosMes.length} cobro${cobrosMes.length !== 1 ? 's' : ''}`}
              valueColor="text-green-600"
            />
            <KpiCard
              icon={<TrendingDown size={12} className="text-red-500" />}
              label="Gastos"
              value={fmt(totalGastos)}
              sub={`${gastosMes.length} registro${gastosMes.length !== 1 ? 's' : ''}`}
              valueColor="text-red-600"
            />
            <KpiCard
              icon={<DollarSign size={12} />}
              label="Utilidad neta"
              value={fmt(utilidad)}
              sub={margenMes !== null ? `${margenMes}% de margen` : 'Sin ingresos aún'}
              valueColor={utilidad >= 0 ? 'text-green-700' : 'text-red-700'}
              bg={utilidad >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
            />
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
              placeholder="Buscar gasto..."
              className="w-full px-4 py-2 text-sm border border-[#e2e6ea] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[#8a9ab0] text-sm">
              <Loader2 size={16} className="animate-spin" /> Cargando...
            </div>
          ) : gastosFiltrados.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center py-12 gap-3">
                <TrendingDown size={36} className="text-[#e2e6ea]" />
                <p className="text-sm font-medium text-navy-600">Sin gastos en {mesLabel}</p>
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Categoría</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Descripción</th>
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
                  <label className="block text-xs font-medium text-navy-600 mb-1">Categoría *</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
                    {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Descripción *</label>
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
function ExtractoTab({ saldos, loadingSald, guardarSaldo, eliminarSaldo }) {
  const [modal,  setModal]  = useState(null)
  const [form,   setForm]   = useState({ mes: '', saldo: '', notas: '' })
  const [saving, setSaving] = useState(false)

  const fmt = n =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

  function mesLabel(mesStr) {
    if (!mesStr) return '—'
    const [y, m] = mesStr.split('-')
    return `${MESES_LABEL[parseInt(m) - 1]} ${y}`
  }

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

  const saldoActual = saldos.length > 0 ? saldos[0].saldo : null
  const variActual  = saldos.length > 1 ? saldos[0].saldo - saldos[1].saldo : null

  return (
    <div>
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-navy-600">Saldo mensual · Nu Colombia</p>
          <p className="text-xs text-[#8a9ab0] mt-0.5">Registra el saldo de tu cuenta al cierre de cada mes</p>
        </div>
        <Button onClick={abrirCrear}><Plus size={16} /> Registrar saldo</Button>
      </div>

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

      {loadingSald ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[#8a9ab0] text-sm">
          <Loader2 size={16} className="animate-spin" /> Cargando...
        </div>
      ) : saldos.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12 gap-3">
            <DollarSign size={36} className="text-[#e2e6ea]" />
            <p className="text-sm font-medium text-navy-600">Sin saldos registrados</p>
            <p className="text-xs text-[#8a9ab0]">Registra el saldo de tu cuenta al cierre de cada mes</p>
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
                      {v !== null
                        ? <span className={`font-medium tabular-nums text-sm ${v >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {v >= 0 ? '+' : ''}{fmt(v)}
                          </span>
                        : <span className="text-[#c0cad6]">—</span>}
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

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e2e6ea]">
              <h2 className="font-semibold text-navy-600">{modal.mode === 'crear' ? 'Registrar saldo' : 'Editar saldo'}</h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-[#f8f9fb]"><X size={18} /></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Mes *</label>
                <input type="month" value={form.mes} onChange={e => setForm(f => ({ ...f, mes: e.target.value }))}
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Saldo al cierre del mes (COP) *</label>
                <input type="number" value={form.saldo} onChange={e => setForm(f => ({ ...f, saldo: e.target.value }))}
                  placeholder="0" min="0"
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Notas (opcional)</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2} placeholder="Ej: incluye transferencia pendiente..."
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
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
