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
  goma_barra_precio:      2000,    // COP por barra de goma magica
  alcohol_litro_precio:   8000,    // COP por litro de alcohol
  tarifa_hora:            15000,   // COP por hora de trabajo (operario)
}

// ── Receta por defecto (lo que usa 1 pieza) ───────────────────────────────────
const DEFAULT_RECETA = {
  nombre:          '',
  cantidad:        1,
  filamento_g:     0,
  anillo_tipo:     'ninguno',   // 'ninguno' | '12mm' | '20mm' | 'cadena'
  anillo_cantidad: 1,
  resina_ml:       0,
  goma_barras:     0,
  alcohol_ml:      0,
  tiempo_min:      0,
  margen:          40,          // % margen sobre costo
  comision:        25,          // % comision vendedor sobre utilidad bruta
}

const ANILLO_OPCIONES = [
  { id: 'ninguno', label: 'Sin anillo' },
  { id: '12mm',    label: 'Anillo 12 mm' },
  { id: '20mm',    label: 'Anillo 20 mm' },
  { id: 'cadena',  label: 'Anillo con cadenita' },
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

  // ── Calculos ────────────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const costoFilamento =
      rec.filamento_g > 0
        ? (rec.filamento_g / config.filamento_rollo_gramos) * config.filamento_rollo_precio
        : 0

    const precioPorAnillo =
      rec.anillo_tipo === '12mm'   ? config.anillo_12mm_precio  :
      rec.anillo_tipo === '20mm'   ? config.anillo_20mm_precio  :
      rec.anillo_tipo === 'cadena' ? config.anillo_cadena_precio : 0

    const costoAnillo  = precioPorAnillo * (rec.anillo_tipo !== 'ninguno' ? rec.anillo_cantidad : 0)
    const costoResina  = (rec.resina_ml  / 1000) * config.resina_litro_precio
    const costoGoma    = rec.goma_barras * config.goma_barra_precio
    const costoAlcohol = (rec.alcohol_ml / 1000) * config.alcohol_litro_precio
    const costoTiempo  = (rec.tiempo_min  / 60)  * config.tarifa_hora

    const costoXUnidad =
      costoFilamento + costoAnillo + costoResina +
      costoGoma + costoAlcohol + costoTiempo

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
      costoFilamento, costoAnillo, costoResina,
      costoGoma, costoAlcohol, costoTiempo,
      costoXUnidad, costoTotal,
      precioSugerido, precioTotal,
      utilidadBruta, comisionXUnidad,
      utilidadNeta, utilidadNetaTotal, margenReal,
      precioPorAnillo,
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
              <Campo
                label="Cantidad a producir"
                sublabel="unidades"
                value={rec.cantidad}
                onChange={v => updRec('cantidad', Math.max(1, v))}
                suffix="uds"
              />
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

              {/* Anillo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-navy-600">Anillo / accesorio</label>
                  {rec.anillo_tipo !== 'ninguno' && (
                    <span className="text-xs text-accent font-semibold">{fmt(calc.costoAnillo)}/ud</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={rec.anillo_tipo}
                    onChange={e => updRec('anillo_tipo', e.target.value)}
                    className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {ANILLO_OPCIONES.map(o => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                  {rec.anillo_tipo !== 'ninguno' && (
                    <div className="relative">
                      <input
                        type="number" min={1} value={rec.anillo_cantidad}
                        onChange={e => updRec('anillo_cantidad', Math.max(1, Number(e.target.value)))}
                        className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">uds</span>
                    </div>
                  )}
                </div>
                {rec.anillo_tipo !== 'ninguno' && (
                  <p className="text-[11px] text-[#8a9ab0] mt-1">
                    {rec.anillo_cantidad} × {fmt(calc.precioPorAnillo)} c/u
                  </p>
                )}
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

              {/* Goma magica */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-navy-600">Gota magica</label>
                  {rec.goma_barras > 0 && (
                    <span className="text-xs text-accent font-semibold">{fmt(calc.costoGoma)}/ud</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number" min={0} step={0.01} value={rec.goma_barras}
                    onChange={e => updRec('goma_barras', Number(e.target.value))}
                    placeholder="0"
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">barras</span>
                </div>
              </div>

              {/* Alcohol */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-navy-600">Alcohol isopropilico</label>
                  {rec.alcohol_ml > 0 && (
                    <span className="text-xs text-accent font-semibold">{fmt(calc.costoAlcohol)}/ud</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number" min={0} step={0.5} value={rec.alcohol_ml}
                    onChange={e => updRec('alcohol_ml', Number(e.target.value))}
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
              {calc.costoAnillo > 0 && (
                <FilaResultado
                  label={`${ANILLO_OPCIONES.find(o => o.id === rec.anillo_tipo)?.label} ×${rec.anillo_cantidad}`}
                  valor={fmt(calc.costoAnillo)} muted
                />
              )}
              {calc.costoResina > 0 && (
                <FilaResultado label={`Resina (${rec.resina_ml}ml)`} valor={fmt(calc.costoResina)} muted />
              )}
              {calc.costoGoma > 0 && (
                <FilaResultado label={`Gota magica (${rec.goma_barras} barras)`} valor={fmt(calc.costoGoma)} muted />
              )}
              {calc.costoAlcohol > 0 && (
                <FilaResultado label={`Alcohol (${rec.alcohol_ml}ml)`} valor={fmt(calc.costoAlcohol)} muted />
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
          <Card className={`${cero ? 'opacity-60' : ''} bg-navy-600 border-navy-600`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-3">
              Para {rec.cantidad} unidad{rec.cantidad !== 1 ? 'es' : ''}
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-white/70">Costo total materiales</span>
                <span className="text-base font-bold text-white/80">{fmt(calc.costoTotal)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-white/70">Total a cobrar al cliente</span>
                <span className="text-2xl font-bold text-white">{fmt(calc.precioTotal)}</span>
              </div>
              {rec.comision > 0 && (
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-white/60">Comision total Andres</span>
                  <span className="text-base font-bold text-amber-300">- {fmt(calc.comisionXUnidad * rec.cantidad)}</span>
                </div>
              )}
              <div className="h-px bg-white/20 my-1" />
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-white/70">Tu utilidad neta total</span>
                <span className="text-xl font-bold text-green-400">{fmt(calc.utilidadNetaTotal)}</span>
              </div>
            </div>

            {/* CTA */}
            {!cero && (
              <button
                onClick={() => navigate('/cotizaciones?new=1')}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-medium rounded-lg px-4 py-2.5 border border-white/20"
              >
                <FileText size={15} /> Crear cotizacion con este precio
              </button>
            )}
          </Card>

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
            <p className="text-xs text-[#8a9ab0] mb-4">
              Estos precios se guardan automaticamente en tu dispositivo.
              Actualiza cuando cambien tus costos de proveedor.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Rollo filamento 1 kg</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">$</span>
                  <input type="number" min={0} value={config.filamento_rollo_precio}
                    onChange={e => updCfg('filamento_rollo_precio', Number(e.target.value))}
                    className="w-full border border-[#e2e6ea] rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Anillo 12 mm · unidad</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">$</span>
                  <input type="number" min={0} value={config.anillo_12mm_precio}
                    onChange={e => updCfg('anillo_12mm_precio', Number(e.target.value))}
                    className="w-full border border-[#e2e6ea] rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Anillo 20 mm · unidad</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">$</span>
                  <input type="number" min={0} value={config.anillo_20mm_precio}
                    onChange={e => updCfg('anillo_20mm_precio', Number(e.target.value))}
                    className="w-full border border-[#e2e6ea] rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Anillo con cadenita · unidad</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">$</span>
                  <input type="number" min={0} value={config.anillo_cadena_precio}
                    onChange={e => updCfg('anillo_cadena_precio', Number(e.target.value))}
                    className="w-full border border-[#e2e6ea] rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Resina (A+B) · litro</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">$</span>
                  <input type="number" min={0} value={config.resina_litro_precio}
                    onChange={e => updCfg('resina_litro_precio', Number(e.target.value))}
                    className="w-full border border-[#e2e6ea] rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Gota magica · barra</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">$</span>
                  <input type="number" min={0} value={config.goma_barra_precio}
                    onChange={e => updCfg('goma_barra_precio', Number(e.target.value))}
                    className="w-full border border-[#e2e6ea] rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Alcohol isopropilico · litro</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">$</span>
                  <input type="number" min={0} value={config.alcohol_litro_precio}
                    onChange={e => updCfg('alcohol_litro_precio', Number(e.target.value))}
                    className="w-full border border-[#e2e6ea] rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Tarifa mano de obra · hora</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8a9ab0]">$</span>
                  <input type="number" min={0} value={config.tarifa_hora}
                    onChange={e => updCfg('tarifa_hora', Number(e.target.value))}
                    className="w-full border border-[#e2e6ea] rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
