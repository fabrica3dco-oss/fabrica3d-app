import { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign,
  Plus, Upload, Edit2, Trash2, X, FileText
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

const EMPTY_FORM = {
  fecha:       new Date().toISOString().split('T')[0],
  categoria:   'materiales',
  descripcion: '',
  monto:       '',
  notas:       '',
}

function getMeses() {
  const meses = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    meses.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
    })
  }
  return meses
}

const fmt = n =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n || 0)

const fmtFecha = d =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

// ── Componente ────────────────────────────────────────────────────────────────
export default function Finanzas() {
  const {
    loading,
    gastosMes, cobrosMes,
    totalGastos, totalIngresos, utilidad,
    mesFiltro, setMesFiltro,
    crearGasto, actualizarGasto, eliminarGasto,
  } = useFinanzas()

  const [tab,       setTab]       = useState('gastos')
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [busqueda,  setBusqueda]  = useState('')
  const [filtrocat, setFiltrocat] = useState('')

  const meses = useMemo(() => getMeses(), [])

  // ── Handlers modal ──────────────────────────────────────────────────────────
  function abrirCrear() {
    setForm({ ...EMPTY_FORM, fecha: new Date().toISOString().split('T')[0] })
    setModal({ mode: 'crear' })
  }

  function abrirEditar(g) {
    setForm({
      fecha:       g.fecha,
      categoria:   g.categoria,
      descripcion: g.descripcion,
      monto:       String(g.monto),
      notas:       g.notas || '',
    })
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

  // ── Filtros gastos ──────────────────────────────────────────────────────────
  const gastosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return gastosMes.filter(g => {
      const matchQ = !q || g.descripcion?.toLowerCase().includes(q) || g.notas?.toLowerCase().includes(q)
      return matchQ && (!filtrocat || g.categoria === filtrocat)
    })
  }, [gastosMes, busqueda, filtrocat])

  const porCategoria = useMemo(() =>
    CATEGORIAS.map(cat => ({
      ...cat,
      total: gastosMes.filter(g => g.categoria === cat.id).reduce((s, g) => s + Number(g.monto), 0),
    })).filter(c => c.total > 0),
    [gastosMes]
  )

  const margen = totalIngresos > 0
    ? Math.round((utilidad / totalIngresos) * 100)
    : null

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Finanzas</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Ingresos, gastos y extractos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select
            value={mesFiltro}
            onChange={e => setMesFiltro(e.target.value)}
            className="text-sm border border-[#e2e6ea] rounded-lg px-3 py-2 bg-white text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent/30 capitalize"
          >
            {meses.map(m => (
              <option key={m.value} value={m.value} className="capitalize">{m.label}</option>
            ))}
          </select>
          <Button onClick={abrirCrear}><Plus size={16} /> Gasto</Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Ingresos */}
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
            <TrendingUp size={12} className="text-green-500" /> Ingresos
          </p>
          <p className="text-xl font-bold text-green-600">{fmt(totalIngresos)}</p>
          <p className="text-xs text-[#8a9ab0] mt-0.5">
            {cobrosMes.length} cobro{cobrosMes.length !== 1 ? 's' : ''} pagado{cobrosMes.length !== 1 ? 's' : ''}
          </p>
        </Card>

        {/* Gastos */}
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#8a9ab0] flex items-center gap-1 mb-1">
            <TrendingDown size={12} className="text-red-500" /> Gastos
          </p>
          <p className="text-xl font-bold text-red-600">{fmt(totalGastos)}</p>
          <p className="text-xs text-[#8a9ab0] mt-0.5">
            {gastosMes.length} registro{gastosMes.length !== 1 ? 's' : ''}
          </p>
        </Card>

        {/* Utilidad */}
        <Card className={`p-4 ${utilidad >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide flex items-center gap-1 mb-1 ${utilidad >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            <DollarSign size={12} /> Utilidad neta
          </p>
          <p className={`text-xl font-bold ${utilidad >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {fmt(utilidad)}
          </p>
          <p className="text-xs text-[#8a9ab0] mt-0.5">
            {margen !== null ? `${margen}% de margen` : 'Sin ingresos aun'}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-[#e2e6ea]">
        {[
          ['gastos',   'Gastos'],
          ['ingresos', 'Ingresos'],
          ['extracto', 'Extracto bancario'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-accent text-accent'
                : 'border-transparent text-[#8a9ab0] hover:text-navy-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Gastos ────────────────────────────────────────────────────── */}
      {tab === 'gastos' && (
        <div>
          {/* Chips de categoría */}
          {porCategoria.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setFiltrocat('')}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  !filtrocat
                    ? 'bg-navy-600 text-white border-navy-600'
                    : 'bg-white text-[#8a9ab0] border-[#e2e6ea] hover:border-navy-600 hover:text-navy-600'
                }`}
              >
                Todos
              </button>
              {porCategoria.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFiltrocat(filtrocat === cat.id ? '' : cat.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    filtrocat === cat.id
                      ? 'bg-navy-600 text-white border-navy-600'
                      : 'bg-white text-navy-600 border-[#e2e6ea] hover:border-navy-600'
                  }`}
                >
                  {cat.label} · {fmt(cat.total)}
                </button>
              ))}
            </div>
          )}

          {/* Buscador */}
          <div className="mb-3">
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar gasto..."
              className="w-full px-4 py-2 text-sm border border-[#e2e6ea] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          {/* Tabla / vacío */}
          {loading ? (
            <div className="text-center py-10 text-[#8a9ab0] text-sm">Cargando...</div>
          ) : gastosFiltrados.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center py-12 gap-3">
                <TrendingDown size={36} className="text-[#e2e6ea]" />
                <p className="text-sm font-medium text-navy-600">Sin gastos registrados</p>
                <p className="text-xs text-[#8a9ab0]">Registra un gasto para controlar tus finanzas</p>
                <Button variant="secondary" onClick={abrirCrear}><Plus size={14} /> Registrar gasto</Button>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[110px]" />
                  <col className="w-[130px]" />
                  <col />
                  <col className="w-[130px]" />
                  <col className="w-[80px]" />
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
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cat.color}`}>
                            {cat.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-navy-600">
                          <p className="font-medium truncate">{g.descripcion}</p>
                          {g.notas && (
                            <p className="text-xs text-[#8a9ab0] truncate mt-0.5">{g.notas}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-navy-600 whitespace-nowrap">
                          {fmt(g.monto)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => abrirEditar(g)}
                              className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-navy-600 hover:bg-[#f0f2f5] transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => { if (confirm('Eliminar este gasto?')) eliminarGasto(g.id) }}
                              className="p-1.5 rounded-lg text-[#8a9ab0] hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
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

      {/* ── Tab: Ingresos ──────────────────────────────────────────────────── */}
      {tab === 'ingresos' && (
        <div>
          {loading ? (
            <div className="text-center py-10 text-[#8a9ab0] text-sm">Cargando...</div>
          ) : cobrosMes.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center py-12 gap-3">
                <TrendingUp size={36} className="text-[#e2e6ea]" />
                <p className="text-sm font-medium text-navy-600">Sin ingresos este mes</p>
                <p className="text-xs text-[#8a9ab0]">Los cobros marcados como pagados aparecen aqui</p>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[110px]" />
                  <col />
                  <col className="w-[160px]" />
                  <col className="w-[130px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Tipo</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e6ea]">
                  {cobrosMes.map(c => (
                    <tr key={c.id} className="hover:bg-[#f8f9fb] transition-colors">
                      <td className="px-4 py-3 text-[#8a9ab0] whitespace-nowrap text-xs">{fmtFecha(c.fecha_emision)}</td>
                      <td className="px-4 py-3 text-navy-600 font-medium truncate">{c.cliente_nombre}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">
                          {c.concepto || 'Pago'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700 whitespace-nowrap">
                        {fmt(c.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Extracto ──────────────────────────────────────────────────── */}
      {tab === 'extracto' && (
        <Card>
          <div className="flex flex-col items-center py-14 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
              <FileText size={28} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-600">Procesador de extractos Nu Colombia</p>
              <p className="text-xs text-[#8a9ab0] max-w-xs mt-1.5 leading-relaxed">
                Sube el PDF de tu extracto bancario y la IA identifica y categoriza cada transaccion como gasto o ingreso automaticamente.
              </p>
            </div>
            <Button variant="secondary">
              <Upload size={14} /> Subir extracto PDF
            </Button>
            <span className="text-xs text-[#8a9ab0] bg-[#f8f9fb] border border-[#e2e6ea] rounded-full px-3 py-1">
              Proximamente · Integracion con Claude AI
            </span>
          </div>
        </Card>
      )}

      {/* ── Modal gasto ────────────────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e2e6ea]">
              <h2 className="font-semibold text-navy-600">
                {modal.mode === 'crear' ? 'Registrar gasto' : 'Editar gasto'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-[#f8f9fb]">
                <X size={18} />
              </button>
            </div>

            {/* Campos */}
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy-600 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-600 mb-1">Categoria *</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {CATEGORIAS.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Descripcion *</label>
                <input
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Filamento PLA azul 1 kg"
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">Monto (COP) *</label>
                <input
                  type="number"
                  value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
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
                  placeholder="Observaciones adicionales..."
                  className="w-full border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="px-5 pb-5 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>
                Cancelar
              </Button>
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
