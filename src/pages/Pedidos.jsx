import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Search, Calendar, User, Hash, ClipboardList, Link2, Pencil, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import ClienteAutocomplete from '../components/ui/ClienteAutocomplete'
import { usePedidos } from '../hooks/usePedidos'
import { useClientes } from '../hooks/useClientes'
import { useInventario } from '../hooks/useInventario'

const ESTADOS = [
  { id: 'en_cola',     label: 'En cola',       color: 'gray'  },
  { id: 'diseno_stl',  label: 'Diseño STL',    color: 'blue'  },
  { id: 'imprimiendo', label: 'Impresión',      color: 'amber' },
  { id: 'acabado',     label: 'Acabado final',  color: 'gray'  },
  { id: 'terminado',   label: 'Terminado',      color: 'green' },
  { id: 'entregado',   label: 'Entregado',      color: 'green' },
]

const BADGE_COLOR = Object.fromEntries(ESTADOS.map(e => [e.id, e.color]))
const LABEL       = Object.fromEntries(ESTADOS.map(e => [e.id, e.label]))
const UNIDADES    = ['u', 'g', 'kg', 'ml', 'm', 'cm']

function getCalcConfig() {
  try {
    const raw = localStorage.getItem('f3d_calc_config_v2')
    if (!raw) return { accesorios: [], acabados: [] }
    const cfg = JSON.parse(raw)
    return { accesorios: cfg.accesorios || [], acabados: cfg.acabados || [] }
  } catch { return { accesorios: [], acabados: [] } }
}

const EMPTY_ROW = { nombre: '', qty: '', unidad: 'u', inventario_id: null }

const EMPTY = {
  descripcion: '', cliente_id: '', cliente_nombre: '',
  cantidad: '', estado: 'en_cola', fecha_entrega: '', cobro_ref: '',
  accesorios:  [],
  acabados:    [],
  _recetaBase: null,
}

function fmtFecha(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtCreado(d) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="animate-pulse bg-[#e2e6ea] rounded h-12 w-full" />
      ))}
    </div>
  )
}

