import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Package, Minus, X } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { useInventario } from '../hooks/useInventario'

// ── Categorías ──────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { id: 'filamento', label: 'Filamentos', emoji: '🧵' },
  { id: 'anillo',    label: 'Anillos',    emoji: '⭕' },
  { id: 'insumo',    label: 'Insumos',    emoji: '🧪' },
]

const CAT_BADGE = {
  filamento: 'blue',
  anillo:    'gray',
  insumo:    'amber',
}

const UNIDADES = [
  { id: 'u',  label: 'Unidades (u)' },
  { id: 'g',  label: 'Gramos (g)'   },
  { id: 'kg', label: 'Kilogramos (kg)' },
  { id: 'ml', label: 'Mililitros (ml)' },
]

const STEPS = { g: 100, ml: 50, kg: 0.5, u: 1 }

const cop = (v) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(Number(v) || 0)

const fmt = (v, u) => `${Number(v).toLocaleString('es-CO')} ${u}`

const EMPTY_FORM = {
  nombre: '', categoria: 'filamento', color: '#1a1a1a',
  unidad: 'g', stock_actual: '', stock_minimo: '', costo_unitario: '', notas: '',
}

// ── Stock bar ───────────────────────────────────────────────────────────────
function StockBar({ actual, minimo }) {
  const max    = Math.max(minimo * 4, actual, 1)
  const pct    = Math.min((actual / max) * 100, 100)
  const critico = actual <= minimo
  const bajo    = actual <= minimo * 1.5 && !critico

  return (
    <div className="w-full bg-[#f0f2f5] rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full transition-all ${
          critico ? 'bg-red-400' : bajo ? 'bg-amber-400' : 'bg-accent'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Item card ───────────────────────────────────────────────────────────────
function ItemCard({ item, onEdit, onDelete, onAjustar }) {
  const actual   = Number(item.stock_actual)
  const minimo   = Number(item.stock_minimo)
  const critico  = actual <= minimo
  const step     = STEPS[item.unidad] ?? 1

  return (
    <div className={`bg-white border rounded-xl px-4 py-3 flex flex-col gap-2 ${critico ? 'border-red-200' : 'border-[#e2e6ea]'}`}>
      <div className="flex items-start justify-between gap-2">
        {/* Izquierda: color dot + nombre */}
        <div className="flex items-center gap-2 min-w-0">
          {item.color
            ? <span className="shrink-0 w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: item.color }} />
            : <span className="shrink-0 text-sm">{CATEGORIAS.find(c => c.id === item.categoria)?.emoji}</span>}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy-600 truncate">{item.nombre}</p>
            {item.notas && <p className="text-xs text-[#8a9ab0] truncate">{item.notas}</p>}
          </div>
        </div>

        {/* Derecha: acciones */}
        <div className="flex items-center gap-1 shrink-0">
          {critico && (
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} /> Stock bajo
            </span>
          )}
          <button onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg hover:bg-[#f0f2f5] text-[#8a9ab0] hover:text-navy-600 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Cantidad + ajuste rápido */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => onAjustar(item.id, -step)}
            className="w-6 h-6 rounded-md bg-[#f0f2f5] hover:bg-[#e2e6ea] text-navy-600 flex items-center justify-center transition-colors">
            <Minus size={11} />
          </button>
          <span className="text-sm font-bold text-navy-600 min-w-[80px] text-center">
            {fmt(actual, item.unidad)}
          </span>
          <button onClick={() => onAjustar(item.id, step)}
            className="w-6 h-6 rounded-md bg-[#f0f2f5] hover:bg-[#e2e6ea] text-navy-600 flex items-center justify-center transition-colors">
            <Plus size={11} />
          </button>
        </div>
        <span className="text-xs text-[#8a9ab0]">mín {fmt(minimo, item.unidad)}</span>
      </div>

      <StockBar actual={actual} minimo={minimo} />
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="animate-pulse bg-[#e2e6ea] rounded-xl h-24 w-full" />
      ))}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Inventario() {
  const { items, loading, crearItem, actualizarItem, eliminarItem, ajustarStock } = useInventario()

  const [tabActivo,  setTabActivo]  = useState('todos')
  const [modal,      setModal]      = useState(null)   // null | 'crear' | 'editar'
  const [editItem,   setEditItem]   = useState(null)
  const [confirmId,  setConfirmId]  = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)

  // ── Filtrado por tab ──────────────────────────────────────────────────────
  const itemsFiltrados = tabActivo === 'todos'
    ? items
    : items.filter(i => i.categoria === tabActivo)

  // ── Métricas ──────────────────────────────────────────────────────────────
  const stockBajo = items.filter(i => Number(i.stock_actual) <= Number(i.stock_minimo)).length
  const totalCats = { filamento: 0, anillo: 0, insumo: 0 }
  items.forEach(i => { totalCats[i.categoria] = (totalCats[i.categoria] || 0) + 1 })

  // ── Helpers modal ─────────────────────────────────────────────────────────
  function abrirCrear() {
    setForm(EMPTY_FORM)
    setEditItem(null)
    setModal('crear')
  }

  function abrirEditar(item) {
    setForm({
      nombre:         item.nombre,
      categoria:      item.categoria,
      color:          item.color || '#1a1a1a',
      unidad:         item.unidad,
      stock_actual:   String(item.stock_actual),
      stock_minimo:   String(item.stock_minimo),
      costo_unitario: String(item.costo_unitario || ''),
      notas:          item.notas || '',
    })
    setEditItem(item)
    setModal('editar')
  }

  async function guardar() {
    if (!form.nombre.trim()) return
    setSaving(true)
    const datos = {
      nombre:         form.nombre.trim(),
      categoria:      form.categoria,
      color:          form.categoria === 'filamento' ? (form.color || null) : null,
      unidad:         form.unidad,
      stock_actual:   Number(form.stock_actual)   || 0,
      stock_minimo:   Number(form.stock_minimo)   || 0,
      costo_unitario: Number(form.costo_unitario) || 0,
      notas:          form.notas.trim() || null,
    }
    let ok
    if (modal === 'crear') ok = await crearItem(datos)
    else ok = await actualizarItem(editItem.id, datos)
    setSaving(false)
    if (ok) setModal(null)
  }

  const f = (campo, val) => setForm(prev => ({ ...prev, [campo]: val }))

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Inventario</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">
            {loading ? '...' : `${items.length} ítems registrados`}
          </p>
        </div>
        <Button onClick={abrirCrear}><Plus size={16} /> Agregar ítem</Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#e2e6ea] rounded-xl p-4">
          <p className="text-xs font-medium text-[#8a9ab0] uppercase tracking-wide flex items-center gap-1">
            <Package size={12} /> Total
          </p>
          <p className="text-xl font-bold text-navy-600 mt-1">{items.length}</p>
        </div>
        <div className={`border rounded-xl p-4 ${stockBajo > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#e2e6ea]'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide flex items-center gap-1 ${stockBajo > 0 ? 'text-red-500' : 'text-[#8a9ab0]'}`}>
            <AlertTriangle size={12} /> Stock bajo
          </p>
          <p className={`text-xl font-bold mt-1 ${stockBajo > 0 ? 'text-red-600' : 'text-navy-600'}`}>{stockBajo}</p>
        </div>
        {CATEGORIAS.map(cat => (
          <div key={cat.id} className="bg-white border border-[#e2e6ea] rounded-xl p-4">
            <p className="text-xs font-medium text-[#8a9ab0] uppercase tracking-wide">{cat.emoji} {cat.label}</p>
            <p className="text-xl font-bold text-navy-600 mt-1">{totalCats[cat.id] || 0}</p>
          </div>
        ))}
      </div>

      {/* Tabs de categoría */}
      <div className="flex gap-1 bg-[#f0f2f5] rounded-xl p-1 mb-5">
        {[{ id: 'todos', label: 'Todos', emoji: '📦' }, ...CATEGORIAS].map(tab => (
          <button key={tab.id}
            onClick={() => setTabActivo(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tabActivo === tab.id
                ? 'bg-white text-navy-600 shadow-sm'
                : 'text-[#8a9ab0] hover:text-navy-600'
            }`}>
            <span>{tab.emoji}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
              tabActivo === tab.id ? 'bg-accent/10 text-accent' : 'bg-[#e2e6ea] text-[#8a9ab0]'
            }`}>
              {tab.id === 'todos' ? items.length : (totalCats[tab.id] || 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Lista de ítems */}
      {loading ? (
        <Skeleton />
      ) : itemsFiltrados.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center gap-3">
          <span className="text-5xl">📦</span>
          <p className="text-sm font-medium text-navy-600">Sin ítems en esta categoría</p>
          <p className="text-xs text-[#8a9ab0]">Agrega tu primer ítem con el botón de arriba.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {itemsFiltrados.map(item => (
            <ItemCard key={item.id} item={item}
              onEdit={abrirEditar}
              onDelete={setConfirmId}
              onAjustar={ajustarStock}
            />
          ))}
        </div>
      )}

      {/* ── Modal crear/editar ────────────────────────────────────────────── */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'crear' ? 'Agregar ítem' : 'Editar ítem'}>
        <div className="flex flex-col gap-4">

          {/* Categoría */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-600">Categoría</label>
            <div className="flex gap-2">
              {CATEGORIAS.map(cat => (
                <button key={cat.id} type="button"
                  onClick={() => f('categoria', cat.id)}
                  className={`flex-1 py-2 px-2 text-sm rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-1 ${
                    form.categoria === cat.id
                      ? 'border-accent bg-blue-50 text-accent'
                      : 'border-[#e2e6ea] bg-white text-[#8a9ab0] hover:border-[#c0cad6]'
                  }`}>
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-600">Nombre *</label>
            <input value={form.nombre} onChange={e => f('nombre', e.target.value)}
              placeholder={form.categoria === 'filamento' ? 'Ej: PLA Rojo, PETG Negro...' : 'Nombre del ítem'}
              className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>

          {/* Color (solo filamentos) */}
          {form.categoria === 'filamento' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Color del filamento</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color}
                  onChange={e => f('color', e.target.value)}
                  className="w-12 h-10 rounded-lg border border-[#e2e6ea] cursor-pointer p-0.5 bg-white" />
                <span className="text-sm text-[#8a9ab0]">
                  Selecciona el color para identificarlo visualmente
                </span>
              </div>
            </div>
          )}

          {/* Unidad + Cantidades */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Unidad</label>
              <select value={form.unidad} onChange={e => f('unidad', e.target.value)}
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent">
                {UNIDADES.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Cantidad actual</label>
              <input type="number" min="0" value={form.stock_actual}
                onChange={e => f('stock_actual', e.target.value)}
                placeholder="0"
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Stock mínimo</label>
              <input type="number" min="0" value={form.stock_minimo}
                onChange={e => f('stock_minimo', e.target.value)}
                placeholder="0"
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>

          {/* Costo unitario + Notas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Costo unitario (COP)</label>
              <input type="number" min="0" value={form.costo_unitario}
                onChange={e => f('costo_unitario', e.target.value)}
                placeholder="0"
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Notas</label>
              <input value={form.notas} onChange={e => f('notas', e.target.value)}
                placeholder="Descripción breve (opcional)"
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.nombre.trim() || saving}>
              {saving ? 'Guardando...' : modal === 'crear' ? 'Agregar ítem' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Confirmar eliminar ────────────────────────────────────────────── */}
      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Eliminar ítem" size="sm">
        <p className="text-sm text-navy-600 mb-5">¿Seguro que quieres eliminar este ítem del inventario?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancelar</Button>
          <Button variant="danger" disabled={saving}
            onClick={async () => {
              setSaving(true)
              await eliminarItem(confirmId)
              setSaving(false)
              setConfirmId(null)
            }}>
            {saving ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
