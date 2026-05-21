import { useState } from 'react'
import { Plus, Calendar, User, Hash, Pencil, Trash2, DollarSign, ArrowRight } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { usePedidos } from '../hooks/usePedidos'

const ESTADOS = [
  { id: 'en_cola',    label: 'En cola',     color: 'gray',  bg: 'bg-gray-400',   desc: 'Pedidos esperando turno' },
  { id: 'imprimiendo',label: 'Imprimiendo', color: 'blue',  bg: 'bg-blue-500',   desc: 'En la impresora ahora' },
  { id: 'terminado',  label: 'Terminado',   color: 'amber', bg: 'bg-amber-500',  desc: 'Listo para entregar' },
  { id: 'entregado',  label: 'Entregado',   color: 'green', bg: 'bg-green-500',  desc: 'Entregado al cliente' },
]

const SIGUIENTE = { en_cola: 'imprimiendo', imprimiendo: 'terminado', terminado: 'entregado' }
const LABEL_SIGUIENTE = { en_cola: 'Iniciar impresión', imprimiendo: 'Marcar terminado', terminado: 'Marcar entregado' }

const EMPTY = {
  descripcion: '', cliente_nombre: '', cantidad: '', estado: 'en_cola',
  fecha_entrega: '', costo_produccion: '', precio_venta: '',
}

const cop = (v) => v ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v) : null

function diasRestantes(fecha) {
  if (!fecha) return null
  const diff = Math.ceil((new Date(fecha + 'T00:00:00') - new Date()) / 86400000)
  return diff
}