export default function Pedidos() {
  const { pedidos, loading, crearPedido, actualizarPedido, eliminarPedido } = usePedidos()
  const { clientes } = useClientes()
  const { items: matItems } = useInventario()
  const location = useLocation()

  const sugerencias = useMemo(() => {
    const cfg = getCalcConfig()
    const nombres = new Set()
    const lista = []
    ;[...cfg.accesorios, ...cfg.acabados, ...matItems].forEach(x => {
      if (x.nombre && !nombres.has(x.nombre)) {
        nombres.add(x.nombre)
        lista.push(x.nombre)
      }
    })
    return lista
  }, [matItems])

  const [busqueda,     setBusqueda]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modal,        setModal]        = useState(null)
  const [confirmId,    setConfirmId]    = useState(null)
  const [form,         setForm]         = useState(EMPTY)
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    if (location.state?._new) { abrirCrear(); window.history.replaceState({}, document.title) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtrados = pedidos.filter(p => {
    const q = busqueda.trim().toLowerCase()
    const matchQ = !q ||
      p.descripcion?.toLowerCase().includes(q) ||
      p.cliente_nombre?.toLowerCase().includes(q) ||
      p.cobro_ref?.toLowerCase().includes(q)
    return matchQ && (!filtroEstado || p.estado === filtroEstado)
  })

  const activos = pedidos.filter(p => p.estado !== 'entregado').length
  const esteMes = pedidos.filter(p => {
    if (!p.created_at) return false
    const d = new Date(p.created_at), now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  function abrirCrear() {
    setForm(EMPTY)
    setModal({ mode: 'crear' })
  }

  function abrirEditar(p) {
    const rj = p.receta_json || {}
    const { accesorios_usados = [], acabados_usados = [], ...recetaBase } = rj
    const totalUnits = Number(p.cantidad) || 1
    const toRow = arr => arr.filter(a => a.nombre).map(a => ({
      nombre:       a.nombre,
      qty:          String(a.cantidad_por_unidad != null ? a.cantidad_por_unidad : Number(a.cantidad_total || 0) / totalUnits),
      unidad:       a.unidad || 'u',
      inventario_id: a.inventario_id || null,
    }))
    setForm({
      descripcion:    p.descripcion    || '',
      cliente_id:     p.cliente_id     || '',
      cliente_nombre: p.cliente_nombre || '',
      cantidad:       p.cantidad       || '',
      estado:         p.estado         || 'en_cola',
      fecha_entrega:  p.fecha_entrega  || '',
      cobro_ref:      p.cobro_ref      || '',
      accesorios:     toRow(accesorios_usados),
      acabados:       toRow(acabados_usados),
      _recetaBase:    Object.keys(recetaBase).length > 0 ? recetaBase : null,
    })
    setModal({ mode: 'editar', id: p.id })
  }

  async function guardar() {
    if (!form.descripcion.trim()) return
    setSaving(true)
    const totalUnits = Number(form.cantidad) || 1
    const toUsado = arr => arr
      .filter(a => a.nombre.trim() && Number(a.qty) > 0)
      .map(a => ({
        nombre:              a.nombre.trim(),
        unidad:              a.unidad,
        inventario_id:       a.inventario_id || null,
        cantidad_por_unidad: Number(a.qty),
        cantidad_total:      Number(a.qty) * totalUnits,
      }))
    const accesoriosUsados = toUsado(form.accesorios)
    const acabadosUsados   = toUsado(form.acabados)
    const hasItems = accesoriosUsados.length > 0 || acabadosUsados.length > 0
    const receta_json = (hasItems || form._recetaBase)
      ? { ...(form._recetaBase || {}), accesorios_usados: accesoriosUsados, acabados_usados: acabadosUsados }
      : null
    const datos = {
      descripcion:    form.descripcion,
      cliente_id:     form.cliente_id     || null,
      cliente_nombre: form.cliente_nombre || null,
      cantidad:       form.cantidad ? Number(form.cantidad) : null,
      estado:         form.estado,
      fecha_entrega:  form.fecha_entrega  || null,
      cobro_ref:      form.cobro_ref.trim() || null,
      receta_json,
    }
    const ok = modal.mode === 'crear' ? await crearPedido(datos) : await actualizarPedido(modal.id, datos)
    setSaving(false)
    if (ok) setModal(null)
  }

  // ── Helpers filas de materiales ───────────────────────────────────────────
  const addAcc    = () => setForm(f => ({ ...f, accesorios: [...f.accesorios, { ...EMPTY_ROW }] }))
  const removeAcc = i  => setForm(f => ({ ...f, accesorios: f.accesorios.filter((_, j) => j !== i) }))
  const setAcc    = (i, k, v) => setForm(f => ({ ...f, accesorios: f.accesorios.map((a, j) => j === i ? { ...a, [k]: v } : a) }))
  const addAcb    = () => setForm(f => ({ ...f, acabados: [...f.acabados, { ...EMPTY_ROW }] }))
  const removeAcb = i  => setForm(f => ({ ...f, acabados: f.acabados.filter((_, j) => j !== i) }))
  const setAcb    = (i, k, v) => setForm(f => ({ ...f, acabados: f.acabados.map((a, j) => j === i ? { ...a, [k]: v } : a) }))

  function onInvLink(type, i, invId) {
    const invItem = matItems.find(m => m.id === invId)
    const setFn = type === 'acc' ? 'accesorios' : 'acabados'
    if (invId && invItem) {
      setForm(f => ({
        ...f,
        [setFn]: f[setFn].map((a, j) => j === i
          ? { ...a, inventario_id: invId, nombre: invItem.nombre, unidad: invItem.unidad || 'u' }
          : a
        ),
      }))
    } else {
      const setter = type === 'acc' ? setAcc : setAcb
      setter(i, 'inventario_id', null)
    }
  }

  async function confirmarEliminar() {
    setSaving(true)
    await eliminarPedido(confirmId)
    setSaving(false)
    setConfirmId(null)
  }

  // ── Sección reutilizable de materiales ────────────────────────────────────
  function MatSection({ label, items, onAdd, onRemove, onSet, onLink, datalistId }) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-navy-600">{label}</label>
          <button type="button" onClick={onAdd}
            className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
            <Plus size={12} /> Agregar
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-[#8a9ab0]">Sin {label.toLowerCase()}. Pulsa Agregar para añadir.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((a, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-[#f8f9fb] border border-[#e2e6ea] flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <input
                    list={datalistId}
                    value={a.nombre}
                    onChange={e => onSet(i, 'nombre', e.target.value)}
                    placeholder="Nombre del material..."
                    className="flex-1 min-w-0 border border-[#e2e6ea] rounded-lg px-2.5 py-1.5 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                  />
                  <input
                    type="number" min="0" step="0.5"
                    value={a.qty}
                    onChange={e => onSet(i, 'qty', e.target.value)}
                    placeholder="0"
                    className="w-16 border border-[#e2e6ea] rounded-lg px-2 py-1.5 text-sm text-right text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                  />
                  <select
                    value={a.unidad}
                    onChange={e => onSet(i, 'unidad', e.target.value)}
                    className="w-14 border border-[#e2e6ea] rounded-lg px-1 py-1.5 text-xs text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                  <button type="button" onClick={() => onRemove(i)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-500 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#8a9ab0] shrink-0">
                    {a.inventario_id ? '✅' : '○'} Descontar de inventario:
                  </span>
                  <select
                    value={a.inventario_id || ''}
                    onChange={e => onLink(i, e.target.value)}
                    className="flex-1 border border-[#e2e6ea] rounded-lg px-2 py-1 text-xs text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Sin vincular</option>
                    {matItems.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
        <datalist id={datalistId}>
          {sugerencias.map((n, idx) => <option key={idx} value={n} />)}
        </datalist>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Pedidos</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">Historial completo de todos los pedidos</p>
        </div>
        <Button onClick={abrirCrear}><Plus size={16} /> Nuevo pedido</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total pedidos', value: pedidos.length },
          { label: 'Activos ahora', value: activos },
          { label: 'Este mes',      value: esteMes },
        ].map(m => (
          <div key={m.label} className="bg-white border border-[#e2e6ea] rounded-xl p-4">
            <p className="text-xs font-medium text-[#8a9ab0] uppercase tracking-wide">{m.label}</p>
            <p className="text-2xl font-bold text-navy-600 mt-1">{loading ? '—' : m.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9ab0]" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por descripción, cliente o referencia..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#e2e6ea] rounded-lg bg-white text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent">
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="p-4"><Skeleton /></div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center gap-3">
            <ClipboardList size={40} className="text-[#e2e6ea]" />
            <p className="text-sm font-medium text-navy-600">
              {busqueda || filtroEstado ? 'Sin resultados' : 'Sin pedidos registrados'}
            </p>
            <p className="text-xs text-[#8a9ab0]">
              {busqueda || filtroEstado ? 'Prueba con otros filtros.' : 'Crea tu primer pedido con el botón de arriba o desde Producción.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Descripción</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Ref. Cobro</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Entrega</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Creado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f5]">
                  {filtrados.map(p => (
                    <tr key={p.id} className="hover:bg-[#f8f9fb] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-navy-600">{p.descripcion}</p>
                        {p.cantidad && (
                          <p className="text-xs text-[#8a9ab0] flex items-center gap-1 mt-0.5">
                            <Hash size={10} />{p.cantidad} unidad{p.cantidad !== 1 ? 'es' : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.cliente_nombre
                          ? <span className="flex items-center gap-1.5 text-[#8a9ab0]"><User size={12} />{p.cliente_nombre}</span>
                          : <span className="text-[#c0cad6]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={BADGE_COLOR[p.estado] || 'gray'}>{LABEL[p.estado] || p.estado}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {p.cobro_ref
                          ? <span className="flex items-center gap-1 text-[#8a9ab0]"><Link2 size={11} />{p.cobro_ref}</span>
                          : <span className="text-[#c0cad6]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#8a9ab0]">
                        {p.fecha_entrega
                          ? <span className="flex items-center gap-1.5"><Calendar size={12} />{fmtFecha(p.fecha_entrega)}</span>
                          : <span className="text-[#c0cad6]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#8a9ab0] text-xs">{fmtCreado(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => abrirEditar(p)}
                            className="p-1.5 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setConfirmId(p.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-[#f0f2f5]">
              {filtrados.map(p => (
                <div key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="font-medium text-navy-600 leading-tight">{p.descripcion}</p>
                      {p.cliente_nombre && (
                        <p className="text-xs text-[#8a9ab0] flex items-center gap-1 mt-0.5"><User size={10} />{p.cliente_nombre}</p>
                      )}
                    </div>
                    <Badge variant={BADGE_COLOR[p.estado] || 'gray'}>{LABEL[p.estado] || p.estado}</Badge>
                  </div>
                  {p.cobro_ref && <p className="text-xs text-[#8a9ab0] flex items-center gap-1 mb-0.5"><Link2 size={10} />{p.cobro_ref}</p>}
                  {p.fecha_entrega && <p className="text-xs text-[#8a9ab0] flex items-center gap-1 mb-2"><Calendar size={10} />{fmtFecha(p.fecha_entrega)}</p>}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => abrirEditar(p)}
                      className="flex items-center gap-1 text-xs text-[#8a9ab0] hover:text-navy-600 px-2 py-1 rounded-lg hover:bg-[#f0f2f5] transition-colors">
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => setConfirmId(p.id)}
                      className="flex items-center gap-1 text-xs text-[#8a9ab0] hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Modal crear/editar */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'crear' ? 'Nuevo pedido' : 'Editar pedido'}>
        <div className="flex flex-col gap-4">
          <Input label="Descripción *" value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            placeholder="Ej: Llavero personalizado, soporte para drone..." />
          <div className="grid grid-cols-2 gap-3">
            <ClienteAutocomplete clientes={clientes} value={form.cliente_nombre} clienteId={form.cliente_id}
              onChange={({ id, nombre }) => setForm(f => ({ ...f, cliente_id: id || '', cliente_nombre: nombre }))} />
            <Input label="Cantidad" type="number" min="1" value={form.cantidad}
              onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} placeholder="1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha de entrega" type="date" value={form.fecha_entrega}
              onChange={e => setForm(f => ({ ...f, fecha_entrega: e.target.value }))} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Estado</label>
              <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent">
                {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
          </div>
          <Input label="Referencia de cobro (opcional)" value={form.cobro_ref}
            onChange={e => setForm(f => ({ ...f, cobro_ref: e.target.value }))}
            placeholder="Ej: COB-0012, COT-005..." />

          {/* ── Accesorios ── */}
          <div className="border-t border-[#f0f2f5] pt-3">
            <MatSection
              label="Accesorios"
              items={form.accesorios}
              onAdd={addAcc}
              onRemove={removeAcc}
              onSet={setAcc}
              onLink={(i, v) => onInvLink('acc', i, v)}
              datalistId="sugg-acc-ped"
            />
          </div>

          {/* ── Acabados ── */}
          <div className="border-t border-[#f0f2f5] pt-3">
            <MatSection
              label="Acabados"
              items={form.acabados}
              onAdd={addAcb}
              onRemove={removeAcb}
              onSet={setAcb}
              onLink={(i, v) => onInvLink('acb', i, v)}
              datalistId="sugg-acb-ped"
            />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.descripcion.trim() || saving}>
              {saving ? 'Guardando...' : modal?.mode === 'crear' ? 'Crear pedido' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmar eliminar */}
      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Eliminar pedido" size="sm">
        <p className="text-sm text-navy-600 mb-5">¿Seguro que quieres eliminar este pedido? Esta acción no se puede deshacer.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmarEliminar} disabled={saving}>
            {saving ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
