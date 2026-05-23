import { useState, useMemo, useEffect } from 'react'
import { Calculator, ChevronDown, ChevronUp, Settings, RotateCcw, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

// ── Precios base (editables, persisten en localStorage) ───────────────────────
const DEFAULT_CONFIG = {
  filamento_rollo_precio: 90000,   // COP por rollo de 1 kg
  filamento_rollo_gramos: 1000,    // gramos del rollo
  anillo_12mm_precio:     100,     // COP por unidad
  anillo_20mm_precio:     400,
  anillo_cadena_precio:   500,
  resina_litro_precio:    80000,   // COP por litro (A+B combinado)
  tarifa_hora:            15000,   // COP por hora de trabajo (operario)
}

// ── Receta por defecto (lo que usa 1 pieza) ───────────────────────────────────
const DEFAULT_RECETA = {
  nombre:      '',
  cantidad:    1,
  filamento_g: 0,
  anillos:     [],   // [{ tipo: '12mm'|'20mm'|'cadena', cantidad: 1 }]
  resina_ml:   0,
  tiempo_min:  0,
  margen:      50,
  comision:    25,
}

const ANILLO_OPCIONES = [
  { id: '12mm',   label: 'Anillo 12 mm' },
  { id: '20mm',   label: 'Anillo 20 mm' },
  { id: 'cadena', label: 'Anillo con cadenita' },
]

// ── Campo de entrada reutilizable ─────────────────────────────────────────────
function Campo({ label, sublabel, value, onChange, type = 'number', min = 0, step = 1, suffix, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-navy-600 mb-1">
        {label}
        {sublabel && <span className="text-[#8a9ab0] font-normal ml-1">({sublabel})</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          min={min}
          step={step}
          className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 pr-10"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0] pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  )
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
  const navigate = useNavigate()

  // Config de precios (persiste en localStorage)
  const [config, setConfig] = useState(() => {
    try {
      const s = localStorage.getItem('f3d_calc_config')
      return s ? { ...DEFAULT_CONFIG, ...JSON.parse(s) } : DEFAULT_CONFIG
    } catch { return DEFAULT_CONFIG }
  })

  // Receta (inputs de la calculadora)
  const [rec, setRec] = useState(DEFAULT_RECETA)

  // UI
  const [showConfig, setShowConfig] = useState(false)

  // Persistir config
  useEffect(() => {
    localStorage.setItem('f3d_calc_config', JSON.stringify(config))
  }, [config])

  // Helpers de edicion
  const updRec = (key, val) => setRec(r => ({ ...r, [key]: val }))
  const updCfg = (key, val) => setConfig(c => ({ ...c, [key]: val }))

  // Anillos dinamicos
  const addAnillo    = () => setRec(r => ({ ...r, anillos: [...r.anillos, { tipo: '12mm', cantidad: 1 }] }))
  const removeAnillo = i  => setRec(r => ({ ...r, anillos: r.anillos.filter((_, j) => j !== i) }))
  const updAnillo    = (i, key, val) => setRec(r => ({
    ...r, anillos: r.anillos.map((a, j) => j === i ? { ...a, [key]: val } : a)
  }))

  // ── Calculos ────────────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const costoFilamento =
      rec.filamento_g > 0
        ? (rec.filamento_g / config.filamento_rollo_gramos) * config.filamento_rollo_precio
        : 0

    const precioAnillo = tipo =>
      tipo === '12mm'   ? config.anillo_12mm_precio  :
      tipo === '20mm'   ? config.anillo_20mm_precio  :
      tipo === 'cadena' ? config.anillo_cadena_precio : 0

    const costoAnillos = rec.anillos.reduce((s, a) => s + precioAnillo(a.tipo) * a.cantidad, 0)
    const costoResina  = (rec.resina_ml / 1000) * config.resina_litro_precio
    const costoTiempo  = (rec.tiempo_min / 60)  * config.tarifa_hora

    const costoXUnidad = costoFilamento + costoAnillos + costoResina + costoTiempo

    const costoTotal   = costoXUnidad * rec.cantidad

    // margen sobre costo (markup), no sobre precio
    const precioSugerido = rec.margen < 100
      ? costoXUnidad * (1 + rec.margen / 100)
      : costoXUnidad * 2

    const precioTotal      = precioSugerido * rec.cantidad
    const utilidadBruta    = precioSugerido - costoXUnidad
    const comisionXUnidad  = utilidadBruta * (rec.comision / 100)
    const utilidadNeta     = utilidadBruta - comisionXUnidad
    const utilidadNetaTotal = utilidadNeta * rec.cantidad
    const margenReal       = costoXUnidad > 0 ? Math.round((utilidadNeta / precioSugerido) * 100) : 0

    return {
      costoFilamento, costoAnillos, costoResina, costoTiempo,
      costoXUnidad, costoTotal,
      precioSugerido, precioTotal,
      utilidadBruta, comisionXUnidad,
      utilidadNeta, utilidadNetaTotal, margenReal,
      precioAnillo,
    }
  }, [rec, config])

  const cero = calc.costoXUnidad === 0

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Calculadora de precios</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Calcula el costo y precio sugerido de cualquier producto</p>
        </div>
        <button
          onClick={() => { setRec(DEFAULT_RECETA) }}
          className="flex items-center gap-1.5 text-xs text-[#8a9ab0] hover:text-navy-600 transition-colors border border-[#e2e6ea] rounded-lg px-3 py-2"
        >
          <RotateCcw size={13} /> Reiniciar
        </button>
      </div>

      {/* Grid principal */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* ── Columna izquierda: Inputs ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Producto */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0] mb-3">Producto</p>
            <div className="grid grid-cols-2 gap-3">
              <Campo
                label="Nombre del producto"
                value={rec.nombre}
                onChange={v => updRec('nombre', v)}
                type="text"
                className="col-span-2"
              />
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">
                  Cantidad a producir <span className="text-[#8a9ab0] font-normal">(unidades)</span>
                </label>
                <div className="relative">
                  <input
                    type="number" min={0} value={rec.cantidad === 0 ? '' : rec.cantidad}
                    onChange={e => updRec('cantidad', e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="1"
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">uds</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">
                  Margen de ganancia <span className="text-[#8a9ab0] font-normal">(sobre costo)</span>
                </label>
                <div className="relative">
                  <input
                    type="number" min={0} max={500} value={rec.margen}
                    onChange={e => updRec('margen', Number(e.target.value))}
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">%</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Materiales */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0] mb-3">Materiales por unidad</p>
            <div className="flex flex-col gap-4">

              {/* Filamento */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-navy-600">Filamento</label>
                  {rec.filamento_g > 0 && (
                    <span className="text-xs text-accent font-semibold">
                      {fmt(calc.costoFilamento)}/ud
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number" min={0} step={0.5} value={rec.filamento_g}
                    onChange={e => updRec('filamento_g', Number(e.target.value))}
                    placeholder="0"
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">g</span>
                </div>
                {rec.filamento_g > 0 && (
                  <p className="text-[11px] text-[#8a9ab0] mt-1">
                    {rec.filamento_g}g de {config.filamento_rollo_gramos}g · rollo {fmt(config.filamento_rollo_precio)}
                  </p>
                )}
              </div>

              {/* Anillos — lista dinámica */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-navy-600">Anillos / accesorios</label>
                  {calc.costoAnillos > 0 && (
                    <span className="text-xs text-accent font-semibold">{fmt(calc.costoAnillos)}/ud</span>
                  )}
                </div>

                {rec.anillos.length === 0 && (
                  <p className="text-xs text-[#8a9ab0] mb-2">Sin anillos agregados</p>
                )}

                <div className="flex flex-col gap-2">
                  {rec.anillos.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={a.tipo}
                        onChange={e => updAnillo(i, 'tipo', e.target.value)}
                        className="flex-1 border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                      >
                        {ANILLO_OPCIONES.map(o => (
                          <option key={o.id} value={o.id}>{o.label} · {fmt(calc.precioAnillo(o.id))}</option>
                        ))}
                      </select>
                      <div className="relative w-20 shrink-0">
                        <input
                          type="number" min={1} value={a.cantidad}
                          onChange={e => updAnillo(i, 'cantidad', Math.max(1, Number(e.target.value)))}
                          className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">ud</span>
                      </div>
                      <button
                        onClick={() => removeAnillo(i)}
                        className="p-2 rounded-lg text-[#8a9ab0] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addAnillo}
                  className="mt-2 text-xs text-accent hover:text-accent/80 font-medium transition-colors flex items-center gap-1"
                >
                  + Agregar anillo
                </button>
              </div>

              {/* Resina */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-navy-600">Resina (A+B)</label>
                  {rec.resina_ml > 0 && (
                    <span className="text-xs text-accent font-semibold">{fmt(calc.costoResina)}/ud</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number" min={0} step={0.5} value={rec.resina_ml}
                    onChange={e => updRec('resina_ml', Number(e.target.value))}
                    placeholder="0"
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">ml</span>
                </div>
              </div>

              {/* Tiempo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-navy-600">Tiempo de produccion</label>
                  {rec.tiempo_min > 0 && (
                    <span className="text-xs text-accent font-semibold">{fmt(calc.costoTiempo)}/ud</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number" min={0} step={5} value={rec.tiempo_min}
                    onChange={e => updRec('tiempo_min', Number(e.target.value))}
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
        </div>

        {/* ── Columna derecha: Resultados ───────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Resultados por unidad */}
          <Card className={`transition-all ${cero ? 'opacity-60' : ''}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0] mb-3">
              Por unidad {rec.nombre ? `· ${rec.nombre}` : ''}
            </p>

            {/* Desglose de costos */}
            <div className="bg-[#f8f9fb] rounded-lg px-3 py-2 mb-3">
              {calc.costoFilamento > 0 && (
                <FilaResultado label={`Filamento (${rec.filamento_g}g)`} valor={fmt(calc.costoFilamento)} muted />
              )}
              {rec.anillos.map((a, i) => (
                <FilaResultado
                  key={i}
                  label={`${ANILLO_OPCIONES.find(o => o.id === a.tipo)?.label} ×${a.cantidad}`}
                  valor={fmt(calc.precioAnillo(a.tipo) * a.cantidad)} muted
                />
              ))}
              {calc.costoResina > 0 && (
                <FilaResultado label={`Resina (${rec.resina_ml}ml)`} valor={fmt(calc.costoResina)} muted />
              )}
              {calc.costoTiempo > 0 && (
                <FilaResultado label={`Tiempo (${rec.tiempo_min}min)`} valor={fmt(calc.costoTiempo)} muted />
              )}
              {cero && (
                <p className="text-xs text-[#8a9ab0] text-center py-1">Ingresa los materiales de la izquierda</p>
              )}
            </div>

            <FilaResultado label="Costo de produccion" valor={fmt(calc.costoXUnidad)} bold />

            <div className="my-2 border-t border-dashed border-[#e2e6ea]" />

            <FilaResultado label={`Precio sugerido (+${rec.margen}%)`} valor={fmt(calc.precioSugerido)} bold green />
            <FilaResultado label="Utilidad bruta" valor={fmt(calc.utilidadBruta)} muted />
            {rec.comision > 0 && (
              <FilaResultado label={`Comision vendedor (${rec.comision}%)`} valor={`- ${fmt(calc.comisionXUnidad)}`} muted red />
            )}
            <FilaResultado label="Utilidad neta / pieza" valor={fmt(calc.utilidadNeta)} bold green />
          </Card>

          {/* Resultados para N unidades */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#142236', border: '1px solid #142236' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#93c5fd' }}>
              Para {rec.cantidad || 1} unidad{(rec.cantidad || 1) !== 1 ? 'es' : ''}
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm" style={{ color: '#bfdbfe' }}>Costo total materiales</span>
                <span className="text-base font-bold text-white">{fmt(calc.costoTotal)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm" style={{ color: '#bfdbfe' }}>Total a cobrar al cliente</span>
                <span className="text-2xl font-bold text-white">{fmt(calc.precioTotal)}</span>
              </div>
              {rec.comision > 0 && (
                <div className="flex justify-between items-baseline">
                  <span className="text-sm" style={{ color: '#bfdbfe' }}>Comision Andres ({rec.comision}%)</span>
                  <span className="text-base font-bold" style={{ color: '#fcd34d' }}>- {fmt(calc.comisionXUnidad * (rec.cantidad || 1))}</span>
                </div>
              )}
              <div className="h-px my-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold" style={{ color: '#bfdbfe' }}>Tu utilidad neta total</span>
                <span className="text-xl font-bold" style={{ color: '#4ade80' }}>{fmt(calc.utilidadNetaTotal)}</span>
              </div>
            </div>

            {!cero && (
              <button
                onClick={() => navigate('/cotizaciones?new=1')}
                className="mt-4 w-full flex items-center justify-center gap-2 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              >
                <FileText size={15} /> Crear cotizacion con este precio
              </button>
            )}
          </div>

          {/* Comision del vendedor */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0] mb-3">Comision vendedor</p>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">
                % sobre utilidad bruta
                <span className="text-[#8a9ab0] font-normal ml-1">(Andres: 25% por defecto)</span>
              </label>
              <div className="relative">
                <input
                  type="number" min={0} max={100} value={rec.comision}
                  onChange={e => updRec('comision', Number(e.target.value))}
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Configuracion de precios base (colapsable) ──────────────────────── */}
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
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[#8a9ab0]">
                Actualiza cuando cambien los precios de tu proveedor.
              </p>
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                ✓ Guardado automaticamente
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['filamento_rollo_precio', 'Rollo filamento 1 kg'],
                ['anillo_12mm_precio',     'Anillo 12 mm · unidad'],
                ['anillo_20mm_precio',     'Anillo 20 mm · unidad'],
                ['anillo_cadena_precio',   'Anillo con cadenita · unidad'],
                ['resina_litro_precio',    'Resina (A+B) · litro'],
                ['tarifa_hora',            'Mano de obra · hora'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-navy-600 mb-1">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">$</span>
                    <input type="number" min={0} value={config[key]}
                      onChange={e => updCfg(key, Number(e.target.value))}
                      className="w-full border border-[#e2e6ea] rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
