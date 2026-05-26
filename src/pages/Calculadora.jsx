import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Settings, RotateCcw, Plus, Trash2, BookMarked, Save, Pencil, Check } from 'lucide-react'
import Card from '../components/ui/Card'

// ── Plantillas (localStorage) ─────────────────────────────────────────────────
const PLANT_KEY = 'f3d_plantillas_v1'
const getPlantillas = () => { try { return JSON.parse(localStorage.getItem(PLANT_KEY) || '[]') } catch { return [] } }
const savePlantillas = (p) => localStorage.setItem(PLANT_KEY, JSON.stringify(p))


// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const uid = () => Math.random().toString(36).slice(2, 8)

// Convierte el valor de un <input type="number"> a número, permitiendo borrar
const toNum = v => (v === '' || v === undefined ? 0 : Number(v))

// ── Config por defecto ────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  filamento_rollo_precio: 90000,
  filamento_rollo_gramos: 1000,
  tarifa_hora: 15000,
  accesorios: [
    { id: 'acc_1', nombre: 'Anillo 12 mm',        precio: 100, unidad: 'ud' },
    { id: 'acc_2', nombre: 'Anillo 20 mm',        precio: 400, unidad: 'ud' },
    { id: 'acc_3', nombre: 'Anillo con cadenita', precio: 500, unidad: 'ud' },
  ],
  acabados: [
    { id: 'acb_1', nombre: 'Resina (A+B)', precio: 80, unidad: 'ml' },
  ],
}

// ── Receta por defecto ────────────────────────────────────────────────────────
const DEFAULT_RECETA = {
  nombre:      '',
  cantidad:    1,
  filamento_g: 0,
  tiempo_min:  0,
  accesorios:  [],  // [{ id, cantidad }]
  acabados:    [],  // [{ id, cantidad }]
  margen:      150,
  comision:    25,
}

