import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, User, Hash, Pencil, Trash2, ArrowRight, Package, Link2, Clock } from 'lucide-react'
import ClienteAutocomplete from '../components/ui/ClienteAutocomplete'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { usePedidos } from '../hooks/usePedidos'
import { useClientes } from '../hooks/useClientes'
import { useInventario } from '../hooks/useInventario'
import { useCalculadoraConfig } from '../hooks/useCalculadoraStorage'
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

const UNIDADES = ['u', 'g', 'kg', 'ml', 'm', 'cm']


const EMPTY_ROW = { nombre: '', qty: '', unidad: 'u', inventario_id: null }

const EMPTY = {
  descripcion: '', cliente_id: '', cliente_nombre: '', cantidad: '',
  estado: 'en_cola', fecha_entrega: '', cobro_ref: '',
  accesorios:  [],
  acabados:    [],
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
  const { items: matItems } = useInventario()
  const calcConfig = useCalculadoraConfig()

  // Sugerencias para datalist: config Calculadora + inventario (sin duplicados)
  const sugerencias = useMemo(() => {
    const nombres = new Set()
    const lista = []
    ;[...calcConfig.accesorios, ...calcConfig.acabados, ...matItems].forEach(x => {
      if (x.nombre && !nombres.has(x.nombre)) {
        nombres.add(x.nombre)
        lista.push(x.nombre)
      }
    })
    return lista
  }, [matItems, calcConfig])

  const [modal,       setModal]       = useState(null)
  const [confirmId,   setConfirmId]   = useState(null)
  const [invModal,    setInvModal]    = useState(null)
  const [invItems,    setInvItems]    = useState([])
  const [form,        setForm]        = useState(EMPTY)
  const [saving,      setSaving]      = useState(false)
  const [deduciendo,  setDeduciendo]  = useState(false)
  const [draggingId,  setDraggingId]  = useState(null)
  const [overCol,     setOverCol]     = useState(null)

  useEffect(() => {
    if (!invModal) { setInvItems([]); return }
    const rj = invModal.receta_json || {}
    const cantidad = Number(invModal.cantidad) || 1

    // Accesorios y acabados — expande vínculos con proporciones
    const items = [
      ...(rj.accesorios_usados || []),
      ...(rj.acabados_usados   || []),
    ]
      .filter(i => i.cantidad_total > 0)
      .flatMap(i => {
        const links = i.inventario_links?.length > 0
          ? i.inventario_links
          : (i.inventario_id ? [{ inventario_id: i.inventario_id, proporcion: 100 }] : [])
        if (links.length === 0) {
          return [{ nombre: i.nombre, unidad: i.unidad || '', cantidad: i.cantidad_total, inventario_id: null }]
        }
        return links.map(link => ({
          nombre:        i.nombre + (links.length > 1 ? ` (${link.proporcion}%)` : ''),
          unidad:        i.unidad || '',
          cantidad:      Math.round(i.cantidad_total * (link.proporcion / 100) * 10) / 10,
          inventario_id: link.inventario_id,
        }))
      })

    // Filamento — si tiene gramos y está vinculado al inventario
    const filGramos = (rj.filamento_g_por_unidad || 0) * cantidad
    if (filGramos > 0 && rj.filamento_inventario_id) {
      const filItem = matItems.find(m => m.id === rj.filamento_inventario_id)
      items.unshift({
        nombre:        filItem ? `Filamento ${filItem.nombre}` : 'Filamento',
        unidad:        'g',
        cantidad:      filGramos,
        inventario_id: rj.filamento_inventario_id,
      })
    }

    setInvItems(items)
  }, [invModal, matItems])

  const porEstado = (estadoId) => pedidos.filter(p => (p.estado || 'en_cola') === estadoId)
  const activos   = pedidos.filter(p => p.estado !== 'entregado').length

  async function handleMoverEstado(pedido, nuevoEstado) {
    if (!pedido) return
    await moverEstado(pedido.id, nuevoEstado)
    if (nuevoEstado === 'terminado') {
      const items = [
        ...(pedido.receta_json?.accesorios_usados || []),
        ...(pedido.receta_json?.acabados_usados   || []),
      ].filter(i => i.cantidad_total > 0)
      const tieneFilamento = (pedido.receta_json?.filamento_g_por_unidad || 0) > 0 && pedido.receta_json?.filamento_inventario_id
      if (items.length > 0 || tieneFilamento || pedido.cobro_ref || pedido.receta_json?.precio_total > 0) setInvModal(pedido)
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
    let deducidos = 0, sinMatch = 0
    for (const item of pendientes) {
      let invRow = null
      if (item.inventario_id) {
        const { data } = await supabase.from('inventario').select('id, stock_actual').eq('id', item.inventario_id).limit(1)
        if (data?.length > 0) invRow = data[0]
      }
      if (!invRow) {
        const { data } = await supabase.from('inventario').select('id, stock_actual').ilike('nombre', item.nombre).limit(1)
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
    setForm({ ...EMPTY, estado: estadoId })
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
      descripcion:    p.descripcion || '',
      cliente_id:     p.cliente_id || '',
      cliente_nombre: p.cliente_nombre || '',
      cantidad:       p.cantidad || '',
      estado:         p.estado || 'en_cola',
      fecha_entrega:  p.fecha_entrega || '',
      cobro_ref:      p.cobro_ref || '',
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

  // ── Helpers filas de materiales ───────────────────────────────────────────
  const addAcc    = () => setForm(f => ({ ...f, accesorios: [...f.accesorios, { ...EMPTY_ROW }] }))
  const removeAcc = i  => setForm(f => ({ ...f, accesorios: f.accesorios.filter((_, j) => j !== i) }))
  const setAcc    = (i, k, v) => setForm(f => ({ ...f, accesorios: f.accesorios.map((a, j) => j === i ? { ...a, [k]: v } : a) }))
  const addAcb    = () => setForm(f => ({ ...f, acabados: [...f.acabados, { ...EMPTY_ROW }] }))
  const removeAcb = i  => setForm(f => ({ ...f, acabados: f.acabados.filter((_, j) => j !== i) }))
  const setAcb    = (i, k, v) => setForm(f => ({ ...f, acabados: f.acabados.map((a, j) => j === i ? { ...a, [k]: v } : a) }))

  // Al seleccionar un ítem del inventario: auto-rellena nombre y unidad
  function onInvLink(type, i, invId) {
    const invItem = matItems.find(m => m.id === invId)
    const setter = type === 'acc' ? setAcc : setAcb
    if (invId && invItem) {
      const setFn = type === 'acc' ? 'accesorios' : 'acabados'
      setForm(f => ({
        ...f,
        [setFn]: f[setFn].map((a, j) => j === i
          ? { ...a, inventario_id: invId, nombre: invItem.nombre, unidad: invItem.unidad || 'u' }
          : a
        ),
      }))
    } else {
      setter(i, 'inventario_id', null)
    }
  }

  async function confirmarEliminar() {
    setSaving(true)
    await eliminarPedido(confirmId)
    setSaving(false)
    setConfirmId(null)
  }

  function onDragStart(e, id) { setDraggingId(id); e.dataTransfer.effectAllowed = 'move' }
  function onDragOver(e, estadoId) { e.preventDefault(); setOverCol(estadoId) }
  function onDrop(e, estadoId) {
    e.preventDefault()
    if (draggingId) handleMoverEstado(pedidos.find(p => p.id === draggingId), estadoId)
    setDraggingId(null); setOverCol(null)
  }
  function onDragEnd() { setDraggingId(null); setOverCol(null) }

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
                    className="flex-1 min-w-0 border border-[#e2e6ea] rounded-lg px-2.5 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                  />
                  <input
                    type="number" min="0" step="0.5"
                    value={a.qty}
                    onChange={e => onSet(i, 'qty', e.target.value)}
                    placeholder="0"
                    className="w-14 shrink-0 border border-[#e2e6ea] rounded-lg px-2 py-2 text-sm text-right text-navy-600 focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                  />
                  <select
                    value={a.unidad}
                    onChange={e => onSet(i, 'unidad', e.target.value)}
                    className="w-14 shrink-0 border border-[#e2e6ea] rounded-lg px-1 py-2 text-xs text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                  <button type="button" onClick={() => onRemove(i)}
                    className="p-2 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-500 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#8a9ab0]">
                    {a.inventario_id ? '✅' : '○'} Descontar de inventario:
                  </span>
                  <select
                    value={a.inventario_id || ''}
                    onChange={e => onLink(i, e.target.value)}
                    className="w-full border border-[#e2e6ea] rounded-lg px-2 py-1.5 text-xs text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent"
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
    <div className="p-4 lg:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Producción</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">
            {loading ? '...' : `${activos} pedido${activos !== 1 ? 's' : ''} activo${activos !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => abrirCrear()}><Plus size={16} /> Nueva orden</Button>
      </div>

      {/* Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1 items-start">
        {ESTADOS.map(estado => {
          const items  = porEstado(estado.id)
          const isOver = overCol === estado.id
          return (
            <div
              key={estado.id}
              className={`flex flex-col shrink-0 w-[82vw] sm:w-60 lg:w-64 rounded-xl transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-accent' : 'bg-[#f8f9fb]'}`}
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
                          <span className="flex items-center gap-1.5 text-xs text-accent font-medium"><Link2 size={10} />{p.cobro_ref}</span>
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
      </div>

      {/* Modal crear/editar */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'crear' ? 'Nueva orden' : 'Editar orden'}>
        <div className="flex flex-col gap-4">
          <Input label="Descripción *" value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            placeholder="Ej: Llavero personalizado, soporte para drone..." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              datalistId="sugg-acc-prod"
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
              datalistId="sugg-acb-prod"
            />
          </div>

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

      {/* Modal terminado: descontar materiales */}
      {invModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setInvModal(null) }}>
          <div className="bg-white sm:rounded-2xl rounded-t-2xl w-full max-w-sm shadow-xl flex flex-col max-h-[92vh]">
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
                          <input type="number" min="0" step="0.5" value={item.cantidad}
                            onChange={e => setInvItems(prev => prev.map((it, j) => j === i ? { ...it, cantidad: e.target.value } : it))}
                            className="w-16 border border-[#e2e6ea] rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent/30 tabular-nums" />
                          {item.unidad && <span className="text-xs text-[#8a9ab0] w-7 shrink-0">{item.unidad}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-[#8a9ab0] mt-3 pb-2">Pon 0 para omitir un ítem.</p>
                </>
              ) : (
                <p className="text-sm text-[#8a9ab0] pb-2">Sin materiales vinculados a este pedido.</p>
              )}
            </div>
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
