import { useState, useMemo } from 'react'
import { BarChart2, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import Card from '../components/ui/Card'
import { useFinanzas } from '../hooks/useFinanzas'

const MESES_LABEL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const fmt = n =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
const fmtFecha = d =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, theme = 'default' }) {
  const T = {
    green:   { box: 'bg-green-50 border-green-200',     lbl: 'text-green-600',   val: 'text-green-700' },
    teal:    { box: 'bg-teal-50 border-teal-200',       lbl: 'text-teal-600',    val: 'text-teal-700'  },
    slate:   { box: 'bg-slate-50 border-slate-200',     lbl: 'text-slate-500',   val: 'text-slate-700' },
    default: { box: 'bg-white border-[#e2e6ea]',        lbl: 'text-[#8a9ab0]',   val: 'text-navy-600'  },
  }[theme] || { box: 'bg-white border-[#e2e6ea]', lbl: 'text-[#8a9ab0]', val: 'text-navy-600' }

  return (
    <div className={`rounded-2xl border p-4 ${T.box}`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${T.lbl}`}>{label}</p>
      <p className={`text-2xl font-bold leading-none tabular-nums ${T.val}`}>{value}</p>
      {sub && <p className={`text-xs mt-2 leading-relaxed ${T.lbl}`}>{sub}</p>}
    </div>
  )
}

// ── Desglose por cobro ────────────────────────────────────────────────────────
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
        <p className="text-xs font-bold text-teal-700">{rj.utilidad_total ? fmt(rj.utilidad_total) : '—'}</p>
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
    cobros, loading,
    anio, setAnio, mes, setMes,
    cobrosMes,
  } = useFinanzas()

  const curYear = new Date().getFullYear()
  const ANIOS   = [curYear - 2, curYear - 1, curYear, curYear + 1]

  const [granul, setGranul] = useState('mes')

  // ── Datos del periodo ────────────────────────────────────────────────────
  const periodoCobros   = granul === 'mes' ? cobrosMes : cobros
  const cobrosConReceta = periodoCobros.filter(c => c.receta_json?.utilidad_total != null)
  const sinReceta       = periodoCobros.length - cobrosConReceta.length
  const ventas          = periodoCobros.reduce((s, c) => s + Number(c.monto),                               0)
  const costoVenta      = cobrosConReceta.reduce((s, c) => s + Number(c.receta_json.costo_total    || 0), 0)
  const utilidadBruta   = cobrosConReceta.reduce((s, c) => s + Number(c.receta_json.utilidad_total || 0), 0)
  const parteM          = cobrosConReceta.reduce((s, c) => s + Number(c.receta_json.parte_mayor    || 0), 0)
  const partem          = cobrosConReceta.reduce((s, c) => s + Number(c.receta_json.parte_menor    || 0), 0)
  const pctMayor        = cobrosConReceta[0]?.receta_json?.pct_mayor ?? 75
  const pctMenor        = cobrosConReceta[0]?.receta_json?.pct_menor ?? 25
  const margen          = ventas > 0 ? Math.round((utilidadBruta / ventas) * 100) : null

  // Para header de tabla (usa datos del año completo)
  const gPctMayor = cobros.find(c => c.receta_json?.pct_mayor != null)?.receta_json?.pct_mayor ?? 75
  const gPctMenor = cobros.find(c => c.receta_json?.pct_menor != null)?.receta_json?.pct_menor ?? 25

  // ── Tabla mensual (solo vista año) ───────────────────────────────────────
  const anuales = useMemo(() => {
    if (granul !== 'anio') return []
    return Array.from({ length: 12 }, (_, i) => {
      const m      = i + 1
      const prefix = `${anio}-${String(m).padStart(2, '0')}`
      const mCob   = cobros.filter(c => c.fecha_emision?.startsWith(prefix))
      const mRec   = mCob.filter(c => c.receta_json?.utilidad_total != null)
      return {
        nombre: MESES_LABEL[i], mesNum: m, tieneData: mCob.length > 0,
        ventas:     mCob.reduce((s, c) => s + Number(c.monto),                               0),
        costoVenta: mRec.reduce((s, c) => s + Number(c.receta_json.costo_total    || 0), 0),
        utilidad:   mRec.reduce((s, c) => s + Number(c.receta_json.utilidad_total || 0), 0),
        parteM:     mRec.reduce((s, c) => s + Number(c.receta_json.parte_mayor    || 0), 0),
        partem:     mRec.reduce((s, c) => s + Number(c.receta_json.parte_menor    || 0), 0),
      }
    })
  }, [cobros, anio, granul])

  const periodoLabel = granul === 'mes'
    ? `${MESES_LABEL[mes - 1]} ${anio}`
    : `Año ${anio}`

  function irAMes(mesNum) { setMes(mesNum); setGranul('mes') }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Finanzas</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">{periodoLabel}</p>
        </div>

        {/* Filtro de periodo */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
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
                {MESES_LABEL.map((l, i) => <option key={i + 1} value={i + 1}>{l}</option>)}
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
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[#8a9ab0] text-sm">
          <Loader2 size={16} className="animate-spin" /> Cargando {periodoLabel}...
        </div>
      ) : periodoCobros.length === 0 ? (
        <div className="text-center py-24">
          <BarChart2 size={48} className="text-[#e2e6ea] mx-auto mb-4" />
          <p className="text-base font-semibold text-navy-600">Sin cobros en {periodoLabel}</p>
          <p className="text-xs text-[#8a9ab0] mt-1.5">Los cobros marcados como pagados aparecen aquí</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KpiCard theme="green" label="Ventas" value={fmt(ventas)}
              sub={`${periodoCobros.length} cobro${periodoCobros.length !== 1 ? 's' : ''} pagado${periodoCobros.length !== 1 ? 's' : ''}`} />
            <KpiCard theme="slate" label="Costo de material"
              value={costoVenta > 0 ? fmt(costoVenta) : '—'}
              sub={cobrosConReceta.length > 0
                ? `${cobrosConReceta.length} trabajo${cobrosConReceta.length !== 1 ? 's' : ''} con desglose`
                : 'Genera cobros desde la calculadora'} />
            <KpiCard theme="teal" label="Utilidad bruta"
              value={utilidadBruta > 0 ? fmt(utilidadBruta) : '—'}
              sub={margen !== null ? `${margen}% de margen sobre ventas` : undefined} />
            <div className="flex flex-col gap-2">
              <div className="flex-1 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">{pctMayor}%</p>
                <p className="text-xl font-bold text-green-700 tabular-nums">{parteM > 0 ? fmt(parteM) : '—'}</p>
              </div>
              <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-600">{pctMenor}%</p>
                <p className="text-xl font-bold text-yellow-700 tabular-nums">{partem > 0 ? fmt(partem) : '—'}</p>
              </div>
            </div>
          </div>

          {sinReceta > 0 && (
            <p className="text-xs text-[#8a9ab0] mb-5 pl-1">
              {sinReceta} cobro{sinReceta > 1 ? 's' : ''} sin desglose — generado sin calculadora
            </p>
          )}

          {/* Tabla mes a mes (solo vista año) */}
          {granul === 'anio' && (
            <Card className="overflow-hidden p-0 mb-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 540 }}>
                  <thead>
                    <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[100px]">Mes</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-green-600 uppercase tracking-wide">Ventas</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo mat.</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-teal-600 uppercase tracking-wide">Util. bruta</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-green-600 uppercase tracking-wide">{gPctMayor}%</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-yellow-600 uppercase tracking-wide">{gPctMenor}%</th>
                      <th className="w-[56px]" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e6ea]">
                    {anuales.map(m => (
                      <tr key={m.mesNum}
                        className={`transition-colors ${m.tieneData ? 'hover:bg-[#f8f9fb] cursor-pointer' : 'opacity-25'}`}
                        onClick={() => m.tieneData && irAMes(m.mesNum)}>
                        <td className="px-4 py-2.5 font-medium text-navy-600">{m.nombre}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-navy-600">
                          {m.ventas > 0 ? fmt(m.ventas) : <span className="text-[#c0cad6] font-normal">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                          {m.costoVenta > 0 ? fmt(m.costoVenta) : <span className="text-[#c0cad6]">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {m.utilidad > 0 ? <span className="font-bold text-teal-700">{fmt(m.utilidad)}</span> : <span className="text-[#c0cad6]">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {m.parteM > 0 ? <span className="font-semibold text-green-600">{fmt(m.parteM)}</span> : <span className="text-[#c0cad6]">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {m.partem > 0 ? <span className="font-semibold text-yellow-600">{fmt(m.partem)}</span> : <span className="text-[#c0cad6]">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {m.tieneData && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-accent bg-accent/10 px-2 py-1 rounded-lg whitespace-nowrap">
                              Ver <ChevronRight size={12} />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#e2e6ea] bg-[#f8f9fb] font-bold">
                      <td className="px-4 py-3 text-navy-600">Total {anio}</td>
                      <td className="px-4 py-3 text-right text-green-700 tabular-nums">{fmt(ventas)}</td>
                      <td className="px-4 py-3 text-right text-slate-500 tabular-nums">{fmt(costoVenta)}</td>
                      <td className="px-4 py-3 text-right text-teal-700 tabular-nums">{fmt(utilidadBruta)}</td>
                      <td className="px-4 py-3 text-right text-green-600 tabular-nums">{fmt(parteM)}</td>
                      <td className="px-4 py-3 text-right text-yellow-600 tabular-nums">{fmt(partem)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          {/* Lista de cobros — solo en vista mes */}
          {granul === 'mes' && <Card className="overflow-hidden p-0">
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
          </Card>}
        </>
      )}
    </div>
  )
}