// ── Fila de resultado ─────────────────────────────────────────────────────────
function FilaResultado({ label, valor, muted, bold, green, red, border }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${border ? 'border-t border-[#e2e6ea] mt-1 pt-2.5' : ''}`}>
      <span className={`text-xs ${muted ? 'text-[#8a9ab0]' : 'text-navy-600'} ${bold ? 'font-semibold' : ''}`}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${green ? 'text-green-600' : red ? 'text-red-500' : 'text-navy-600'}`}>{valor}</span>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Calculadora() {

  // Config (persiste en localStorage)
  const [config, setConfig] = useState(() => {
    try {
      const s = localStorage.getItem('f3d_calc_config_v2')
      if (!s) return DEFAULT_CONFIG
      const saved = JSON.parse(s)
      return {
        ...DEFAULT_CONFIG,
        ...saved,
        accesorios: saved.accesorios ?? DEFAULT_CONFIG.accesorios,
        acabados:   saved.acabados   ?? DEFAULT_CONFIG.acabados,
      }
    } catch { return DEFAULT_CONFIG }
  })

  const navigate = useNavigate()

  const [rec, setRec]                 = useState(DEFAULT_RECETA)
  const [showConfig, setShowConfig]   = useState(false)
  const [showPlant,  setShowPlant]    = useState(false)
  const [plantillas, setPlantillas]   = useState(getPlantillas)
  const [plantNombre, setPlantNombre] = useState('')
  const [saveModal,   setSaveModal]   = useState(false) // modal guardar plantilla
  const [editPlant,   setEditPlant]   = useState(null)  // { id, nombre } renombrar inline
  const [roundModal,  setRoundModal]  = useState(null)  // { precioExacto, precioCerrado, ctx }

  // Auto-save config
  useEffect(() => {
    localStorage.setItem('f3d_calc_config_v2', JSON.stringify(config))
  }, [config])

  // ── Helpers de edicion ────────────────────────────────────────────────────
  const updRec = (key, val) => setRec(r => ({ ...r, [key]: val }))
  const updCfg = (key, val) => setConfig(c => ({ ...c, [key]: val }))

  // Accesorios en receta
  const addAccRec    = () => {
    if (config.accesorios.length === 0) return
    setRec(r => ({ ...r, accesorios: [...r.accesorios, { id: config.accesorios[0].id, cantidad: 1 }] }))
  }
  const removeAccRec = i => setRec(r => ({ ...r, accesorios: r.accesorios.filter((_, j) => j !== i) }))
  const updAccRec    = (i, key, val) => setRec(r => ({
    ...r, accesorios: r.accesorios.map((a, j) => j === i ? { ...a, [key]: val } : a)
  }))

  // Acabados en receta
  const addAcbRec    = () => {
    if (config.acabados.length === 0) return
    setRec(r => ({ ...r, acabados: [...r.acabados, { id: config.acabados[0].id, cantidad: 0 }] }))
  }
  const removeAcbRec = i => setRec(r => ({ ...r, acabados: r.acabados.filter((_, j) => j !== i) }))
  const updAcbRec    = (i, key, val) => setRec(r => ({
    ...r, acabados: r.acabados.map((a, j) => j === i ? { ...a, [key]: val } : a)
  }))

  // Accesorios en config
  const addAccCfg    = () => setConfig(c => ({
    ...c, accesorios: [...c.accesorios, { id: uid(), nombre: 'Nuevo accesorio', precio: 0, unidad: 'ud' }]
  }))
  const removeAccCfg = id => setConfig(c => ({ ...c, accesorios: c.accesorios.filter(a => a.id !== id) }))
  const updAccCfg    = (id, key, val) => setConfig(c => ({
    ...c, accesorios: c.accesorios.map(a => a.id === id ? { ...a, [key]: val } : a)
  }))

  // Acabados en config
  const addAcbCfg    = () => setConfig(c => ({
    ...c, acabados: [...c.acabados, { id: uid(), nombre: 'Nuevo acabado', precio: 0, unidad: 'ud' }]
  }))
  const removeAcbCfg = id => setConfig(c => ({ ...c, acabados: c.acabados.filter(a => a.id !== id) }))
  const updAcbCfg    = (id, key, val) => setConfig(c => ({
    ...c, acabados: c.acabados.map(a => a.id === id ? { ...a, [key]: val } : a)
  }))

  // ── Plantillas ────────────────────────────────────────────────────────────
  function guardarPlantilla() {
    const nombre = plantNombre.trim() || rec.nombre || 'Plantilla'
    const nueva  = { id: Date.now(), nombre, rec: { ...rec } }
    const lista  = [...plantillas, nueva]
    setPlantillas(lista)
    savePlantillas(lista)
    setPlantNombre('')
    setSaveModal(false)
  }

  function cargarPlantilla(p) {
    setRec({ ...p.rec })
    setShowPlant(false)
  }

  function eliminarPlantilla(id) {
    const lista = plantillas.filter(p => p.id !== id)
    setPlantillas(lista)
    savePlantillas(lista)
  }

  function renombrarPlantilla(id) {
    const nombre = (editPlant?.nombre || '').trim()
    if (!nombre) { setEditPlant(null); return }
    const lista = plantillas.map(p => p.id === id ? { ...p, nombre } : p)
    setPlantillas(lista)
    savePlantillas(lista)
    setEditPlant(null)
  }

  // ── Navegar con precio elegido (cotización o cobro) ──────────────────────
  function navegarConPrecio(precio, ctx, destino = 'cotizacion') {
    setRoundModal(null)
    const { cantidad, accesoriosUsados, acabadosUsados, costoXUd, pctMayor, pctMenor, nombre } = ctx
    const _utilXUd = precio - costoXUd
    const _utilTot = _utilXUd * cantidad
    const fromCalculadora = {
      nombre,
      cantidad,
      precioSugerido: precio,
      detalle: '',
      receta_json: {
        producto: nombre,
        cantidad,
        precio_unitario: precio,
        accesorios_usados: accesoriosUsados,
        acabados_usados: acabadosUsados,
        costo_unitario:    Math.round(costoXUd),
        costo_total:       Math.round(costoXUd * cantidad),
        precio_total:      Math.round(precio * cantidad),
        utilidad_unitaria: Math.round(_utilXUd),
        utilidad_total:    Math.round(_utilTot),
        pct_mayor:         pctMayor,
        pct_menor:         pctMenor,
        parte_mayor:       Math.round(_utilTot * (pctMayor / 100)),
        parte_menor:       Math.round(_utilTot * (pctMenor / 100)),
      },
    }
    navigate(destino === 'cobro' ? '/cobros' : '/cotizaciones', { state: { fromCalculadora } })
  }

  // ── Helper compartido: calcular ctx y disparar modal o navegar ────────────
  function prepararYNavegar(destino) {
    const cantidad = rec.cantidad || 1
    const accesoriosUsados = rec.accesorios.map(a => {
      const item = config.accesorios.find(x => x.id === a.id)
      if (!item) return null
      return { nombre: item.nombre, unidad: item.unidad, cantidad_por_unidad: a.cantidad, cantidad_total: a.cantidad * cantidad }
    }).filter(Boolean)
    const acabadosUsados = rec.acabados.map(a => {
      const item = config.acabados.find(x => x.id === a.id)
      if (!item) return null
      return { nombre: item.nombre, unidad: item.unidad, cantidad_por_unidad: a.cantidad, cantidad_total: a.cantidad * cantidad }
    }).filter(Boolean)
    const _costoFil = rec.filamento_g > 0 ? (rec.filamento_g / config.filamento_rollo_gramos) * config.filamento_rollo_precio : 0
    const _costoTmp = (rec.tiempo_min / 60) * config.tarifa_hora
    const _costoAcc = rec.accesorios.reduce((s, a) => { const it = config.accesorios.find(x => x.id === a.id); return s + (it ? it.precio * a.cantidad : 0) }, 0)
    const _costoAcb = rec.acabados.reduce((s, a) => { const it = config.acabados.find(x => x.id === a.id); return s + (it ? it.precio * a.cantidad : 0) }, 0)
    const _costoXUd = _costoFil + _costoAcc + _costoAcb + _costoTmp
    const precioExacto  = _costoXUd * (1 + rec.margen / 100)
    const precioCerrado = Math.ceil(precioExacto / 100) * 100
    const ctx = {
      nombre:           rec.nombre || 'Producto 3D',
      cantidad,
      accesoriosUsados,
      acabadosUsados,
      costoXUd:         _costoXUd,
      pctMayor:         100 - rec.comision,
      pctMenor:         rec.comision,
    }
    if (precioCerrado === Math.round(precioExacto)) {
      navegarConPrecio(precioExacto, ctx, destino)
    } else {
      setRoundModal({ precioExacto, precioCerrado, ctx, destino })
    }
  }

  function irACotizacion() { prepararYNavegar('cotizacion') }
  function irACobro()      { prepararYNavegar('cobro') }

  // ── Calculos ──────────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const costoFilamento = rec.filamento_g > 0
      ? (rec.filamento_g / config.filamento_rollo_gramos) * config.filamento_rollo_precio
      : 0
    const costoTiempo = (rec.tiempo_min / 60) * config.tarifa_hora

    const costoAccesorios = rec.accesorios.reduce((s, a) => {
      const item = config.accesorios.find(x => x.id === a.id)
      return s + (item ? item.precio * a.cantidad : 0)
    }, 0)

    const costoAcabados = rec.acabados.reduce((s, a) => {
      const item = config.acabados.find(x => x.id === a.id)
      return s + (item ? item.precio * a.cantidad : 0)
    }, 0)

    const costoXUnidad   = costoFilamento + costoAccesorios + costoAcabados + costoTiempo
    const costoTotal     = costoXUnidad * (rec.cantidad || 1)
    const precioSugerido = costoXUnidad * (1 + rec.margen / 100)
    const precioTotal    = precioSugerido * (rec.cantidad || 1)
    const utilidad       = precioSugerido - costoXUnidad
    const utilidadTotal  = utilidad * (rec.cantidad || 1)

    const pctMenor    = rec.comision
    const pctMayor    = 100 - rec.comision
    const parteA      = utilidad * (pctMayor / 100)
    const parteB      = utilidad * (pctMenor / 100)
    const parteATotal = parteA * (rec.cantidad || 1)
    const parteBTotal = parteB * (rec.cantidad || 1)

    return {
      costoFilamento, costoTiempo,
      costoAccesorios, costoAcabados,
      costoXUnidad, costoTotal,
      precioSugerido, precioTotal,
      utilidad, utilidadTotal,
      pctMenor, pctMayor,
      parteA, parteB, parteATotal, parteBTotal,
    }
  }, [rec, config])

  const cero = calc.costoXUnidad === 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Calculadora de precios</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Calcula el costo y precio sugerido de cualquier producto</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPlant(v => !v)}
            className={`flex items-center gap-1.5 text-xs transition-colors border rounded-lg px-3 py-2 ${
              showPlant ? 'bg-accent text-white border-accent' : 'text-[#8a9ab0] hover:text-navy-600 border-[#e2e6ea]'
            }`}
          >
            <BookMarked size={13} />
            Plantillas {plantillas.length > 0 && `(${plantillas.length})`}
          </button>
          <button
            onClick={() => setRec(DEFAULT_RECETA)}
            className="flex items-center gap-1.5 text-xs text-[#8a9ab0] hover:text-navy-600 transition-colors border border-[#e2e6ea] rounded-lg px-3 py-2"
          >
            <RotateCcw size={13} /> Reiniciar
          </button>
        </div>
      </div>

      {/* Panel plantillas */}
      {showPlant && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0]">Mis plantillas</p>
            {!cero && (
              <button
                onClick={() => { setPlantNombre(rec.nombre || ''); setSaveModal(true) }}
                className="flex items-center gap-1.5 text-xs font-semibold bg-accent text-white rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity"
              >
                <Save size={12} /> Guardar actual
              </button>
            )}
          </div>

          {plantillas.length === 0 ? (
            <p className="text-xs text-[#8a9ab0] text-center py-4">
              {cero ? 'Configura un producto y guárdalo como plantilla.' : 'Aún no tienes plantillas guardadas.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {plantillas.map(p => (
                <div key={p.id} className="border border-[#e2e6ea] rounded-lg hover:border-accent/40 transition-colors">
                  {editPlant?.id === p.id ? (
                    /* ── Modo renombrar ── */
                    <div className="flex items-center gap-2 p-2.5">
                      <input
                        autoFocus
                        value={editPlant.nombre}
                        onChange={e => setEditPlant(ep => ({ ...ep, nombre: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter')  renombrarPlantilla(p.id)
                          if (e.key === 'Escape') setEditPlant(null)
                        }}
                        className="flex-1 border border-accent/50 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                      <button onClick={() => renombrarPlantilla(p.id)}
                        className="p-1.5 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity shrink-0">
                        <Check size={13} />
                      </button>
                      <button onClick={() => setEditPlant(null)}
                        className="p-1.5 rounded-lg text-[#8a9ab0] hover:bg-[#f0f2f5] transition-colors shrink-0">
                        ✕
                      </button>
                    </div>
                  ) : (
                    /* ── Vista normal ── */
                    <div className="flex items-center justify-between gap-2 p-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-600 truncate">{p.nombre}</p>
                        <p className="text-xs text-[#8a9ab0]">
                          {p.rec.filamento_g > 0 && `${p.rec.filamento_g}g · `}
                          {p.rec.tiempo_min > 0 && `${p.rec.tiempo_min}min · `}
                          {p.rec.accesorios?.length > 0 && `${p.rec.accesorios.length} acc · `}
                          Margen {p.rec.margen}%
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => cargarPlantilla(p)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent font-medium hover:bg-accent/20 transition-colors">
                          Cargar
                        </button>
                        <button onClick={() => setEditPlant({ id: p.id, nombre: p.nombre })}
                          className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-navy-600 hover:bg-[#f0f2f5] transition-colors"
                          title="Renombrar">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => eliminarPlantilla(p.id)}
                          className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5">

        {/* ── Columna izquierda: Inputs ───────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Producto */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0] mb-3">Producto</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Nombre del producto</label>
                <input
                  type="text" value={rec.nombre}
                  onChange={e => updRec('nombre', e.target.value)}
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy-600 mb-1">
                    Cantidad <span className="text-[#8a9ab0] font-normal">(unidades)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number" min={0}
                      value={rec.cantidad || ''}
                      onChange={e => updRec('cantidad', toNum(e.target.value))}
                      placeholder="0"
                      className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">uds</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-600 mb-1">
                    Margen <span className="text-[#8a9ab0] font-normal">(sobre costo)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number" min={0} max={500}
                      value={rec.margen || ''}
                      onChange={e => updRec('margen', toNum(e.target.value))}
                      placeholder="0"
                      className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">%</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Materiales base */}
          <Card>
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0]">Materiales base</p>
              <span className="text-[11px] text-[#8a9ab0]">valores por 1 unidad</span>
            </div>
            <div className="flex flex-col gap-4">

              {/* Filamento */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-navy-600">Filamento</label>
                  {rec.filamento_g > 0 && (
                    <span className="text-xs text-accent font-semibold">{fmt(calc.costoFilamento)}/ud</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number" min={0} step={0.5}
                    value={rec.filamento_g || ''}
                    onChange={e => updRec('filamento_g', toNum(e.target.value))}
                    placeholder="0"
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">g</span>
                </div>
                {rec.filamento_g > 0 && (
                  <p className="text-[11px] text-[#8a9ab0] mt-1">
                    {rec.filamento_g}g de {config.filamento_rollo_gramos}g · rollo {fmt(config.filamento_rollo_precio)}
                  </p>
                )}
              </div>

              {/* Tiempo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-navy-600">Tiempo de impresion</label>
                  {rec.tiempo_min > 0 && (
                    <span className="text-xs text-accent font-semibold">{fmt(calc.costoTiempo)}/ud</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number" min={0} step={5}
                    value={rec.tiempo_min || ''}
                    onChange={e => updRec('tiempo_min', toNum(e.target.value))}
                    placeholder="0"
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">min</span>
                </div>
                {rec.tiempo_min > 0 && (
                  <p className="text-[11px] text-[#8a9ab0] mt-1">
                    {(rec.tiempo_min / 60).toFixed(2)} h × {fmt(config.tarifa_hora)}/h
                  </p>
                )}
              </div>

            </div>
          </Card>

          {/* Accesorios */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0]">Accesorios</p>
                <span className="text-[11px] text-[#8a9ab0]">por 1 unidad</span>
              </div>
              {calc.costoAccesorios > 0 && (
                <span className="text-xs text-accent font-semibold">{fmt(calc.costoAccesorios)}/ud</span>
              )}
            </div>

            {config.accesorios.length === 0 ? (
              <p className="text-xs text-[#8a9ab0]">
                No hay accesorios configurados.{' '}
                <button onClick={() => setShowConfig(true)} className="text-accent underline">Agregar en config</button>
              </p>
            ) : (
              <>
                {rec.accesorios.length === 0 && (
                  <p className="text-xs text-[#8a9ab0] mb-2">Sin accesorios para esta unidad</p>
                )}
                <div className="flex flex-col gap-2">
                  {rec.accesorios.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={a.id}
                        onChange={e => updAccRec(i, 'id', e.target.value)}
                        className="flex-1 border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                      >
                        {config.accesorios.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.nombre} · {fmt(o.precio)}/{o.unidad}
                          </option>
                        ))}
                      </select>
                      <div className="relative w-20 shrink-0">
                        <input
                          type="number" min={0}
                          value={a.cantidad || ''}
                          onChange={e => updAccRec(i, 'cantidad', toNum(e.target.value))}
                          placeholder="0"
                          className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">ud</span>
                      </div>
                      <button
                        onClick={() => removeAccRec(i)}
                        className="p-2 rounded-lg text-[#8a9ab0] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      >✕</button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addAccRec}
                  className="mt-2 text-xs text-accent hover:text-accent/80 font-medium transition-colors flex items-center gap-1"
                >
                  + Agregar accesorio
                </button>
              </>
            )}
          </Card>

          {/* Acabado */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0]">Acabado</p>
                <span className="text-[11px] text-[#8a9ab0]">por 1 unidad</span>
              </div>
              {calc.costoAcabados > 0 && (
                <span className="text-xs text-accent font-semibold">{fmt(calc.costoAcabados)}/ud</span>
              )}
            </div>

            {config.acabados.length === 0 ? (
              <p className="text-xs text-[#8a9ab0]">
                No hay acabados configurados.{' '}
                <button onClick={() => setShowConfig(true)} className="text-accent underline">Agregar en config</button>
              </p>
            ) : (
              <>
                {rec.acabados.length === 0 && (
                  <p className="text-xs text-[#8a9ab0] mb-2">Sin acabados para esta unidad</p>
                )}
                <div className="flex flex-col gap-2">
                  {rec.acabados.map((a, i) => {
                    const cfgItem = config.acabados.find(x => x.id === a.id)
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={a.id}
                          onChange={e => updAcbRec(i, 'id', e.target.value)}
                          className="flex-1 border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                        >
                          {config.acabados.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.nombre} · {fmt(o.precio)}/{o.unidad}
                            </option>
                          ))}
                        </select>
                        <div className="relative w-24 shrink-0">
                          <input
                            type="number" min={0} step={0.5}
                            value={a.cantidad || ''}
                            onChange={e => updAcbRec(i, 'cantidad', toNum(e.target.value))}
                            placeholder="0"
                            className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">
                            {cfgItem?.unidad || ''}
                          </span>
                        </div>
                        <button
                          onClick={() => removeAcbRec(i)}
                          className="p-2 rounded-lg text-[#8a9ab0] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        >✕</button>
                      </div>
                    )
                  })}
                </div>
                <button
                  onClick={addAcbRec}
                  className="mt-2 text-xs text-accent hover:text-accent/80 font-medium transition-colors flex items-center gap-1"
                >
                  + Agregar acabado
                </button>
              </>
            )}
          </Card>

        </div>

        {/* ── Columna derecha: Resultados ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Por unidad */}
          <Card className={`transition-all ${cero ? 'opacity-60' : ''}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0] mb-3">
              Por unidad {rec.nombre ? `· ${rec.nombre}` : ''}
            </p>
            <div className="bg-[#f8f9fb] rounded-lg px-3 py-2 mb-3">
              {calc.costoFilamento > 0 && (
                <FilaResultado label={`Filamento (${rec.filamento_g}g)`} valor={fmt(calc.costoFilamento)} muted />
              )}
              {rec.accesorios.map((a, i) => {
                const item = config.accesorios.find(x => x.id === a.id)
                return item ? (
                  <FilaResultado key={i}
                    label={`${item.nombre} ×${a.cantidad}`}
                    valor={fmt(item.precio * a.cantidad)} muted />
                ) : null
              })}
              {rec.acabados.map((a, i) => {
                const item = config.acabados.find(x => x.id === a.id)
                return item ? (
                  <FilaResultado key={i}
                    label={`${item.nombre} (${a.cantidad} ${item.unidad})`}
                    valor={fmt(item.precio * a.cantidad)} muted />
                ) : null
              })}
              {calc.costoTiempo > 0 && (
                <FilaResultado label={`Tiempo (${rec.tiempo_min} min)`} valor={fmt(calc.costoTiempo)} muted />
              )}
              {cero && (
                <p className="text-xs text-[#8a9ab0] text-center py-1">Ingresa los materiales de la izquierda</p>
              )}
            </div>

            <FilaResultado label="Costo de produccion" valor={fmt(calc.costoXUnidad)} bold />
            <div className="my-2 border-t border-dashed border-[#e2e6ea]" />
            <FilaResultado label={`Precio sugerido (+${rec.margen}%)`} valor={fmt(calc.precioSugerido)} bold green />
            <FilaResultado label="Utilidad por pieza" valor={fmt(calc.utilidad)} bold />
            {rec.comision > 0 && (
              <div className="mt-1 bg-[#f8f9fb] rounded-lg px-3 py-1.5">
                <FilaResultado label={`${calc.pctMayor}%`} valor={fmt(calc.parteA)} muted />
                <FilaResultado label={`${calc.pctMenor}%`} valor={fmt(calc.parteB)} muted />
              </div>
            )}
          </Card>

          {/* Para N unidades */}
          <div
            className={`rounded-xl p-4 transition-all ${cero ? 'opacity-60' : ''}`}
            style={{ backgroundColor: '#142236' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#93c5fd' }}>
              Para {rec.cantidad || 1} unidad{(rec.cantidad || 1) !== 1 ? 'es' : ''}
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm" style={{ color: '#bfdbfe' }}>Costo total materiales</span>
                <span className="text-base font-bold" style={{ color: '#ffffff' }}>{fmt(calc.costoTotal)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm" style={{ color: '#bfdbfe' }}>Total a cobrar al cliente</span>
                <span className="text-2xl font-bold" style={{ color: '#ffffff' }}>{fmt(calc.precioTotal)}</span>
              </div>
              <div className="h-px" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold" style={{ color: '#bfdbfe' }}>Utilidad total</span>
                <span className="text-xl font-bold" style={{ color: '#ffffff' }}>{fmt(calc.utilidadTotal)}</span>
              </div>
              {rec.comision > 0 && (
                <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm" style={{ color: '#bfdbfe' }}>{calc.pctMayor}%</span>
                    <span className="text-base font-bold" style={{ color: '#4ade80' }}>{fmt(calc.parteATotal)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm" style={{ color: '#bfdbfe' }}>{calc.pctMenor}%</span>
                    <span className="text-base font-bold" style={{ color: '#fcd34d' }}>{fmt(calc.parteBTotal)}</span>
                  </div>
                </div>
              )}
            </div>
            {/* Botones acción */}
            {!cero && (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={irACotizacion}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
                >
                  Generar cotización →
                </button>
                <button
                  onClick={irACobro}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: '#10b981', color: '#ffffff' }}
                >
                  Generar cobro →
                </button>
                <button
                  onClick={() => { setPlantNombre(rec.nombre || ''); setSaveModal(true) }}
                  className="w-full py-2 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.2)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Save size={12} /> Guardar como plantilla
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Modal: guardar plantilla ─────────────────────────────────────────── */}
      {saveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setSaveModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-base font-bold text-navy-600 mb-1">Guardar como plantilla</p>
            <p className="text-xs text-[#8a9ab0] mb-4">
              Ponle un nombre para identificarla fácilmente.
            </p>
            <input
              autoFocus
              value={plantNombre}
              onChange={e => setPlantNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && guardarPlantilla()}
              placeholder={rec.nombre || 'Ej: Llavero estándar 15g'}
              className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setSaveModal(false)}
                className="flex-1 py-2.5 text-sm text-[#8a9ab0] border border-[#e2e6ea] rounded-xl hover:border-[#c8cdd5] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPlantilla}
                className="flex-1 py-2.5 text-sm font-semibold bg-accent text-white rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <Save size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: cerrar precio a miles ─────────────────────────────────────── */}
      {roundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setRoundModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Título */}
            <p className="text-base font-bold text-navy-600 mb-1">¿Cerrar el precio?</p>
            <p className="text-xs text-[#8a9ab0] mb-5">
              Elige con cuál precio generas la cotización.
            </p>

            {/* Comparativa */}
            <div className="flex flex-col gap-3 mb-5">
              {/* Precio cerrado (sugerido) */}
              <button
                onClick={() => navegarConPrecio(roundModal.precioCerrado, roundModal.ctx, roundModal.destino)}
                className="flex items-center justify-between gap-3 w-full rounded-xl border-2 border-accent bg-accent/5 px-4 py-3 hover:bg-accent/10 transition-colors text-left"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent mb-0.5">Precio cerrado</p>
                  <p className="text-2xl font-bold text-navy-600">{fmt(roundModal.precioCerrado)}</p>
                  <p className="text-[11px] text-[#8a9ab0] mt-0.5">
                    +{fmt(roundModal.precioCerrado - roundModal.precioExacto)} sobre el exacto
                  </p>
                </div>
                <div className="shrink-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </button>

              {/* Precio exacto */}
              <button
                onClick={() => navegarConPrecio(roundModal.precioExacto, roundModal.ctx, roundModal.destino)}
                className="flex items-center justify-between gap-3 w-full rounded-xl border border-[#e2e6ea] bg-[#f8f9fb] px-4 py-3 hover:border-[#c8cdd5] transition-colors text-left"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a9ab0] mb-0.5">Precio exacto</p>
                  <p className="text-xl font-bold text-navy-600">{fmt(roundModal.precioExacto)}</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setRoundModal(null)}
              className="w-full text-xs text-[#8a9ab0] hover:text-navy-600 transition-colors py-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Configurar precios base (colapsable) ─────────────────────────────── */}
      <div className="mt-5">
        <button
          onClick={() => setShowConfig(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-[#8a9ab0] hover:text-navy-600 transition-colors"
        >
          <Settings size={15} />
          Configurar precios base
          {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showConfig && (
          <Card className="mt-3">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs text-[#8a9ab0]">Actualiza cuando cambien los precios de tu proveedor.</p>
              <span className="text-xs text-green-600 font-medium">✓ Guardado automaticamente</span>
            </div>

            {/* Materiales base */}
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a9ab0] mb-3">Materiales base</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {[
                ['filamento_rollo_precio', 'Rollo filamento 1 kg'],
                ['tarifa_hora',            'Costo maquina · hora'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-navy-600 mb-1">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">$</span>
                    <input
                      type="number" min={0}
                      value={config[key] || ''}
                      onChange={e => updCfg(key, toNum(e.target.value))}
                      placeholder="0"
                      className="w-full border border-[#e2e6ea] rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Accesorios */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a9ab0]">Accesorios</p>
              <button
                onClick={addAccCfg}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium transition-colors border border-accent/30 rounded-lg px-2.5 py-1"
              >
                <Plus size={11} /> Agregar
              </button>
            </div>
            <div className="flex flex-col gap-2 mb-6">
              {config.accesorios.length === 0 && (
                <p className="text-xs text-[#8a9ab0]">Sin accesorios</p>
              )}
              {config.accesorios.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <input
                    type="text" value={a.nombre}
                    onChange={e => updAccCfg(a.id, 'nombre', e.target.value)}
                    placeholder="Nombre del accesorio"
                    className="flex-1 border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">$</span>
                    <input
                      type="number" min={0}
                      value={a.precio || ''}
                      onChange={e => updAccCfg(a.id, 'precio', toNum(e.target.value))}
                      placeholder="0"
                      className="w-full border border-[#e2e6ea] rounded-lg pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                  <input
                    type="text" value={a.unidad}
                    onChange={e => updAccCfg(a.id, 'unidad', e.target.value)}
                    placeholder="ud"
                    className="w-14 border border-[#e2e6ea] rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    onClick={() => removeAccCfg(a.id)}
                    className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Acabados */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a9ab0]">Acabados</p>
              <button
                onClick={addAcbCfg}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium transition-colors border border-accent/30 rounded-lg px-2.5 py-1"
              >
                <Plus size={11} /> Agregar
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {config.acabados.length === 0 && (
                <p className="text-xs text-[#8a9ab0]">Sin acabados</p>
              )}
              {config.acabados.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <input
                    type="text" value={a.nombre}
                    onChange={e => updAcbCfg(a.id, 'nombre', e.target.value)}
                    placeholder="Nombre del acabado"
                    className="flex-1 border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">$</span>
                    <input
                      type="number" min={0}
                      value={a.precio || ''}
                      onChange={e => updAcbCfg(a.id, 'precio', toNum(e.target.value))}
                      placeholder="0"
                      className="w-full border border-[#e2e6ea] rounded-lg pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                  <input
                    type="text" value={a.unidad}
                    onChange={e => updAcbCfg(a.id, 'unidad', e.target.value)}
                    placeholder="ml"
                    className="w-14 border border-[#e2e6ea] rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    onClick={() => removeAcbCfg(a.id)}
                    className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

          </Card>
        )}
      </div>
    </div>
  )
}
