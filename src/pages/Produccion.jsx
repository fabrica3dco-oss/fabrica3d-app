import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, User, Hash, Pencil, Trash2, ArrowRight, Search, UserPlus, Package, Link2, Clock, CreditCard } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { usePedidos } from '../hooks/usePedidos'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const ESTADOS = [
  { id: 'en_cola',     label: 'En cola',        color: 'gray',  bg: 'bg-gray-400',   desc: 'Esperando turno' },
  { id: 'diseno_stl',  label: 'Diseño STL',     color: 'blue',  bg: 'bg-blue-400',   desc: 'Modelado 3D en proceso' },
  { id: 'imprimiendo', label: 'Impresión',       color: 'amber', bg: 'bg-amber-500',  desc: 'En la impresora ahora' },
  { id: 'acabado',     label: 'Acabado final',   color: 'gray',  bg: 'bg-purple-400', desc: 'Lijado, resina o pintura' },
  { id: 'terminado',   label: 'Terminado',       color: 'green', bg: 'bg-green-400',  desc: 'Listo para entregar' },
  { id: 'entregado',   label: 'Entregado',       color: 'green', bg: 'bg-green-600',  desc: 'Entregado al cliente' },
]

const SIGUIENTE = {
  en_cola:     'diseno_stl',
  diseno_stl:  'imprimiendo',
  imprimiendo: 'acabado',
  acabado:     'terminado',
  terminado:   'entregado',
}
const LABEL_SIGUIENTE = {
  en_cola:     'Iniciar diseño',
  diseno_stl:  'Pasar a impresión',
  imprimiendo: 'Pasar a acabado',
  acabado:     'Marcar terminado',
  terminado:   'Marcar entregado',
}

const EMPTY = {
  descripcion: '', cliente_id: '', cliente_nombre: '', cantidad: '',
  estado: 'en_cola', fecha_entrega: '',
}

function diasRestantes(fecha) {
  if (!fecha) return null
  return Math.ceil((new Date(fecha + 'T00:00:00') - new Date()) / 86400000)
}

