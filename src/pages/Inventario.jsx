import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Package, Minus, ChevronRight } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useInventario } from '../hooks/useInventario'

const UNIDADES = [
  { id: 'u',  label: 'Unidades (u)'     },
  { id: 'g',  label: 'Gramos (g)'       },
  { id: 'kg', label: 'Kilogramos (kg)'  },
  { id: 'ml', label: 'Mililitros (ml)'  },
]
const STEPS = { g: 100, ml: 50, kg: 0.5, u: 1 }
const EMPTY_ITEM = {
  nombre: '', categoria: '', color: '',
  unidad: 'u', stock_actual: '', stock_minimo: '', costo_unitario: '', notas: '',
}

const fmt = (v, u) => `${Number(v).toLocaleString('es-CO')} ${u}`

// ── Stock bar ────────────────────────────────────────────────────────────────
function StockBar({ actual, minimo }) {
  const max     = Math.max(minimo * 4, actual, 1)
  const pct     = Math.min((actual / max) * 100, 100)
  const critico = actual <= minimo
  const bajo    = actual <= minimo * 1.5 && !critico
  return (
    <div className="w-full bg-[#f0f2f5] rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full transition-all ${critico ? 'bg-red-400' : bajo ? 'bg-amber-400' : 'bg-accent'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Item card ────────────────────────────────────────────────────────────────
function ItemCard({ item, onEdit, onDelete, onAjustar }) {
  const actual  = Number(item.stock_actual)
  const minimo  = Number(item.stock_minimo)
  const critico = actual <= minimo
  const step    = STEPS[item.unidad] ?? 1

  return (
    <div className={`bg-white border rounded-xl px-4 py-3 flex flex-col gap-2 ${critico ? 'border-red-200' : 'border-[#e2e6ea]'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {item.color && (
            <span className="shrink-0 w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: item.color }} />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy-600 truncate">{item.nombre}</p>
            {item.notas && <p className="text-xs text-[#8a9ab0] truncate">{item.notas}</p>}
          </div>
        </div>
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
    <div className="grid sm:grid-cols-2 gap-3">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="animate-pulse bg-[#e2e6ea] rounded-xl h-24" />
      ))}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Inventario() {
  const {
    items, categorias, loading,
    crearItem, actualizarItem, eliminarItem, ajustarStock,
    crearCategoria, renombrarCategoria, eliminarCategoria,
  } = useInventario()

  const [tabActivo,   setTabActivo]   = useState('todos')
  const [itemModal,   setItemModal]   = useState(null)
  const [editItem,    setEditItem]    = useState(null)
  const [confirmId,   setConfirmId]   = useState(null)
  const [form,        setForm]        = useState(EMPTY_ITEM)
  const [saving,      setSaving]      = useState(false)

  // Gestión de categorías
  const [catModal,    setCatModal]    = useState(false)
  const [newCatNombre, setNewCatNombre] = useState('')
  const [editCat,     setEditCat]     = useState(null)   // { original, nombre }
  const [confirmCat,  setConfirmCat]  = useState(null)
  const [savingCat,   setSavingCat]   = useState(false)

  const f = (campo, val) => setForm(prev => ({ ...prev, [campo]: val }))

  // ── Datos derivados ────────────────────────────────────────────────────────
  const itemsFiltrados = tabActivo === 'todos'
    ? items
    : items.filter(i => i.categoria === tabActivo)

  const stockBajo = items.filter(i => Number(i.stock_actual) <= Number(i.stock_minimo)).length

  const countPorCat = items.reduce((acc, i) => {
    acc[i.categoria] = (acc[i.categoria] || 0) + 1
    return acc
  }, {})

  // ── Helpers item modal ────────────────────────────────────────────────────
  function abrirCrear() {
    setForm({ ...EMPTY_ITEM, categoria: categorias[0]?.nombre || '' })
    setEditItem(null)
    setItemModal('crear')
  }

  function abrirEditar(item) {
    setForm({
      nombre:         item.nombre,
      categoria:      item.categoria,
      color:          item.color || '',
      unidad:         item.unidad,
      stock_actual:   String(item.stock_actual),
      stock_minimo:   String(item.stock_minimo),
      costo_unitario: String(item.costo_unitario || ''),
      notas:          item.notas || '',
    })
    setEditItem(item)
    setItemModal('editar')
  }

  async function guardarItem() {
    if (!form.nombre.trim() || !form.categoria) return
    setSaving(true)
    const datos = {
      nombre:         form.nombre.trim(),
      categoria:      form.categoria,
      color:          form.color || null,
      unidad:         form.unidad,
      stock_actual:   Number(form.stock_actual)   || 0,
      stock_minimo:   Number(form.stock_minimo)   || 0,
      costo_unitario: Number(form.costo_unitario) || 0,
      notas:          form.notas.trim() || null,
    }
    const ok = itemModal === 'crear'
      ? await crearItem(datos)
      : await actualizarItem(editItem.id, datos)
    setSaving(false)
    if (ok) setItemModal(null)
  }

  // ── Helpers categoría modal ────────────────────────────────────────────────
  async function guardarNuevaCat() {
    if (!newCatNombre.trim()) return
    setSavingCat(true)
    const ok = await crearCategoria(newCatNombre)
    setSavingCat(false)
    if (ok) setNewCatNombre('')
  }

  async function guardarEditCat() {
    if (!editCat) return
    setSavingCat(true)
    await renombrarCategoria(editCat.original, editCat.nombre)
    setSavingCat(false)
    setEditCat(null)
  }

  async function confirmarEliminarCat() {
    if (!confirmCat) return
    setSavingCat(true)
    await eliminarCategoria(confirmCat)
    setSavingCat(false)
    setConfirmCat(null)
  }

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
        <div className="flex gap-2">
          <button onClick={() => setCatModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e6ea] bg-white text-sm font-medium text-[#8a9ab0] hover:text-navy-600 hover:border-[#c0cad6] transition-colors">
            Gestionar categorías
          </button>
          <Button onClick={abrirCrear}><Plus size={16} /> Agregar ítem</Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#e2e6ea] rounded-xl p-4">
          <p className="text-xs font-medium text-[#8a9ab0] uppercase tracking-wide flex items-center gap-1">
            <Package size={12} /> Total ítems
          </p>
          <p className="text-xl font-bold text-navy-600 mt-1">{items.length}</p>
        </div>
        <div className={`border rounded-xl p-4 ${stockBajo > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#e2e6ea]'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide flex items-center gap-1 ${stockBajo > 0 ? 'text-red-500' : 'text-[#8a9ab0]'}`}>
            <AlertTriangle size={12} /> Stock bajo
          </p>
          <p className={`text-xl font-bold mt-1 ${stockBajo > 0 ? 'text-red-600' : 'text-navy-600'}`}>{stockBajo}</p>
        </div>
        {categorias.slice(0, 2).map(cat => (
          <div key={cat.nombre} className="bg-white border border-[#e2e6ea] rounded-xl p-4">
            <p className="text-xs font-medium text-[#8a9ab0] uppercase tracking-wide capitalize truncate">
              {cat.nombre}
            </p>
            <p className="text-xl font-bold text-navy-600 mt-1">{countPorCat[cat.nombre] || 0}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f0f2f5] rounded-xl p-1 mb-5 overflow-x-auto">
        {[{ nombre: 'todos', label: 'Todos' }, ...categorias.map(c => ({ nombre: c.nombre, label: c.nombre }))].map(tab => {
          const count = tab.nombre === 'todos' ? items.length : (countPorCat[tab.nombre] || 0)
          return (
            <button key={tab.nombre}
              onClick={() => setTabActivo(tab.nombre)}
              className={`shrink-0 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize ${
                tabActivo === tab.nombre
                  ? 'bg-white text-navy-600 shadow-sm'
                  : 'text-[#8a9ab0] hover:text-navy-600'
              }`}>
              {tab.label}
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                tabActivo === tab.nombre ? 'bg-accent/10 text-accent' : 'bg-[#e2e6ea] text-[#8a9ab0]'
              }`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Ítems */}
      {loading ? <Skeleton /> : itemsFiltrados.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center gap-3">
          <Package size={40} className="text-[#e2e6ea]" />
          <p className="text-sm font-medium text-navy-600">Sin ítems aquí</p>
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

      {/* ── Modal crear/editar ítem ───────────────────────────────────────── */}
      <Modal open={!!itemModal} onClose={() => setItemModal(null)}
        title={itemModal === 'crear' ? 'Agregar ítem' : 'Editar ítem'}>
        <div className="flex flex-col gap-4">

          {/* Categoría */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-600">Categoría</label>
            {categorias.length === 0
              ? <p className="text-xs text-amber-600">No hay categorías. Créalas desde "Gestionar categorías".</p>
              : (
                <div className="flex flex-wrap gap-2">
                  {categorias.map(cat => (
                    <button key={cat.nombre} type="button"
                      onClick={() => f('categoria', cat.nombre)}
                      className={`py-1.5 px-3 text-sm rounded-lg border-2 font-medium transition-colors capitalize ${
                        form.categoria === cat.nombre
                          ? 'border-accent bg-blue-50 text-accent'
                          : 'border-[#e2e6ea] bg-white text-[#8a9ab0] hover:border-[#c0cad6]'
                      }`}>
                      {cat.nombre}
                    </button>
                  ))}
                </div>
              )}
          </div>

          {/* Nombre */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-600">Nombre *</label>
            <input value={form.nombre} onChange={e => f('nombre', e.target.value)}
              placeholder="Nombre del ítem"
              className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>

          {/* Color */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-600">
              Color <span className="text-[#8a9ab0] font-normal text-xs">(opcional — para identificar visualmente)</span>
            </label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.color || '#1a1a1a'}
                onChange={e => f('color', e.target.value)}
                className="w-12 h-10 rounded-lg border border-[#e2e6ea] cursor-pointer p-0.5 bg-white" />
              {form.color && (
                <button type="button" onClick={() => f('color', '')}
                  className="text-xs text-[#8a9ab0] hover:text-red-500 underline">
                  Sin color
                </button>
              )}
            </div>
          </div>

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
                onChange={e => f('stock_actual', e.target.value)} placeholder="0"
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Stock mínimo</label>
              <input type="number" min="0" value={form.stock_minimo}
                onChange={e => f('stock_minimo', e.target.value)} placeholder="0"
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>

          {/* Costo + Notas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Costo unitario (COP)</label>
              <input type="number" min="0" value={form.costo_unitario}
                onChange={e => f('costo_unitario', e.target.value)} placeholder="0"
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Notas</label>
              <input value={form.notas} onChange={e => f('notas', e.target.value)}
                placeholder="Descripción breve"
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setItemModal(null)}>Cancelar</Button>
            <Button onClick={guardarItem} disabled={!form.nombre.trim() || !form.categoria || saving}>
              {saving ? 'Guardando...' : itemModal === 'crear' ? 'Agregar ítem' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal gestionar categorías ────────────────────────────────────── */}
      <Modal open={catModal} onClose={() => { setCatModal(false); setEditCat(null); setConfirmCat(null) }}
        title="Gestionar categorías">
        <div className="flex flex-col gap-5">

          {/* Lista */}
          <div className="flex flex-col gap-2">
            {categorias.length === 0
              ? <p className="text-sm text-[#8a9ab0] py-4 text-center">No hay categorías aún.</p>
              : categorias.map(cat => (
                <div key={cat.nombre} className="border border-[#e2e6ea] rounded-xl px-3 py-2.5">
                  {editCat?.original === cat.nombre ? (
                    <div className="flex items-center gap-2">
                      <input value={editCat.nombre} onChange={e => setEditCat(c => ({ ...c, nombre: e.target.value }))}
                        placeholder="Nuevo nombre"
                        onKeyDown={e => e.key === 'Enter' && guardarEditCat()}
                        className="flex-1 border border-[#e2e6ea] rounded-lg px-2 py-1.5 text-sm text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent" />
                      <Button onClick={guardarEditCat} disabled={savingCat}>
                        {savingCat ? '...' : 'Guardar'}
                      </Button>
                      <button onClick={() => setEditCat(null)}
                        className="text-sm text-[#8a9ab0] hover:text-navy-600 px-1">✕</button>
                    </div>
                  ) : confirmCat === cat.nombre ? (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-red-600 flex-1">
                        ¿Eliminar <strong className="capitalize">{cat.nombre}</strong>? ({countPorCat[cat.nombre] || 0} ítems)
                      </p>
                      <Button variant="danger" onClick={confirmarEliminarCat} disabled={savingCat}>
                        {savingCat ? '...' : 'Eliminar'}
                      </Button>
                      <button onClick={() => setConfirmCat(null)}
                        className="text-sm text-[#8a9ab0] hover:text-navy-600 px-1">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-600 capitalize">{cat.nombre}</p>
                        <p className="text-xs text-[#8a9ab0]">{countPorCat[cat.nombre] || 0} ítems</p>
                      </div>
                      <button onClick={() => setEditCat({ original: cat.nombre, nombre: cat.nombre })}
                        className="p-1.5 rounded-lg hover:bg-[#f0f2f5] text-[#8a9ab0] hover:text-navy-600 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmCat(cat.nombre)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Nueva categoría */}
          <div className="border-t border-[#f0f2f5] pt-4">
            <p className="text-sm font-medium text-navy-600 mb-2">Nueva categoría</p>
            <div className="flex items-center gap-2">
              <input value={newCatNombre} onChange={e => setNewCatNombre(e.target.value)}
                placeholder="Nombre (ej: empaque, chip nfc...)"
                onKeyDown={e => e.key === 'Enter' && guardarNuevaCat()}
                className="flex-1 border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
              <Button onClick={guardarNuevaCat} disabled={!newCatNombre.trim() || savingCat}>
                {savingCat ? '...' : <><Plus size={14} /> Agregar</>}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Confirmar eliminar ítem ────────────────────────────────────────── */}
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