function BadgeFecha({ fecha }) {
  const dias = diasRestantes(fecha)
  if (dias === null) return null
  if (dias < 0)  return <span className="text-xs font-medium text-red-600">Vencido hace {Math.abs(dias)}d</span>
  if (dias === 0) return <span className="text-xs font-medium text-red-600">Vence hoy</span>
  if (dias <= 2)  return <span className="text-xs font-medium text-amber-600">Vence en {dias}d</span>
  return <span className="text-xs text-[#8a9ab0]">Entrega {new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
}

export default function Produccion() {
  const { pedidos, loading, crearPedido, actualizarPedido, moverEstado, eliminarPedido } = usePedidos()
  const [modal, setModal]         = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [overCol, setOverCol]     = useState(null)

  const porEstado = (estadoId) => pedidos.filter(p => (p.estado || 'en_cola') === estadoId)
  const activos   = pedidos.filter(p => p.estado !== 'entregado').length

  function abrirCrear(estadoId = 'en_cola') {
    setForm({ ...EMPTY, estado: estadoId })
    setModal({ mode: 'crear' })
  }

  function abrirEditar(p) {
    setForm({
      descripcion:      p.descripcion || '',
      cliente_nombre:   p.cliente_nombre || '',
      cantidad:         p.cantidad || '',
      estado:           p.estado || 'en_cola',
      fecha_entrega:    p.fecha_entrega || '',
      costo_produccion: p.costo_produccion || '',
      precio_venta:     p.precio_venta || '',
    })
    setModal({ mode: 'editar', id: p.id })
  }

  async function guardar() {
    if (!form.descripcion.trim()) return
    setSaving(true)
    const datos = {
      ...form,
      cantidad:         form.cantidad         ? Number(form.cantidad)         : null,
      costo_produccion: form.costo_produccion ? Number(form.costo_produccion) : 0,
      precio_venta:     form.precio_venta     ? Number(form.precio_venta)     : 0,
      fecha_entrega:    form.fecha_entrega || null,
    }
    let ok
    if (modal.mode === 'crear') ok = await crearPedido(datos)
    else ok = await actualizarPedido(modal.id, datos)
    setSaving(false)
    if (ok) setModal(null)
  }

  async function confirmarEliminar() {
    setSaving(true)
    await eliminarPedido(confirmId)
    setSaving(false)
    setConfirmId(null)
  }

  // Drag & drop
  function onDragStart(e, id) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e, estadoId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverCol(estadoId)
  }
  function onDrop(e, estadoId) {
    e.preventDefault()
    if (draggingId) moverEstado(draggingId, estadoId)
    setDraggingId(null)
    setOverCol(null)
  }
  function onDragEnd() { setDraggingId(null); setOverCol(null) }

  return (
    <div className="p-4 lg:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Producción</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">
            {loading ? '...' : `${activos} pedido${activos !== 1 ? 's' : ''} activo${activos !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => abrirCrear()}><Plus size={16} /> Nuevo pedido</Button>
      </div>

      {/* Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1 items-start">
        {ESTADOS.map((estado, idx) => {
          const items  = porEstado(estado.id)
          const isOver = overCol === estado.id
          return (
            <div
              key={estado.id}
              className={`flex flex-col shrink-0 w-64 lg:w-72 rounded-xl transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-accent' : 'bg-[#f8f9fb]'}`}
              onDragOver={e => onDragOver(e, estado.id)}
              onDrop={e => onDrop(e, estado.id)}
              onDragLeave={() => setOverCol(null)}
            >
              {/* Cabecera columna */}
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${estado.bg}`} />
                  <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">{estado.label}</span>
                  <Badge variant={estado.color}>{items.length}</Badge>
                </div>
                <button
                  onClick={() => abrirCrear(estado.id)}
                  className="p-1 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <p className="text-[10px] text-[#8a9ab0] px-3 pb-2">{estado.desc}</p>

              {/* Tarjetas */}
              <div className="flex flex-col gap-2 px-2 pb-3 min-h-[80px]">
                {loading ? (
                  <div className="animate-pulse bg-[#e2e6ea] rounded-lg h-24 w-full" />
                ) : items.length === 0 ? (
                  <p className="text-xs text-[#8a9ab0] text-center py-4">
                    {isOver ? 'Suelta aquí' : 'Sin pedidos'}
                  </p>
                ) : (
                  items.map(p => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={e => onDragStart(e, p.id)}
                      onDragEnd={onDragEnd}
                      className={`bg-white border border-[#e2e6ea] rounded-lg p-3 cursor-grab active:cursor-grabbing select-none transition-all ${draggingId === p.id ? 'opacity-40 scale-95' : 'hover:shadow-sm hover:border-navy-200'}`}
                    >
                      {/* Título + acciones */}
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-sm font-semibold text-navy-600 leading-tight">{p.descripcion}</p>
                        <div className="flex shrink-0 gap-0.5">
                          <button onClick={() => abrirEditar(p)} className="p-1 rounded hover:bg-[#f0f2f5] text-[#8a9ab0] hover:text-navy-600">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => setConfirmId(p.id)} className="p-1 rounded hover:bg-red-50 text-[#8a9ab0] hover:text-red-500">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Detalles */}
                      <div className="flex flex-col gap-0.5 mb-2">
                        {p.cliente_nombre && (
                          <span className="flex items-center gap-1.5 text-xs text-[#8a9ab0]">
                            <User size={10} />{p.cliente_nombre}
                          </span>
                        )}
                        {p.cantidad && (
                          <span className="flex items-center gap-1.5 text-xs text-[#8a9ab0]">
                            <Hash size={10} />{p.cantidad} unidad{p.cantidad !== 1 ? 'es' : ''}
                          </span>
                        )}
                        {p.fecha_entrega && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={10} className="text-[#8a9ab0]" />
                            <BadgeFecha fecha={p.fecha_entrega} />
                          </span>
                        )}
                      </div>

                      {/* Precio + botón avanzar */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#f0f2f5]">
                        {p.precio_venta ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                            <DollarSign size={10} />{cop(p.precio_venta)}
                          </span>
                        ) : <span />}
                        {SIGUIENTE[p.estado] && (
                          <button
                            onClick={() => moverEstado(p.id, SIGUIENTE[p.estado])}
                            className="flex items-center gap-1 text-[10px] font-medium text-accent hover:text-navy-600 transition-colors"
                          >
                            {LABEL_SIGUIENTE[p.estado]} <ArrowRight size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal crear/editar */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'crear' ? 'Nuevo pedido' : 'Editar pedido'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Descripción *"
            value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            placeholder="Ej: Prótesis dental × 3, Soporte para drone..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cliente"
              value={form.cliente_nombre}
              onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value }))}
              placeholder="Nombre del cliente"
            />
            <Input
              label="Cantidad"
              type="number"
              min="1"
              value={form.cantidad}
              onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
              placeholder="1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha de entrega"
              type="date"
              value={form.fecha_entrega}
              onChange={e => setForm(f => ({ ...f, fecha_entrega: e.target.value }))}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Estado</label>
              <select
                value={form.estado}
                onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Costo producción (COP)"
              type="number"
              value={form.costo_produccion}
              onChange={e => setForm(f => ({ ...f, costo_produccion: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Precio de venta (COP)"
              type="number"
              value={form.precio_venta}
              onChange={e => setForm(f => ({ ...f, precio_venta: e.target.value }))}
              placeholder="0"
            />
          </div>
          {form.precio_venta && form.costo_produccion && (
            <p className="text-xs text-green-700 font-medium -mt-2">
              Ganancia bruta: {cop(Number(form.precio_venta) - Number(form.costo_produccion))}
            </p>
          )}
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