function ClienteAutocomplete({ clientes, value, clienteId, onChange }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState(value || '')
  const ref               = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtrados = query.trim()
    ? clientes.filter(c => c.empresa.toLowerCase().includes(query.toLowerCase()))
    : clientes.slice(0, 8)

  const hayExacto = clientes.some(c => c.empresa.toLowerCase() === query.trim().toLowerCase())

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      <label className="text-sm font-medium text-navy-600">Cliente</label>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9ab0]" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); onChange({ id: null, nombre: e.target.value }); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar o escribir cliente..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-[#e2e6ea] rounded-lg bg-white text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e2e6ea] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {filtrados.length === 0 && !query.trim() && (
            <p className="text-xs text-[#8a9ab0] px-3 py-2">Sin clientes guardados aún</p>
          )}
          {filtrados.map(c => (
            <button key={c.id} type="button" onMouseDown={() => { onChange({ id: c.id, nombre: c.empresa }); setQuery(c.empresa); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f8f9fb] flex items-center gap-2 ${clienteId === c.id ? 'bg-blue-50 text-accent font-medium' : 'text-navy-600'}`}>
              <User size={12} className="text-[#8a9ab0] shrink-0" />{c.empresa}
            </button>
          ))}
          {query.trim() && !hayExacto && (
            <button type="button" onMouseDown={() => { onChange({ id: null, nombre: query.trim() }); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-accent hover:bg-blue-50 flex items-center gap-2 border-t border-[#f0f2f5]">
              <UserPlus size={12} className="shrink-0" />Usar "<span className="font-medium">{query.trim()}</span>"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function BadgeFecha({ fecha }) {
  const dias = diasRestantes(fecha)
  if (dias === null) return null
  if (dias < 0)   return <span className="text-xs font-medium text-red-600">Vencido hace {Math.abs(dias)}d</span>
  if (dias === 0) return <span className="text-xs font-medium text-red-600">Vence hoy</span>
  if (dias <= 2)  return <span className="text-xs font-medium text-amber-600">Vence en {dias}d</span>
  return <span className="text-xs text-[#8a9ab0]">{new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
}

// Tiempo en estado actual a partir del historial
function tiempoEnEstado(pedido) {
  const hist = pedido?.historial_estados
  if (!hist?.length) return null
  const ultimo = [...hist].reverse().find(h => h.estado === pedido.estado)
  if (!ultimo) return null
  const diffMs = Date.now() - new Date(ultimo.fecha).getTime()
  const horas  = Math.floor(diffMs / 3600000)
  const dias   = Math.floor(horas / 24)
  if (dias >= 1) return `${dias}d`
  if (horas >= 1) return `${horas}h`
  return 'Recién'
}

export default function Produccion() {
  const navigate = useNavigate()
  const { pedidos, loading, crearPedido, actualizarPedido, moverEstado, eliminarPedido } = usePedidos()
  const [clientes,    setClientes]    = useState([])
  const [modal,       setModal]       = useState(null)
  const [confirmId,   setConfirmId]   = useState(null)
  const [invModal,    setInvModal]    = useState(null) // pedido con receta_json al llegar a terminado
  const [invItems,    setInvItems]    = useState([])  // lista editable de materiales a descontar
  const [form,        setForm]        = useState(EMPTY)
  const [saving,      setSaving]      = useState(false)
  const [deduciendo,  setDeduciendo]  = useState(false)
  const [draggingId,  setDraggingId]  = useState(null)
  const [overCol,     setOverCol]     = useState(null)

  useEffect(() => {
    supabase.from('clientes').select('id, empresa').order('empresa').then(({ data }) => setClientes(data || []))
  }, [])

  // Inicializar lista editable de materiales cuando se abre el modal de terminado
  useEffect(() => {
    if (!invModal) { setInvItems([]); return }
    const items = [
      ...(invModal.receta_json?.accesorios_usados || []),
      ...(invModal.receta_json?.acabados_usados   || []),
    ]
      .filter(i => i.cantidad_total > 0)
      .map(i => ({ nombre: i.nombre, unidad: i.unidad || '', cantidad: i.cantidad_total }))
    setInvItems(items)
  }, [invModal])

  const porEstado = (estadoId) => pedidos.filter(p => (p.estado || 'en_cola') === estadoId)
  const activos   = pedidos.filter(p => p.estado !== 'entregado').length

  // ── Mover estado con hook para inventario ─────────────────────────────────
  async function handleMoverEstado(pedido, nuevoEstado) {
    if (!pedido) return
    await moverEstado(pedido.id, nuevoEstado)
    if (nuevoEstado === 'terminado') {
      // Siempre mostrar modal de terminado (para ofrecer saldo + inventario)
      const items = [
        ...(pedido.receta_json?.accesorios_usados || []),
        ...(pedido.receta_json?.acabados_usados   || []),
      ].filter(i => i.cantidad_total > 0)
      if (items.length > 0 || pedido.cobro_ref) setInvModal(pedido)
    }
  }

  function irACobrarSaldo(pedido) {
    setInvModal(null)
    navigate('/cobros', {
      state: {
        fromProduccion: {
          cliente_nombre: pedido.cliente_nombre,
          cobro_ref:      pedido.cobro_ref,
          receta_json:    pedido.receta_json,
        },
      },
    })
  }

  async function deducirInventario() {
    setDeduciendo(true)
    const activos = invItems.filter(i => i.nombre && Number(i.cantidad) > 0)
    let deducidos = 0
    for (const item of activos) {
      const { data: inv } = await supabase
        .from('inventario').select('id, stock_actual')
        .ilike('nombre', item.nombre).limit(1)
      if (inv?.length > 0) {
        const nueva = Math.max(0, Number(inv[0].stock_actual) - Number(item.cantidad))
        await supabase.from('inventario').update({ stock_actual: nueva }).eq('id', inv[0].id)
        deducidos++
      }
    }
    setDeduciendo(false)
    setInvModal(null)
    if (deducidos > 0) toast.success(`${deducidos} material${deducidos !== 1 ? 'es' : ''} descontado${deducidos !== 1 ? 's' : ''} del inventario ✓`)
    else toast('Sin coincidencias en inventario — verifica los nombres', { icon: 'ℹ️' })
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function abrirCrear(estadoId = 'en_cola') {
    setForm({ ...EMPTY, estado: estadoId })
    setModal({ mode: 'crear' })
  }

  function abrirEditar(p) {
    setForm({
      descripcion:    p.descripcion || '',
      cliente_id:     p.cliente_id || '',
      cliente_nombre: p.cliente_nombre || '',
      cantidad:       p.cantidad || '',
      estado:         p.estado || 'en_cola',
      fecha_entrega:  p.fecha_entrega || '',
    })
    setModal({ mode: 'editar', id: p.id })
  }

  async function guardar() {
    if (!form.descripcion.trim()) return
    setSaving(true)
    const datos = {
      descripcion:    form.descripcion,
      cliente_id:     form.cliente_id || null,
      cliente_nombre: form.cliente_nombre || null,
      cantidad:       form.cantidad ? Number(form.cantidad) : null,
      estado:         form.estado,
      fecha_entrega:  form.fecha_entrega || null,
    }
    const ok = modal.mode === 'crear' ? await crearPedido(datos) : await actualizarPedido(modal.id, datos)
    setSaving(false)
    if (ok) setModal(null)
  }

  async function confirmarEliminar() {
    setSaving(true)
    await eliminarPedido(confirmId)
    setSaving(false)
    setConfirmId(null)
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────
  function onDragStart(e, id) { setDraggingId(id); e.dataTransfer.effectAllowed = 'move' }
  function onDragOver(e, estadoId) { e.preventDefault(); setOverCol(estadoId) }
  function onDrop(e, estadoId) {
    e.preventDefault()
    if (draggingId) {
      const pedido = pedidos.find(p => p.id === draggingId)
      handleMoverEstado(pedido, estadoId)
    }
    setDraggingId(null); setOverCol(null)
  }
  function onDragEnd() { setDraggingId(null); setOverCol(null) }

  return (
    <div className="p-4 lg:p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Producción</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">
            {loading ? '...' : `${activos} pedido${activos !== 1 ? 's' : ''} activo${activos !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => abrirCrear()}><Plus size={16} /> Nuevo pedido</Button>
      </div>

      {/* Kanban — scroll horizontal */}
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1 items-start">
        {ESTADOS.map(estado => {
          const items  = porEstado(estado.id)
          const isOver = overCol === estado.id
          return (
            <div
              key={estado.id}
              className={`flex flex-col shrink-0 w-60 lg:w-64 rounded-xl transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-accent' : 'bg-[#f8f9fb]'}`}
              onDragOver={e => onDragOver(e, estado.id)}
              onDrop={e => onDrop(e, estado.id)}
              onDragLeave={() => setOverCol(null)}
            >
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${estado.bg}`} />
                  <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide leading-none">{estado.label}</span>
                  <Badge variant={estado.color}>{items.length}</Badge>
                </div>
                <button onClick={() => abrirCrear(estado.id)} className="p-1 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              <p className="text-[10px] text-[#8a9ab0] px-3 pb-2">{estado.desc}</p>

              <div className="flex flex-col gap-2 px-2 pb-3 min-h-[80px]">
                {loading ? (
                  <div className="animate-pulse bg-[#e2e6ea] rounded-lg h-20 w-full" />
                ) : items.length === 0 ? (
                  <p className="text-xs text-[#8a9ab0] text-center py-4">{isOver ? 'Suelta aquí' : 'Sin pedidos'}</p>
                ) : (
                  items.map(p => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={e => onDragStart(e, p.id)}
                      onDragEnd={onDragEnd}
                      className={`bg-white border border-[#e2e6ea] rounded-lg p-3 cursor-grab active:cursor-grabbing select-none transition-all ${draggingId === p.id ? 'opacity-40 scale-95' : 'hover:shadow-sm hover:border-navy-200'}`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-sm font-semibold text-navy-600 leading-tight">{p.descripcion}</p>
                        <div className="flex items-center shrink-0 gap-0.5">
                          {tiempoEnEstado(p) && (
                            <span className="flex items-center gap-0.5 text-[10px] text-[#8a9ab0] mr-1">
                              <Clock size={9} />{tiempoEnEstado(p)}
                            </span>
                          )}
                          <button onClick={() => abrirEditar(p)} className="p-1 rounded hover:bg-[#f0f2f5] text-[#8a9ab0] hover:text-navy-600"><Pencil size={12} /></button>
                          <button onClick={() => setConfirmId(p.id)} className="p-1 rounded hover:bg-red-50 text-[#8a9ab0] hover:text-red-500"><Trash2 size={12} /></button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5 mb-2">
                        {p.cobro_ref && (
                          <span className="flex items-center gap-1.5 text-xs text-accent font-medium">
                            <Link2 size={10} />{p.cobro_ref}
                          </span>
                        )}
                        {p.cliente_nombre && (
                          <span className="flex items-center gap-1.5 text-xs text-[#8a9ab0]"><User size={10} />{p.cliente_nombre}</span>
                        )}
                        {p.cantidad && (
                          <span className="flex items-center gap-1.5 text-xs text-[#8a9ab0]"><Hash size={10} />{p.cantidad} unidad{p.cantidad !== 1 ? 'es' : ''}</span>
                        )}
                        {p.fecha_entrega && (
                          <span className="flex items-center gap-1.5"><Calendar size={10} className="text-[#8a9ab0]" /><BadgeFecha fecha={p.fecha_entrega} /></span>
                        )}
                        {/* Indicador de materiales */}
                        {p.receta_json && (
                          <span className="flex items-center gap-1 text-[10px] text-[#8a9ab0] bg-[#f0f2f5] rounded px-1.5 py-0.5 w-fit mt-0.5">
                            <Package size={9} /> materiales vinculados
                          </span>
                        )}
                      </div>

                      {SIGUIENTE[p.estado] && (
                        <div className="pt-2 border-t border-[#f0f2f5]">
                          <button
                            onClick={() => handleMoverEstado(p, SIGUIENTE[p.estado])}
                            className="flex items-center gap-1 text-[10px] font-medium text-accent hover:text-navy-600 transition-colors"
                          >
                            {LABEL_SIGUIENTE[p.estado]} <ArrowRight size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal crear/editar */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'crear' ? 'Nuevo pedido' : 'Editar pedido'}>
        <div className="flex flex-col gap-4">
          <Input label="Descripción *" value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            placeholder="Ej: Llavero personalizado, soporte para drone..." />
          <div className="grid grid-cols-2 gap-3">
            <ClienteAutocomplete
              clientes={clientes}
              value={form.cliente_nombre}
              clienteId={form.cliente_id}
              onChange={({ id, nombre }) => setForm(f => ({ ...f, cliente_id: id || '', cliente_nombre: nombre }))}
            />
            <Input label="Cantidad" type="number" min="1"
              value={form.cantidad}
              onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
              placeholder="1" />
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
          <Button variant="danger" onClick={confirmarEliminar} disabled={saving}>{saving ? 'Eliminando...' : 'Eliminar'}</Button>
        </div>
      </Modal>

      {/* ── Modal terminado: inventario + saldo ────────────────────────────── */}
      {invModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setInvModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="px-5 pt-5 pb-4 border-b border-[#e2e6ea]">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-lg">✅</span>
                <h2 className="font-semibold text-navy-600">Pedido terminado</h2>
              </div>
              <p className="text-xs text-[#8a9ab0] mt-1">
                {invModal.cliente_nombre && <span className="font-medium">{invModal.cliente_nombre} · </span>}
                {invModal.cobro_ref && <span>{invModal.cobro_ref}</span>}
              </p>
            </div>

            {/* Materiales editables */}
            {invItems.length > 0 && (
              <div className="px-5 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0]">Materiales usados</p>
                  <span className="text-[11px] text-[#8a9ab0]">Edita si usaste más o menos</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {invItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-sm text-navy-600 font-medium flex-1 truncate">{item.nombre}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs font-bold text-red-500">−</span>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={item.cantidad}
                          onChange={e => setInvItems(prev =>
                            prev.map((it, j) => j === i ? { ...it, cantidad: e.target.value } : it)
                          )}
                          className="w-16 border border-[#e2e6ea] rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent/30 tabular-nums"
                        />
                        {item.unidad && (
                          <span className="text-xs text-[#8a9ab0] w-7 shrink-0">{item.unidad}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-[#8a9ab0] mt-2 mb-1">
                  Se buscan por nombre en inventario. Pon 0 para omitir un ítem.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setInvModal(null)} disabled={deduciendo}>Omitir</Button>
                  <Button className="flex-1" onClick={deducirInventario} disabled={deduciendo}>
                    {deduciendo ? 'Descontando...' : 'Descontar inventario'}
                  </Button>
                </div>
              </div>
            )}

            {/* Cobro saldo */}
            {invModal.cobro_ref && invModal.receta_json?.precio_total > 0 && (
              <div className="px-5 py-4 border-t border-[#f0f2f5] mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={14} className="text-accent" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0]">Cobro pendiente</p>
                </div>
                <p className="text-sm text-navy-600 mb-3">
                  Si fue anticipo 50%, el saldo restante aún está pendiente de cobrar.
                </p>
                <button
                  onClick={() => irACobrarSaldo(invModal)}
                  className="w-full py-2 rounded-xl text-sm font-semibold border-2 border-accent text-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard size={14} /> Generar cobro de saldo →
                </button>
              </div>
            )}

            {/* Cerrar si no hay materiales ni saldo */}
            {invItems.length === 0 && !invModal.cobro_ref && (
              <div className="px-5 pb-5 pt-4">
                <Button className="w-full" onClick={() => setInvModal(null)}>Cerrar</Button>
              </div>
            )}

            {/* Botón cerrar solo si tiene saldo pero no materiales */}
            {invModal.cobro_ref && invItems.length === 0 && (
              <div className="px-5 pb-5">
                <Button variant="secondary" className="w-full" onClick={() => setInvModal(null)}>Cerrar sin cobrar</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
