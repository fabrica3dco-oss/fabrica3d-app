import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, User, Hash, Pencil, Trash2, ArrowRight, Package, Link2, Clock } from 'lucide-react'
import ClienteAutocomplete from '../components/ui/ClienteAutocomplete'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { usePedidos } from '../hooks/usePedidos'
import { useClientes } from '../hooks/useClientes'
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

// Lee la configuración de accesorios y acabados de la Calculadora
function getCalcConfig() {
  try {
    const raw = localStorage.getItem('f3d_calc_config_v2')
    if (!raw) return { accesorios: [], acabados: [] }
    const cfg = JSON.parse(raw)
    return { accesorios: cfg.accesorios || [], acabados: cfg.acabados || [] }
  } catch { return { accesorios: [], acabados: [] } }
}

const EMPTY = {
  descripcion: '', cliente_id: '', cliente_nombre: '', cantidad: '',
  estado: 'en_cola', fecha_entrega: '', cobro_ref: '',
  accesorios:  [],  // [{ id, nombre, unidad, qty }] — qty es cantidad_por_unidad
  acabados:    [],  // [{ id, nombre, unidad, qty }]
  _recetaBase: null,
}

function diasRestantes(fecha) {
  if (!fecha) return null
  return Math.ceil((new Date(fecha + 'T00:00:00') - new Date()) / 86400000)
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
  const { clientes } = useClientes()
  const [modal,       setModal]       = useState(null)
  const [confirmId,   setConfirmId]   = useState(null)
  const [invModal,    setInvModal]    = useState(null)
  const [invItems,    setInvItems]    = useState([])
  const [form,        setForm]        = useState(EMPTY)
  const [saving,      setSaving]      = useState(false)
  const [deduciendo,  setDeduciendo]  = useState(false)
  const [draggingId,  setDraggingId]  = useState(null)
  const [overCol,     setOverCol]     = useState(null)

  // Inicializar lista editable de materiales cuando se abre el modal de terminado
  useEffect(() => {
    if (!invModal) { setInvItems([]); return }
    const items = [
      ...(invModal.receta_json?.accesorios_usados || []),
      ...(invModal.receta_json?.acabados_usados   || []),
    ]
      .filter(i => i.cantidad_total > 0)
      .map(i => ({
        nombre:       i.nombre,
        unidad:       i.unidad || '',
        cantidad:     i.cantidad_total,
        inventario_id: i.inventario_id || null,
      }))
    setInvItems(items)
  }, [invModal])

  const porEstado = (estadoId) => pedidos.filter(p => (p.estado || 'en_cola') === estadoId)
  const activos   = pedidos.filter(p => p.estado !== 'entregado').length

  // ── Mover estado con hook para inventario ─────────────────────────────────
  async function handleMoverEstado(pedido, nuevoEstado) {
    if (!pedido) return
    await moverEstado(pedido.id, nuevoEstado)
    if (nuevoEstado === 'terminado') {
      const items = [
        ...(pedido.receta_json?.accesorios_usados || []),
        ...(pedido.receta_json?.acabados_usados   || []),
      ].filter(i => i.cantidad_total > 0)
      if (items.length > 0 || pedido.cobro_ref || pedido.receta_json?.precio_total > 0) setInvModal(pedido)
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
    const pendientes = invItems.filter(i => i.nombre && Number(i.cantidad) > 0)
    let deducidos = 0
    let sinMatch  = 0
    for (const item of pendientes) {
      let invRow = null
      // 1. Búsqueda por ID (exacta, sin ambigüedad)
      if (item.inventario_id) {
        const { data } = await supabase
          .from('inventario').select('id, stock_actual, nombre')
          .eq('id', item.inventario_id).limit(1)
        if (data?.length > 0) invRow = data[0]
      }
      // 2. Fallback: búsqueda por nombre (case-insensitive exacta)
      if (!invRow) {
        const { data } = await supabase
          .from('inventario').select('id, stock_actual, nombre')
          .ilike('nombre', item.nombre).limit(1)
        if (data?.length > 0) invRow = data[0]
      }
      if (invRow) {
        const nueva = Math.max(0, Number(invRow.stock_actual) - Number(item.cantidad))
        await supabase.from('inventario').update({ stock_actual: nueva }).eq('id', invRow.id)
        deducidos++
      } else {
        sinMatch++
      }
    }
    setDeduciendo(false)
    setInvModal(null)
    if (deducidos > 0 && sinMatch === 0) {
      toast.success(`${deducidos} material${deducidos !== 1 ? 'es' : ''} descontado${deducidos !== 1 ? 's' : ''} ✓`)
    } else if (deducidos > 0) {
      toast.success(`${deducidos} descontado${deducidos !== 1 ? 's' : ''} · ${sinMatch} sin match — vincúlalos en la Calculadora`)
    } else {
      toast('Ningún material encontrado. Vincúlalos en Calculadora → Configurar precios base', { icon: 'ℹ️' })
    }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function abrirCrear(estadoId = 'en_cola') {
    const cfg = getCalcConfig()
    setForm({
      ...EMPTY,
      estado:     estadoId,
      accesorios: cfg.accesorios.map(a => ({ id: a.id, nombre: a.nombre, unidad: a.unidad, inventario_id: a.inventario_id || null, qty: '' })),
      acabados:   cfg.acabados.map(a => ({ id: a.id, nombre: a.nombre, unidad: a.unidad, inventario_id: a.inventario_id || null, qty: '' })),
    })
    setModal({ mode: 'crear' })
  }

  function abrirEditar(p) {
    const cfg = getCalcConfig()
    const rj = p.receta_json || {}
    const { accesorios_usados = [], acabados_usados = [], ...recetaBase } = rj
    const totalUnits = Number(p.cantidad) || 1

    const accesorios = cfg.accesorios.map(a => {
      const found = accesorios_usados.find(u => u.nombre === a.nombre)
      let qty = ''
      if (found) {
        qty = found.cantidad_por_unidad != null
          ? String(found.cantidad_por_unidad)
          : String(Number(found.cantidad_total || 0) / totalUnits)
      }
      // inventario_id siempre desde el config actual (más fiable que el histórico)
      return { id: a.id, nombre: a.nombre, unidad: a.unidad, inventario_id: a.inventario_id || null, qty }
    })

    const acabados = cfg.acabados.map(a => {
      const found = acabados_usados.find(u => u.nombre === a.nombre)
      let qty = ''
      if (found) {
        qty = found.cantidad_por_unidad != null
          ? String(found.cantidad_por_unidad)
          : String(Number(found.cantidad_total || 0) / totalUnits)
      }
      return { id: a.id, nombre: a.nombre, unidad: a.unidad, inventario_id: a.inventario_id || null, qty }
    })

    setForm({
      descripcion:    p.descripcion || '',
      cliente_id:     p.cliente_id || '',
      cliente_nombre: p.cliente_nombre || '',
      cantidad:       p.cantidad || '',
      estado:         p.estado || 'en_cola',
      fecha_entrega:  p.fecha_entrega || '',
      cobro_ref:      p.cobro_ref || '',
      accesorios,
      acabados,
      _recetaBase:    Object.keys(recetaBase).length > 0 ? recetaBase : null,
    })
    setModal({ mode: 'editar', id: p.id })
  }

  async function guardar() {
    if (!form.descripcion.trim()) return
    setSaving(true)
    const totalUnits = Number(form.cantidad) || 1

    const accesoriosUsados = form.accesorios
      .filter(a => Number(a.qty) > 0)
      .map(a => ({
        nombre:              a.nombre,
        unidad:              a.unidad,
        inventario_id:       a.inventario_id || null,
        cantidad_por_unidad: Number(a.qty),
        cantidad_total:      Number(a.qty) * totalUnits,
      }))

    const acabadosUsados = form.acabados
      .filter(a => Number(a.qty) > 0)
      .map(a => ({
        nombre:              a.nombre,
        unidad:              a.unidad,
        inventario_id:       a.inventario_id || null,
        cantidad_por_unidad: Number(a.qty),
        cantidad_total:      Number(a.qty) * totalUnits,
      }))

    const hasItems = accesoriosUsados.length > 0 || acabadosUsados.length > 0
    const receta_json = (hasItems || form._recetaBase)
      ? {
          ...(form._recetaBase || {}),
          accesorios_usados: accesoriosUsados,
          acabados_usados:   acabadosUsados,
        }
      : null

    const datos = {
      descripcion:    form.descripcion,
      cliente_id:     form.cliente_id || null,
      cliente_nombre: form.cliente_nombre || null,
      cantidad:       form.cantidad ? Number(form.cantidad) : null,
      estado:         form.estado,
      fecha_entrega:  form.fecha_entrega || null,
      cobro_ref:      form.cobro_ref.trim() || null,
      receta_json,
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
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-navy-600">Producción</h1>
        <p className="text-sm text-[#8a9ab0] mt-0.5">
          {loading ? '...' : `${activos} pedido${activos !== 1 ? 's' : ''} activo${activos !== 1 ? 's' : ''}`}
        </p>
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

        {/* Botón Nueva orden — al final del kanban, alineado con las columnas */}
        <button
          onClick={() => abrirCrear()}
          className="shrink-0 w-60 lg:w-64 h-24 rounded-xl border-2 border-dashed border-[#d0d7e2] hover:border-accent hover:bg-blue-50/50 flex flex-col items-center justify-center gap-1.5 text-[#8a9ab0] hover:text-accent transition-all group self-start mt-0"
        >
          <div className="w-8 h-8 rounded-full bg-[#f0f2f5] group-hover:bg-accent/10 flex items-center justify-center transition-colors">
            <Plus size={16} />
          </div>
          <span className="text-xs font-semibold">Nueva orden</span>
        </button>
      </div>

      {/* Modal crear/editar */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'crear' ? 'Nueva orden' : 'Editar orden'}>
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
          <Input label="Referencia de cobro (opcional)" value={form.cobro_ref}
            onChange={e => setForm(f => ({ ...f, cobro_ref: e.target.value }))}
            placeholder="Ej: COB-0012, COT-005..." />

          {/* ── Accesorios ──────────────────────────────────────── */}
          {form.accesorios.length > 0 && (
            <div className="border-t border-[#f0f2f5] pt-3 flex flex-col gap-2">
              <div>
                <label className="text-sm font-semibold text-navy-600">Accesorios</label>
                <p className="text-xs text-[#8a9ab0] mt-0.5">Cantidad por unidad producida (0 o vacío = no aplica)</p>
              </div>
              <div className="flex flex-col gap-2">
                {form.accesorios.map((a, i) => (
                  <div key={a.id ?? i} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-navy-600 truncate">{a.nombre}</span>
                    <input
                      type="number" min="0" step="0.5"
                      value={a.qty}
                      onChange={e => setForm(f => ({ ...f, accesorios: f.accesorios.map((x, j) => j === i ? { ...x, qty: e.target.value } : x) }))}
                      placeholder="0"
                      className="w-20 border border-[#e2e6ea] rounded-lg px-2.5 py-2 text-sm text-navy-600 text-right focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <span className="text-xs text-[#8a9ab0] w-8 shrink-0 text-right">{a.unidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Acabados ──────────────────────────────────────── */}
          {form.acabados.length > 0 && (
            <div className="border-t border-[#f0f2f5] pt-3 flex flex-col gap-2">
              <div>
                <label className="text-sm font-semibold text-navy-600">Acabados</label>
                <p className="text-xs text-[#8a9ab0] mt-0.5">Cantidad por unidad producida (0 o vacío = no aplica)</p>
              </div>
              <div className="flex flex-col gap-2">
                {form.acabados.map((a, i) => (
                  <div key={a.id ?? i} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-navy-600 truncate">{a.nombre}</span>
                    <input
                      type="number" min="0" step="0.5"
                      value={a.qty}
                      onChange={e => setForm(f => ({ ...f, acabados: f.acabados.map((x, j) => j === i ? { ...x, qty: e.target.value } : x) }))}
                      placeholder="0"
                      className="w-20 border border-[#e2e6ea] rounded-lg px-2.5 py-2 text-sm text-navy-600 text-right focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <span className="text-xs text-[#8a9ab0] w-8 shrink-0 text-right">{a.unidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aviso si la Calculadora no tiene accesorios ni acabados configurados */}
          {form.accesorios.length === 0 && form.acabados.length === 0 && (
            <div className="border-t border-[#f0f2f5] pt-3">
              <p className="text-xs text-[#8a9ab0]">
                Sin accesorios ni acabados configurados. Agrégalos en la sección <strong>Calculadora</strong>.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.descripcion.trim() || saving}>
              {saving ? 'Guardando...' : modal?.mode === 'crear' ? 'Crear orden' : 'Guardar cambios'}
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
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl flex flex-col max-h-[90vh]">
            <div className="px-5 pt-5 pb-4 border-b border-[#e2e6ea] shrink-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-lg">✅</span>
                <h2 className="font-semibold text-navy-600">Pedido terminado</h2>
              </div>
              <p className="text-xs text-[#8a9ab0] mt-1">
                {invModal.cliente_nombre && <span className="font-medium">{invModal.cliente_nombre} · </span>}
                {invModal.cobro_ref && <span>{invModal.cobro_ref}</span>}
              </p>
            </div>

            {/* Cuerpo scrollable */}
            <div className="overflow-y-auto flex-1 px-5 pt-4">
              {invItems.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0]">Materiales usados</p>
                    <span className="text-[11px] text-[#8a9ab0]">Edita si usaste más o menos</span>
                  </div>
                  <ul className="flex flex-col gap-2.5">
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
                            className="w-16 border border-[#e2e6ea] rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent/30 tabular-nums"
                          />
                          {item.unidad && (
                            <span className="text-xs text-[#8a9ab0] w-7 shrink-0">{item.unidad}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-[#8a9ab0] mt-3 pb-2">
                    Se buscan por nombre en Materiales. Pon 0 para omitir un ítem.
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#8a9ab0] pb-2">Sin materiales vinculados a este pedido.</p>
              )}
            </div>

            {/* Botones fijos al pie */}
            <div className="px-5 pt-3 pb-5 border-t border-[#e2e6ea] shrink-0 flex flex-col gap-2">
              {invItems.length > 0 ? (
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setInvModal(null)} disabled={deduciendo}>Omitir</Button>
                  <Button className="flex-1" onClick={deducirInventario} disabled={deduciendo}>
                    {deduciendo ? 'Descontando...' : 'Descontar materiales'}
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={() => setInvModal(null)}>Cerrar</Button>
              )}
              {invModal?.receta_json?.precio_total > 0 && (
                <Button variant="secondary" className="w-full" onClick={() => irACobrarSaldo(invModal)}>
                  💰 Cobrar saldo al cliente
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
