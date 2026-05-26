import { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart2,
  Plus, Edit2, Trash2, X, Loader2, ChevronDown, Package,
} from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useFinanzas } from '../hooks/useFinanzas'
import { useMateriales } from '../hooks/useMateriales'
import toast from 'react-hot-toast'

// ── Constantes ────────────────────────────────────────────────────────────────
const CATEGORIAS_GASTO = [
  { id: 'electricidad', label: 'Electricidad',  color: 'bg-yellow-100 text-yellow-700' },
  { id: 'internet',     label: 'Internet',       color: 'bg-blue-100 text-blue-700' },
  { id: 'herramientas', label: 'Herramientas',   color: 'bg-orange-100 text-orange-700' },
  { id: 'dominio',      label: 'Dominio / Web',  color: 'bg-purple-100 text-purple-700' },
  { id: 'transporte',   label: 'Transporte',     color: 'bg-green-100 text-green-700' },
  { id: 'otros',        label: 'Otros',          color: 'bg-gray-100 text-gray-600' },
]
const CAT_MAP = Object.fromEntries(CATEGORIAS_GASTO.map(c => [c.id, c]))

const MATERIALES_COMUNES = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'Resina', 'Otro']

const MESES_LABEL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const EMPTY_GASTO = {
  fecha: new Date().toISOString().split('T')[0],
  categoria: 'electricidad', descripcion: '', monto: '', notas: '',
}
const EMPTY_COMPRA = {
  fecha: new Date().toISOString().split('T')[0],
  material: 'PLA', color: '', cantidad_g: '', costo: '', proveedor: '', notas: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
const fmtFecha = d =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtG = g =>
  g >= 1000 ? `${(g / 1000).toFixed(2).replace(/\.?0+$/, '')} kg` : `${g} g`

function RecetaStrip({ rj }) {
  return (
    <div className="mt-2 bg-[#f0f4f8] rounded-xl px-3 py-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
      {rj.costo_total > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#8a9ab0] mb-0.5">Costo venta</p>
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
    cobros, gastos, loading,
    anio, setAnio, mes, setMes,
    gastosMes, cobrosMes,
    crearGasto, actualizarGasto, eliminarGasto,
  } = useFinanzas()

  const {
    compras, loading: loadingMat, sinTabla,
    crearCompra, actualizarCompra, eliminarCompra,
  } = useMateriales()

  const curYear = new Date().getFullYear()
  const ANIOS   = [curYear - 2, curYear - 1, curYear, curYear + 1]

  const [tab,       setTab]       = useState('resumen')
  const [granul,    setGranul]    = useState('mes')   // 'mes' | 'anio'
  // gasto modal
  const [modalG,    setModalG]    = useState(null)
  const [formG,     setFormG]     = useState(EMPTY_GASTO)
  const [savingG,   setSavingG]   = useState(false)
  const [busqueda,  setBusqueda]  = useState('')
  const [filtrocat, setFiltrocat] = useState('')
  // material modal
  const [modalM,    setModalM]    = useState(null)
  const [formM,     setFormM]     = useState(EMPTY_COMPRA)
  const [savingM,   setSavingM]   = useState(false)
  const [filtroMat, setFiltroMat] = useState('')

  // Datos del periodo
  const periodoCobros = granul === 'mes' ? cobrosMes : cobros
  const periodoGastos = granul === 'mes' ? gastosMes : gastos

  // P&L del periodo
  const cobrosConReceta = periodoCobros.filter(c => c.receta_json?.utilidad_total != null)
  const sinReceta       = periodoCobros.length - cobrosConReceta.length
  const ventas          = periodoCobros.reduce((s, c) => s + Number(c.monto),                               0)
  const costoVenta      = cobrosConReceta.reduce((s, c) => s + Number(c.receta_json.costo_total    || 0), 0)
  const utilidadBruta   = cobrosConReceta.reduce((s, c) => s + Number(c.receta_json.utilidad_total || 0), 0)
  const parteM          = cobrosConReceta.reduce((s, c) => s + Number(c.receta_json.parte_mayor    || 0), 0)
  const partem          = cobrosConReceta.reduce((s, c) => s + Number(c.receta_json.parte_menor    || 0), 0)
  const pctMayor        = cobrosConReceta[0]?.receta_json?.pct_mayor ?? 75
  const pctMenor        = cobrosConReceta[0]?.receta_json?.pct_menor ?? 25
  const gastosOp        = periodoGastos.reduce((s, g) => s + Number(g.monto), 0)
  const resultadoNeto   = utilidadBruta - gastosOp

  // Tabla anual
  const anuales = useMemo(() => {
    if (granul !== 'anio') return []
    return Array.from({ length: 12 }, (_, i) => {
      const m      = i + 1
      const prefix = `${anio}-${String(m).padStart(2, '0')}`
      const mCob   = cobros.filter(c => c.fecha_emision?.startsWith(prefix))
      const mGas   = gastos.filter(g => g.fecha?.startsWith(prefix))
      const mRec   = mCob.filter(c => c.receta_json?.utilidad_total != null)
      const mVen   = mCob.reduce((s, c) => s + Number(c.monto),                               0)
      const mCost  = mRec.reduce((s, c) => s + Number(c.receta_json.costo_total    || 0), 0)
      const mUtil  = mRec.reduce((s, c) => s + Number(c.receta_json.utilidad_total || 0), 0)
      const mGOp   = mGas.reduce((s, g) => s + Number(g.monto),                               0)
      return { nombre: MESES_LABEL[i], mesNum: m, ventas: mVen, costoVenta: mCost,
               utilidad: mUtil, gastosOp: mGOp, resultado: mUtil - mGOp,
               tieneData: mCob.length > 0 || mGas.length > 0 }
    })
  }, [cobros, gastos, anio, granul])

  // Filtros gastos
  const gastosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return periodoGastos.filter(g => {
      const matchQ = !q || g.descripcion?.toLowerCase().includes(q) || g.notas?.toLowerCase().includes(q)
      return matchQ && (!filtrocat || g.categoria === filtrocat)
    })
  }, [periodoGastos, busqueda, filtrocat])
  const porCategoria = useMemo(() =>
    CATEGORIAS_GASTO
      .map(cat => ({ ...cat, total: periodoGastos.filter(g => g.categoria === cat.id).reduce((s, g) => s + Number(g.monto), 0) }))
      .filter(c => c.total > 0), [periodoGastos])

  // Materiales agrupados
  const tiposMat = useMemo(() => [...new Set(compras.map(c => c.material))].sort(), [compras])
  const comprasFiltradas = useMemo(() =>
    filtroMat ? compras.filter(c => c.material === filtroMat) : compras, [compras, filtroMat])
  const resumenPorMaterial = useMemo(() =>
    tiposMat.map(tipo => {
      const items = compras.filter(c => c.material === tipo)
      return {
        tipo,
        totalCosto: items.reduce((s, c) => s + Number(c.costo), 0),
        totalG:     items.reduce((s, c) => s + Number(c.cantidad_g || 0), 0),
        ultima:     items[0], // sorted desc, so first = latest
        veces:      items.length,
      }
    }), [compras, tiposMat])

  const periodoLabel = granul === 'mes' ? `${MESES_LABEL[mes - 1]} ${anio}` : `Año ${anio}`

  // Handlers gasto
  function abrirCrearG() { setFormG({ ...EMPTY_GASTO, fecha: new Date().toISOString().split('T')[0] }); setModalG({ mode: 'crear' }) }
  function abrirEditarG(g) {
    setFormG({ fecha: g.fecha, categoria: g.categoria, descripcion: g.descripcion, monto: String(g.monto), notas: g.notas || '' })
    setModalG({ mode: 'editar', id: g.id })
  }
  async function guardarG() {
    if (!formG.descripcion.trim()) { toast.error('Agrega una descripción'); return }
    if (!formG.monto || Number(formG.monto) <= 0) { toast.error('Monto inválido'); return }
    setSavingG(true)
    const datos = { ...formG, monto: Number(formG.monto) }
    const ok = modalG.mode === 'crear' ? await crearGasto(datos) : await actualizarGasto(modalG.id, datos)
    setSavingG(false)
    if (ok) setModalG(null)
  }

  // Handlers compra material
  function abrirCrearM() { setFormM({ ...EMPTY_COMPRA, fecha: new Date().toISOString().split('T')[0] }); setModalM({ mode: 'crear' }) }
  function abrirEditarM(c) {
    setFormM({ fecha: c.fecha, material: c.material, color: c.color || '', cantidad_g: String(c.cantidad_g || ''), costo: String(c.costo), proveedor: c.proveedor || '', notas: c.notas || '' })
    setModalM({ mode: 'editar', id: c.id })
  }
  async function guardarM() {
    if (!formM.material.trim()) { toast.error('Elige el material'); return }
    if (!formM.costo || Number(formM.costo) <= 0) { toast.error('Costo inválido'); return }
    setSavingM(true)
    const datos = {
      fecha: formM.fecha, material: formM.material.trim(),
      color: formM.color.trim() || null,
      cantidad_g: formM.cantidad_g ? Number(formM.cantidad_g) : null,
      costo: Number(formM.costo),
      proveedor: formM.proveedor.trim() || null,
      notas: formM.notas.trim() || null,
    }
    const ok = modalM.mode === 'crear' ? await crearCompra(datos) : await actualizarCompra(modalM.id, datos)
    setSavingM(false)
    if (ok) setModalM(null)
  }

  function irAMes(mesNum) { setMes(mesNum); setGranul('mes'); setTab('resumen') }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Finanzas</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">
            {tab === 'materiales' ? 'Registro de compras de material' : periodoLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {(tab === 'resumen' || tab === 'ventas' || tab === 'gastos') && (
            <>
              <div className="flex rounded-lg border border-[#e2e6ea] overflow-hidden text-sm">
                <button onClick={() => setGranul('mes')}
                  className={`px-3 py-1.5 font-medium transition-colors ${granul === 'mes' ? 'bg-navy-600 text-white' : 'bg-white text-[#8a9ab0] hover:bg-[#f8f9fb]'}`}>
                  Mes
                </button>
                <button onClick={() => setGranul('anio')}
                  className={`px-3 py-1.5 font-medium transition-colors ${granul === 'anio' ? 'bg-navy-600 text-white' : 'bg-white text-[#8a9ab0] hover:bg-[#f8f9fb]'}`}>
                  Año
                </button>
              </div>
              {granul === 'mes' && (
                <div className="relative">
                  <select value={mes} onChange={e => setMes(Number(e.target.value))}
                    className="appearance-none text-sm border border-[#e2e6ea] rounded-lg pl-3 pr-8 py-2 bg-white text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer">
                    {MESES_LABEL.map((label, i) => <option key={i + 1} value={i + 1}>{label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9ab0] pointer-events-none" />
                </div>
              )}
              <div className="relative">
                <select value={anio} onChange={e => setAnio(Number(e.target.value))}
                  className="appearance-none text-sm border border-[#e2e6ea] rounded-lg pl-3 pr-8 py-2 bg-white text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer">
                  {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9ab0] pointer-events-none" />
              </div>
              {tab === 'gastos' && <Button onClick={abrirCrearG}><Plus size={16} /> Gasto</Button>}
            </>
          )}
          {tab === 'materiales' && (
            <Button onClick={abrirCrearM}><Plus size={16} /> Registrar compra</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#e2e6ea]">
        {[['resumen','Resumen'],['ventas','Ventas'],['gastos','Gastos'],['materiales','Materiales']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-accent text-accent' : 'border-transparent text-[#8a9ab0] hover:text-navy-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ RESUMEN ══ */}
      {tab === 'resumen' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#8a9ab0] text-sm">
              <Loader2 size={16} className="animate-spin" /> Cargando {periodoLabel}...
            </div>
          ) : (
            <>
              <Card className="p-5 mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0] mb-4">
                  Estado de resultados · {periodoLabel}
                </p>

                <div className="flex items-start justify-between py-2.5 border-b border-[#f0f4f8]">
                  <div>
                    <p className="text-sm text-navy-600 font-medium">Ventas</p>
                    <p className="text-xs text-[#8a9ab0] mt-0.5">
                      {periodoCobros.length} cobro{periodoCobros.length !== 1 ? 's' : ''} pagado{periodoCobros.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-navy-600 tabular-nums">{fmt(ventas)}</span>
                </div>

                <div className="flex items-start justify-between py-2.5 border-b border-[#f0f4f8]">
                  <div>
                    <p className="text-sm text-[#8a9ab0]">Costo de venta</p>
                    <p className="text-xs text-[#8a9ab0] mt-0.5">material por trabajo · calculado en la calculadora</p>
                    {sinReceta > 0 && (
                      <p className="text-xs text-orange-500 mt-0.5">{sinReceta} cobro{sinReceta > 1 ? 's' : ''} sin datos</p>
                    )}
                  </div>
                  <span className="text-sm text-[#8a9ab0] tabular-nums">{costoVenta > 0 ? `(${fmt(costoVenta)})` : '—'}</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-[#e2e6ea]">
                  <p className="text-sm font-semibold text-navy-600">Utilidad bruta</p>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    {cobrosConReceta.length > 0 && (
                      <div className="flex gap-2">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold whitespace-nowrap">
                          {pctMayor}% → {fmt(parteM)}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold whitespace-nowrap">
                          {pctMenor}% → {fmt(partem)}
                        </span>
                      </div>
                    )}
                    <span className={`text-sm font-bold tabular-nums ${utilidadBruta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(utilidadBruta)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start justify-between py-2.5 border-b border-[#f0f4f8]">
                  <div>
                    <p className="text-sm text-[#8a9ab0]">Gastos operativos</p>
                    <p className="text-xs text-[#8a9ab0] mt-0.5">
                      {periodoGastos.length} registro{periodoGastos.length !== 1 ? 's' : ''} · luz, internet, herramientas, etc.
                    </p>
                  </div>
                  <span className="text-sm text-red-500 tabular-nums">{gastosOp > 0 ? `(${fmt(gastosOp)})` : '—'}</span>
                </div>

                <div className="flex items-center justify-between pt-4 mt-1">
                  <p className="text-base font-bold text-navy-600">Resultado neto</p>
                  <span className={`text-xl font-bold tabular-nums ${resultadoNeto >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {fmt(resultadoNeto)}
                  </span>
                </div>
              </Card>

              {granul === 'anio' && (
                <Card className="overflow-hidden p-0 mb-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: 560 }}>
                      <thead>
                        <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[110px]">Mes</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Ventas</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Costo venta</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Util. bruta</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Gastos</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wide">Resultado</th>
                          <th className="w-[40px]" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e6ea]">
                        {anuales.map(m => (
                          <tr key={m.mesNum}
                            className={`transition-colors ${m.tieneData ? 'hover:bg-[#f8f9fb] cursor-pointer' : 'opacity-30'}`}
                            onClick={() => m.tieneData && irAMes(m.mesNum)}>
                            <td className="px-4 py-2.5 font-medium text-navy-600">{m.nombre}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-navy-600">
                              {m.ventas > 0 ? fmt(m.ventas) : <span className="text-[#c0cad6]">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-[#8a9ab0]">
                              {m.costoVenta > 0 ? `(${fmt(m.costoVenta)})` : <span className="text-[#c0cad6]">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {m.utilidad > 0 ? <span className="font-semibold text-green-700">{fmt(m.utilidad)}</span> : <span className="text-[#c0cad6]">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-red-400">
                              {m.gastosOp > 0 ? `(${fmt(m.gastosOp)})` : <span className="text-[#c0cad6]">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {m.tieneData
                                ? <span className={`font-bold ${m.resultado >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(m.resultado)}</span>
                                : <span className="text-[#c0cad6]">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {m.tieneData && <span className="text-xs text-accent font-medium">Ver →</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#e2e6ea] bg-[#f8f9fb] font-bold">
                          <td className="px-4 py-3 text-navy-600">Total {anio}</td>
                          <td className="px-4 py-3 text-right text-navy-600 tabular-nums">{fmt(ventas)}</td>
                          <td className="px-4 py-3 text-right text-[#8a9ab0] tabular-nums">({fmt(costoVenta)})</td>
                          <td className="px-4 py-3 text-right text-green-700 tabular-nums">{fmt(utilidadBruta)}</td>
                          <td className="px-4 py-3 text-right text-red-400 tabular-nums">({fmt(gastosOp)})</td>
                          <td className={`px-4 py-3 text-right tabular-nums ${resultadoNeto >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(resultadoNeto)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              )}

              {periodoCobros.length === 0 && periodoGastos.length === 0 && (
                <div className="text-center py-16">
                  <BarChart2 size={40} className="text-[#e2e6ea] mx-auto mb-3" />
                  <p className="text-sm font-medium text-navy-600">Sin movimientos en {periodoLabel}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ VENTAS ══ */}
      {tab === 'ventas' && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <TrendingUp size={12} className="text-green-500" /> Ventas
              </p>
              <p className="text-xl font-bold text-green-600">{fmt(ventas)}</p>
              <p className="text-xs text-[#8a9ab0] mt-0.5">{periodoCobros.length} cobro{periodoCobros.length !== 1 ? 's' : ''} pagado{periodoCobros.length !== 1 ? 's' : ''}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <DollarSign size={12} /> Utilidad bruta
              </p>
              <p className="text-xl font-bold text-green-700">{fmt(utilidadBruta)}</p>
              {cobrosConReceta.length > 0 && (
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-green-600 font-semibold">{pctMayor}% → {fmt(parteM)}</span>
                  <span className="text-xs text-yellow-600 font-semibold">{pctMenor}% → {fmt(partem)}</span>
                </div>
              )}
            </Card>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[#8a9ab0] text-sm">
              <Loader2 size={16} className="animate-spin" /> Cargando...
            </div>
          ) : periodoCobros.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center py-12 gap-3">
                <TrendingUp size={36} className="text-[#e2e6ea]" />
                <p className="text-sm font-medium text-navy-600">Sin ventas en {periodoLabel}</p>
                <p className="text-xs text-[#8a9ab0]">Los cobros marcados como pagados aparecen aquí</p>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="divide-y divide-[#e2e6ea]">
                {periodoCobros.map(c => {
                  const rj = c.receta_json
                  const tieneReceta = rj?.utilidad_total != null
                  return (
                    <div key={c.id} className="px-4 py-3.5 hover:bg-[#f8f9fb] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#8a9ab0] w-[72px] shrink-0">{fmtFecha(c.fecha_emision)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-navy-600 text-sm truncate">{c.cliente_nombre || '—'}</p>
                          {tieneReceta && rj.producto && (
                            <p className="text-xs text-[#8a9ab0] truncate">{rj.producto}{rj.cantidad > 1 ? ` ×${rj.cantidad}` : ''}</p>
                          )}
                        </div>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap shrink-0">
                          {c.concepto || 'Pago'}
                        </span>
                        <span className="font-bold text-navy-600 tabular-nums shrink-0">{fmt(c.monto)}</span>
                      </div>
                      {tieneReceta && <div className="ml-[84px]"><RecetaStrip rj={rj} /></div>}
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-[#f8f9fb] border-t-2 border-[#e2e6ea]">
                <span className="text-sm font-semibold text-navy-600">{periodoLabel}</span>
                <span className="text-base font-bold text-green-700 tabular-nums">{fmt(ventas)}</span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══ GASTOS ══ */}
      {tab === 'gastos' && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <TrendingDown size={12} className="text-red-500" /> Gastos operativos
              </p>
              <p className="text-xl font-bold text-red-600">{fmt(gastosOp)}</p>
              <p className="text-xs text-[#8a9ab0] mt-0.5">{periodoGastos.length} registro{periodoGastos.length !== 1 ? 's' : ''}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
                <TrendingUp size={12} className="text-green-500" /> Ventas del periodo
              </p>
              <p className="text-xl font-bold text-navy-600">{fmt(ventas)}</p>
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
                <p className="text-sm font-medium text-navy-600">Sin gastos en {periodoLabel}</p>
                <p className="text-xs text-[#8a9ab0]">Registra electricidad, dominio, herramientas y otros gastos fijos</p>
                <Button variant="secondary" onClick={abrirCrearG}><Plus size={14} /> Registrar gasto</Button>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm table-fixed">
                <colgroup><col className="w-[100px]" /><col className="w-[130px]" /><col /><col className="w-[120px]" /><col className="w-[72px]" /></colgroup>
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
                            <button onClick={() => abrirEditarG(g)} className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-navy-600 hover:bg-[#f0f2f5] transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => { if (confirm('¿Eliminar este gasto?')) eliminarGasto(g.id) }} className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
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

      {/* ══ MATERIALES ══ */}
      {tab === 'materiales' && (
        <div>
          {sinTabla ? (
            <Card>
              <div className="flex flex-col items-center py-12 gap-3 text-center">
                <Package size={40} className="text-[#e2e6ea]" />
                <p className="text-sm font-semibold text-navy-600">Tabla pendiente de crear</p>
                <p className="text-xs text-[#8a9ab0] max-w-sm leading-relaxed">
                  Corre este SQL en Supabase → SQL Editor para activar esta sección:
                </p>
                <code className="text-xs bg-[#f0f4f8] text-[#3d5166] px-4 py-3 rounded-lg block text-left w-full max-w-sm leading-loose">
                  {`create table compras_materiales (\n  id uuid default gen_random_uuid() primary key,\n  fecha date not null,\n  material text not null,\n  color text,\n  cantidad_g numeric,\n  costo numeric not null,\n  proveedor text,\n  notas text\n);\nalter table compras_materiales\n  enable row level security;\ncreate policy "Allow all" on compras_materiales\n  for all using (true) with check (true);`}
                </code>
              </div>
            </Card>
          ) : loadingMat ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#8a9ab0] text-sm">
              <Loader2 size={16} className="animate-spin" /> Cargando materiales...
            </div>
          ) : (
            <>
              {/* Resumen por tipo de material */}
              {resumenPorMaterial.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  {resumenPorMaterial.map(r => (
                    <button key={r.tipo}
                      onClick={() => setFiltroMat(filtroMat === r.tipo ? '' : r.tipo)}
                      className={`text-left p-4 rounded-2xl border transition-all ${filtroMat === r.tipo ? 'border-accent bg-accent/5' : 'border-[#e2e6ea] bg-white hover:border-navy-300'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-navy-600 px-2 py-0.5 rounded-full bg-[#e8edf2]">{r.tipo}</span>
                        <span className="text-xs text-[#8a9ab0]">{r.veces} compra{r.veces !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-base font-bold text-navy-600 mt-1">{fmt(r.totalCosto)}</p>
                      {r.totalG > 0 && (
                        <p className="text-xs text-[#8a9ab0] mt-0.5">{fmtG(r.totalG)} total</p>
                      )}
                      {r.ultima && (
                        <p className="text-xs text-[#8a9ab0] mt-1">Última: {fmtFecha(r.ultima.fecha)}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Lista de compras */}
              {comprasFiltradas.length === 0 ? (
                <Card>
                  <div className="flex flex-col items-center py-12 gap-3">
                    <Package size={36} className="text-[#e2e6ea]" />
                    <p className="text-sm font-medium text-navy-600">Sin compras registradas</p>
                    <p className="text-xs text-[#8a9ab0]">Registra cada vez que compres filamento u otro material</p>
                    <Button variant="secondary" onClick={abrirCrearM}><Plus size={14} /> Registrar compra</Button>
                  </div>
                </Card>
              ) : (
                <Card className="overflow-hidden p-0">
                  <div className="divide-y divide-[#e2e6ea]">
                    {comprasFiltradas.map(c => (
                      <div key={c.id} className="px-4 py-3.5 hover:bg-[#f8f9fb] transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#8a9ab0] w-[72px] shrink-0">{fmtFecha(c.fecha)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-navy-600">{c.material}</span>
                              {c.color && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#e8edf2] text-[#5a7a99]">{c.color}</span>
                              )}
                              {c.cantidad_g > 0 && (
                                <span className="text-xs text-[#8a9ab0]">{fmtG(c.cantidad_g)}</span>
                              )}
                            </div>
                            {c.proveedor && <p className="text-xs text-[#8a9ab0] mt-0.5">{c.proveedor}</p>}
                            {c.notas && <p className="text-xs text-[#8a9ab0] truncate mt-0.5">{c.notas}</p>}
                          </div>
                          <span className="font-bold text-navy-600 tabular-nums shrink-0">{fmt(c.costo)}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => abrirEditarM(c)} className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-navy-600 hover:bg-[#f0f2f5] transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => { if (confirm('¿Eliminar esta compra?')) eliminarCompra(c.id) }} className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f8f9fb] border-t-2 border-[#e2e6ea]">
                    <span className="text-sm font-semibold text-navy-600">
                      {filtroMat ? filtroMat : 'Total invertido en materiales'}
                    </span>
                    <span className="text-base font-bold text-navy-600 tabular-nums">
                      {fmt(comprasFiltradas.reduce((s, c) => s + Number(c.costo), 0))}
                    </span>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal gasto */}
      {modalG && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModalG(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e2e6ea]">
              <h2 className="font-semibold text-navy-600">{modalG.mode === 'crear' ? 'Registrar gasto' : 'Editar gasto'}</h2>
              <button onClick={() => setModalG(null)} className="p-1.5 rounded-lg hover:bg-[#f8f9fb]"><X size={18} /></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy-600 mb-1">Fecha *</label>
                  <input type="date" value={formG.fecha} onChange={e => setFormG(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-600 mb-1">Categoría *</label>
                  <select value={formG.categoria} onChange={e => setFormG(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
                    {CATEGORIAS_GASTO.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Descripción *</label>
                <input value={formG.descripcion} onChange={e => setFormG(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Factura de luz — mayo"
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Monto (COP) *</label>
                <input type="number" value={formG.monto} onChange={e => setFormG(f => ({ ...f, monto: e.target.value }))}
                  placeholder="0" min="0"
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Notas (opcional)</label>
                <textarea value={formG.notas} onChange={e => setFormG(f => ({ ...f, notas: e.target.value }))}
                  rows={2} className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setModalG(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={guardarG} disabled={savingG}>
                {savingG ? 'Guardando...' : modalG.mode === 'crear' ? 'Registrar' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal compra material */}
      {modalM && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModalM(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e2e6ea]">
              <h2 className="font-semibold text-navy-600">{modalM.mode === 'crear' ? 'Registrar compra de material' : 'Editar compra'}</h2>
              <button onClick={() => setModalM(null)} className="p-1.5 rounded-lg hover:bg-[#f8f9fb]"><X size={18} /></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy-600 mb-1">Fecha *</label>
                  <input type="date" value={formM.fecha} onChange={e => setFormM(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-600 mb-1">Material *</label>
                  <input list="mat-list" value={formM.material} onChange={e => setFormM(f => ({ ...f, material: e.target.value }))}
                    placeholder="PLA, PETG, Resina..."
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                  <datalist id="mat-list">
                    {MATERIALES_COMUNES.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy-600 mb-1">Color (opcional)</label>
                  <input value={formM.color} onChange={e => setFormM(f => ({ ...f, color: e.target.value }))}
                    placeholder="Ej: Blanco, Negro..."
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-600 mb-1">Cantidad (gramos)</label>
                  <input type="number" value={formM.cantidad_g} onChange={e => setFormM(f => ({ ...f, cantidad_g: e.target.value }))}
                    placeholder="Ej: 1000 = 1 kg" min="0"
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Costo total (COP) *</label>
                <input type="number" value={formM.costo} onChange={e => setFormM(f => ({ ...f, costo: e.target.value }))}
                  placeholder="0" min="0"
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Proveedor (opcional)</label>
                <input value={formM.proveedor} onChange={e => setFormM(f => ({ ...f, proveedor: e.target.value }))}
                  placeholder="Ej: MercadoLibre, tienda local..."
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Notas (opcional)</label>
                <textarea value={formM.notas} onChange={e => setFormM(f => ({ ...f, notas: e.target.value }))}
                  rows={2} placeholder="Obs..."
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setModalM(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={guardarM} disabled={savingM}>
                {savingM ? 'Guardando...' : modalM.mode === 'crear' ? 'Registrar' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
