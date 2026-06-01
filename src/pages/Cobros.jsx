import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Download, CheckCircle, AlertCircle, Clock, Eye, Share2, X, Minus } from 'lucide-react'
import ClienteAutocomplete from '../components/ui/ClienteAutocomplete'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { useCobros } from '../hooks/useCobros'
import { useClientes } from '../hooks/useClientes'
import { generarPdfCobro, previewUrlCobro, blobCobro } from '../utils/pdfCobro'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const cop = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0)

const ESTADO_COLOR = { pendiente: 'amber', pagado: 'green', vencido: 'red' }
const ESTADO_LABEL = { pendiente: 'Pendiente', pagado: 'Pagado', vencido: 'Vencido' }
const ESTADOS      = ['pendiente', 'pagado', 'vencido']

const TIPO_STYLE = {
  'Pago total':   'bg-blue-50 text-blue-700',
  'Anticipo 50%': 'bg-amber-50 text-amber-700',
  'Saldo 50%':    'bg-teal-50 text-teal-700',
}
const METODOS      = [
  { id: 'transferencia', label: 'Transferencia bancaria' },
  { id: 'efectivo',      label: 'Efectivo' },
  { id: 'nequi',         label: 'Nequi' },
  { id: 'daviplata',     label: 'Daviplata' },
  { id: 'otro',          label: 'Otro' },
]

const LINEA_EMPTY = { descripcion: '', detalle: '', cantidad: 1, precio_unitario: '' }

const TIPOS_COBRO = [
  { id: 'Pago total',   label: 'Pago total' },
  { id: 'Anticipo 50%', label: 'Anticipo 50%' },
  { id: 'Saldo 50%',    label: 'Saldo 50%' },
]

const EMPTY = {
  cliente_id: '', cliente_nombre: '', concepto: 'Pago total',
  lineas: [{ ...LINEA_EMPTY }],
  estado: 'pendiente', fecha_emision: '',
  fecha_vencimiento: '', metodo_pago: '', notas: '',
  receta_json: null,
}

function Skeleton() {
  return <div className="flex flex-col gap-2">{Array(4).fill(0).map((_, i) => <div key={i} className="animate-pulse bg-[#e2e6ea] rounded h-12 w-full" />)}</div>
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Cobros() {
  const location = useLocation()
  const { cobros, loading, crearCobro, actualizarCobro, marcarPagado, eliminarCobro } = useCobros()
  const { clientes } = useClientes()
  const [busqueda,     setBusqueda]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo,   setFiltroTipo]   = useState('')
  const [modal,        setModal]       = useState(null)
  const [confirmId,    setConfirmId]   = useState(null)
  const [pagoModal,    setPagoModal]   = useState(null)
  const [metodoPago,   setMetodoPago]  = useState('')
  const [revertModal,  setRevertModal] = useState(null)
  const [linkedPedido, setLinkedPedido] = useState(null)  // orden de producción vinculada al cobro
  const [form,         setForm]        = useState(EMPTY)
  const [saving,       setSaving]      = useState(false)
  const [previewUrl,   setPreviewUrl]  = useState(null)


  // Pre-fill desde Producción (cobro de saldo al terminar pedido)
  useEffect(() => {
    const fromProd = location.state?.fromProduccion
    if (!fromProd) return
    const precioTotal = fromProd.receta_json?.precio_total || 0
    const saldoMonto  = precioTotal > 0 ? precioTotal * 0.5 : ''
    setForm({
      ...EMPTY,
      cliente_nombre: fromProd.cliente_nombre || '',
      concepto: 'Saldo 50%',
      lineas: [{
        descripcion: fromProd.receta_json?.producto || 'Saldo por pedido',
        detalle:     fromProd.cobro_ref ? `Ref: ${fromProd.cobro_ref}` : '',
        cantidad:    1,
        precio_unitario: saldoMonto,
      }],
      fecha_emision: new Date().toISOString().split('T')[0],
      receta_json: fromProd.receta_json || null,
    })
    setModal({ mode: 'crear' })
    window.history.replaceState({}, document.title)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill desde Calculadora (cobro directo)
  useEffect(() => {
    const fromCalc = location.state?.fromCalculadora
    if (!fromCalc) return
    setForm({
      ...EMPTY,
      cliente_nombre: '',
      concepto: 'Pago total',
      lineas: [{
        descripcion:     fromCalc.nombre || 'Producto 3D',
        detalle:         '',
        cantidad:        fromCalc.cantidad || 1,
        precio_unitario: fromCalc.precioSugerido || '',
      }],
      fecha_emision: new Date().toISOString().split('T')[0],
      receta_json: fromCalc.receta_json || null,
    })
    setModal({ mode: 'crear' })
    window.history.replaceState({}, document.title)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-abrir modal desde FAB móvil
  useEffect(() => {
    if (location.state?._new) { abrirCrear(); window.history.replaceState({}, document.title) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Al abrir el modal de reversión, buscar la orden de producción vinculada
  useEffect(() => {
    if (!revertModal) { setLinkedPedido(null); return }
    const cobroRef = `COB-${String(revertModal.numero).padStart(3, '0')}`
    supabase.from('pedidos')
      .select('id, descripcion, estado, cliente_nombre')
      .eq('cobro_ref', cobroRef)
      .limit(1)
      .then(({ data }) => setLinkedPedido(data?.[0] || null))
  }, [revertModal])

  // Marcar vencidos visualmente
  const hoy = new Date().toISOString().split('T')[0]
  const cobrosConEstado = cobros.map(c =>
    c.estado === 'pendiente' && c.fecha_vencimiento && c.fecha_vencimiento < hoy
      ? { ...c, estado: 'vencido' }
      : c
  )

  const filtrados = cobrosConEstado.filter(c => {
    const q = busqueda.trim().toLowerCase()
    const cotMatch = c.notas?.match(/Ref:\s*COT-(\d+)/i)
    const cotNum   = cotMatch ? String(parseInt(cotMatch[1], 10)).padStart(3, '0') : ''
    const matchQ   = !q ||
      String(c.numero).includes(q) ||
      c.cliente_nombre?.toLowerCase().includes(q) ||
      c.concepto?.toLowerCase().includes(q) ||
      cotNum.includes(q) ||
      String(Math.round(Number(c.monto))).includes(q)
    return matchQ &&
      (!filtroEstado || c.estado === filtroEstado) &&
      (!filtroTipo   || c.concepto === filtroTipo)
  })

  const totalPendiente = cobrosConEstado
    .filter(c => c.estado === 'pendiente' || c.estado === 'vencido')
    .reduce((s, c) => s + Number(c.monto), 0)
  const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const totalPagadoMes = cobrosConEstado.filter(c =>
    c.estado === 'pagado' && c.fecha_emision >= primerDiaMes
  ).reduce((s, c) => s + Number(c.monto), 0)
  const vencidos = cobrosConEstado.filter(c => c.estado === 'vencido').length

  // ── Líneas ─────────────────────────────────────────────────────────────────
  const subtotalLineas = (form.lineas || []).reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0)
  function setLinea(i, campo, valor) {
    setForm(f => ({ ...f, lineas: f.lineas.map((l, idx) => idx === i ? { ...l, [campo]: valor } : l) }))
  }
  function addLinea()     { setForm(f => ({ ...f, lineas: [...f.lineas, { ...LINEA_EMPTY }] })) }
  function removeLinea(i) { setForm(f => ({ ...f, lineas: f.lineas.filter((_, idx) => idx !== i) })) }

  // ── Modales ────────────────────────────────────────────────────────────────
  function abrirCrear() {
    const hoy = new Date().toISOString().split('T')[0]
    setForm({ ...EMPTY, fecha_emision: hoy })
    setModal({ mode: 'crear' })
  }
  function abrirEditar(c) {
    const tipoValido = TIPOS_COBRO.some(t => t.id === c.concepto)
    setForm({
      cliente_id: c.cliente_id || '', cliente_nombre: c.cliente_nombre || '',
      concepto: tipoValido ? c.concepto : 'Pago total',
      lineas: c.lineas?.length ? c.lineas : [{ ...LINEA_EMPTY }],
      estado: c.estado || 'pendiente', fecha_emision: c.fecha_emision || '',
      fecha_vencimiento: c.fecha_vencimiento || '',
      metodo_pago: c.metodo_pago || '',
      notas: c.notas || '',
      receta_json: c.receta_json || null,
    })
    setModal({ mode: 'editar', id: c.id })
  }

  async function guardar() {
    if (!form.cliente_nombre.trim() || form.lineas.length === 0) return

    // Auto-guardar cliente nuevo si no está en la lista
    let clienteId = form.cliente_id || null
    if (!clienteId) {
      const nombre = form.cliente_nombre.trim()
      const { data: existe } = await supabase.from('clientes').select('id').ilike('empresa', nombre).limit(1)
      if (existe?.length > 0) {
        clienteId = existe[0].id
      } else {
        const { data: nuevo } = await supabase.from('clientes').insert([{ empresa: nombre }]).select('id').single()
        if (nuevo) { clienteId = nuevo.id; toast.success(`"${nombre}" guardado en clientes`) }
      }
    }

    setSaving(true)
    const lineasValidas = form.lineas.map(l => ({
      descripcion: l.descripcion, detalle: l.detalle || null,
      cantidad: Number(l.cantidad) || 1, precio_unitario: Number(l.precio_unitario) || 0,
    }))
    const datos = {
      cliente_id:        clienteId,
      cliente_nombre:    form.cliente_nombre,
      concepto:          form.concepto,
      lineas:            lineasValidas,
      monto:             subtotalLineas,
      estado:            form.estado,
      fecha_emision:     form.fecha_emision     || null,
      fecha_vencimiento: form.fecha_vencimiento || null,
      metodo_pago:       form.metodo_pago       || null,
      notas:             form.notas             || null,
      receta_json:       form.receta_json       || null,
    }
    let ok
    if (modal.mode === 'crear') ok = await crearCobro(datos)
    else ok = await actualizarCobro(modal.id, datos)
    setSaving(false)
    if (ok) setModal(null)
  }

  async function confirmarPago() {
    const cobroPagando = cobros.find(c => c.id === pagoModal.id)
    setSaving(true)
    const ok = await marcarPagado(pagoModal.id, metodoPago)
    setSaving(false)
    setPagoModal(null)
    setMetodoPago('')

    // Si el cobro inicia producción (anticipo o pago total) → auto-crear pedido en cola
    if (ok && cobroPagando?.receta_json) {
      const esPrimerPago =
        cobroPagando.concepto === 'Pago total' ||
        cobroPagando.concepto === 'Anticipo 50%'
      if (esPrimerPago) {
        const receta   = cobroPagando.receta_json
        const cobroNum = cobroPagando.numero ? `COB-${String(cobroPagando.numero).padStart(3, '0')}` : null
        const { error } = await supabase.from('pedidos').insert([{
          descripcion:    receta.producto || cobroPagando.cliente_nombre || 'Pedido 3D',
          cliente_id:     cobroPagando.cliente_id || null,
          cliente_nombre: cobroPagando.cliente_nombre || null,
          cantidad:       receta.cantidad || 1,
          estado:         'en_cola',
          receta_json:    receta,
          cobro_ref:      cobroNum,
        }])
        if (!error) {
          toast.success('¡Pago confirmado! Pedido enviado a producción 🏭', { duration: 4000 })
        }
      }
    }
  }

  async function revertirAPendiente(c) {
    await actualizarCobro(c.id, { estado: 'pendiente', metodo_pago: null })
    if (linkedPedido) {
      const { error } = await supabase.from('pedidos').delete().eq('id', linkedPedido.id)
      if (!error) toast.success('Orden eliminada de Producción ✓')
    }
  }

  // ── PDF helpers ────────────────────────────────────────────────────────────
  async function getCotizacionData(cobro) {
    // Si el cobro tiene sus propias líneas (creado manualmente), usarlas directo
    if (cobro.lineas?.length) {
      return { lineas: cobro.lineas, total: cobro.monto, anticipoPagado: 0 }
    }
    if (!cobro.notas) return null
    const match = cobro.notas.match(/Ref:\s*COT-(\d+)/i)
    if (!match) return null
    const cotNum = parseInt(match[1], 10)

    // Líneas de la cotización
    const { data: cot } = await supabase
      .from('cotizaciones')
      .select('lineas, total, numero')
      .eq('numero', cotNum)
      .single()
    if (!cot?.lineas?.length) return null

    // Buscar anticipo PAGADO vinculado a la misma COT (excluyendo este cobro)
    const refStr = `COT-${String(cotNum).padStart(3, '0')}`
    const { data: anticipo } = await supabase
      .from('cobros')
      .select('monto')
      .ilike('notas', `%${refStr}%`)
      .ilike('concepto', '%anticipo%')
      .eq('estado', 'pagado')
      .neq('id', cobro.id)
      .maybeSingle()

    return {
      lineas: cot.lineas,
      total: cot.total,
      anticipoPagado: anticipo ? Number(anticipo.monto) : 0,
    }
  }

  async function descargarPdf(c) {
    const cotData = await getCotizacionData(c)
    await generarPdfCobro(c, cotData)
  }
  async function verPdf(c) {
    const cotData = await getCotizacionData(c)
    const url = await previewUrlCobro(c, cotData)
    setPreviewUrl(url)
  }

  async function compartirWhatsApp(c) {
    const num    = String(c.numero).padStart(4, '0')
    const nombre = c.cliente_nombre || 'cliente'
    const archivo = `CuentaCobro-${num}-${nombre}.pdf`
    const cotData = await getCotizacionData(c)
    const blob    = await blobCobro(c, cotData)
    const file    = new File([blob], archivo, { type: 'application/pdf' })
    const mensaje = `Hola${c.cliente_nombre ? ` ${c.cliente_nombre}` : ''}, te comparto la cuenta de cobro *#${num}* de Fabrica3D por un total de *${cop(c.monto)}*. Quedo atento a cualquier pregunta. 😊`

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Cuenta de cobro #${num} – Fabrica3D`, text: mensaje })
      } catch (err) {
        if (err.name !== 'AbortError') toast.error('No se pudo compartir el archivo.')
      }
    } else {
      toast('Tu navegador no soporta compartir archivos.\nDescarga el PDF y adjúntalo en WhatsApp.', { icon: 'ℹ️', duration: 5000 })
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Cuentas de cobro</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">{loading ? '...' : `${cobros.length} cuentas de cobro`}</p>
        </div>
        <Button onClick={abrirCrear}><Plus size={16} /> Nueva cuenta de cobro</Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-[#e2e6ea] rounded-xl p-4">
          <p className="text-xs font-medium text-[#8a9ab0] uppercase tracking-wide flex items-center gap-1"><Clock size={12} /> Por cobrar</p>
          <p className="text-xl font-bold text-navy-600 mt-1">{loading ? '—' : cop(totalPendiente)}</p>
        </div>
        <div className="bg-white border border-[#e2e6ea] rounded-xl p-4">
          <p className="text-xs font-medium text-[#8a9ab0] uppercase tracking-wide flex items-center gap-1"><CheckCircle size={12} /> Cobrado este mes</p>
          <p className="text-xl font-bold text-green-700 mt-1">{loading ? '—' : cop(totalPagadoMes)}</p>
        </div>
        <div className="bg-white border border-[#e2e6ea] rounded-xl p-4">
          <p className="text-xs font-medium text-[#8a9ab0] uppercase tracking-wide flex items-center gap-1"><AlertCircle size={12} /> Vencidos</p>
          <p className={`text-xl font-bold mt-1 ${vencidos > 0 ? 'text-red-600' : 'text-navy-600'}`}>{loading ? '—' : vencidos}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[140px] sm:min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9ab0]" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por #, cliente, COT, monto..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#e2e6ea] rounded-lg bg-white text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent">
          <option value="">Todos los tipos</option>
          {TIPOS_COBRO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent">
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
        </select>
      </div>

      {/* Lista */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="p-4"><Skeleton /></div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center gap-3">
            <span className="text-5xl">💳</span>
            <p className="text-sm font-medium text-navy-600">{busqueda || filtroEstado ? 'Sin resultados' : 'Sin cuentas de cobro aún'}</p>
            <p className="text-xs text-[#8a9ab0]">{busqueda || filtroEstado ? 'Prueba con otros filtros.' : 'Crea tu primera cuenta de cobro.'}</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[58px]">#</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[115px]">Tipo</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[82px]">COT</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[92px]">Fecha</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[108px]">Monto</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide w-[98px]">Estado</th>
                    <th className="px-3 py-3 w-[138px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f5]">
                  {filtrados.map(c => {
                    const cotMatch = c.notas?.match(/Ref:\s*COT-(\d+)/i)
                    const cotLabel = cotMatch ? String(parseInt(cotMatch[1],10)).padStart(3,'0') : null
                    const tipoStyle = TIPO_STYLE[c.concepto] || 'bg-[#f0f2f5] text-[#8a9ab0]'
                    return (
                    <tr key={c.id} className="hover:bg-[#f8f9fb] transition-colors">
                      <td className="px-3 py-3 font-mono font-semibold text-navy-600 text-xs">#{String(c.numero).padStart(4,'0')}</td>
                      <td className="px-3 py-3 font-medium text-navy-600 truncate">{c.cliente_nombre || '—'}</td>
                      <td className="px-3 py-3">
                        {c.concepto
                          ? <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${tipoStyle}`}>{c.concepto}</span>
                          : <span className="text-[#8a9ab0]">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        {cotLabel
                          ? <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-mono font-medium whitespace-nowrap">{cotLabel}</span>
                          : <span className="text-[#8a9ab0] text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#8a9ab0] whitespace-nowrap">
                        {c.fecha_emision
                          ? new Date(c.fecha_emision + 'T00:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' })
                          : '—'}
                      </td>
                      <td className="px-3 py-3 font-semibold text-navy-600 text-sm">{cop(c.monto)}</td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => c.estado !== 'pagado' ? (setPagoModal(c), setMetodoPago('')) : setRevertModal(c)}
                          title={c.estado !== 'pagado' ? 'Clic para marcar como pagado' : 'Clic para revertir a pendiente'}
                          className="group">
                          <Badge variant={ESTADO_COLOR[c.estado]} className="cursor-pointer group-hover:opacity-70 transition-opacity">
                            {ESTADO_LABEL[c.estado]}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-0.5 justify-end">
                          <button onClick={() => compartirWhatsApp(c)} title="Compartir por WhatsApp"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-[#8a9ab0] hover:text-green-600 transition-colors">
                            <Share2 size={13} />
                          </button>
                          <button onClick={() => verPdf(c)} title="Vista previa PDF"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8a9ab0] hover:text-accent transition-colors">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => descargarPdf(c)} title="Descargar PDF"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8a9ab0] hover:text-accent transition-colors">
                            <Download size={13} />
                          </button>
                          <button onClick={() => abrirEditar(c)} title="Editar"
                            className="p-1.5 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setConfirmId(c.id)} title="Eliminar"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-600 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-[#f0f2f5]">
              {filtrados.map(c => {
                const cotMatchM = c.notas?.match(/Ref:\s*COT-(\d+)/i)
                const cotLabelM = cotMatchM ? String(parseInt(cotMatchM[1],10)).padStart(3,'0') : null
                const tipoStyleM = TIPO_STYLE[c.concepto] || 'bg-[#f0f2f5] text-[#8a9ab0]'
                const descLineasM = (c.lineas || [])
                  .map(l => Number(l.cantidad) > 1 ? `${l.cantidad}× ${l.descripcion}` : l.descripcion)
                  .join(' · ')
                return (
                <div key={c.id} className="p-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-[#8a9ab0]">#{String(c.numero).padStart(4,'0')}</span>
                      {c.concepto && <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tipoStyleM}`}>{c.concepto}</span>}
                      {cotLabelM && <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-mono font-medium">{cotLabelM}</span>}
                      <button
                        onClick={() => c.estado !== 'pagado' ? (setPagoModal(c), setMetodoPago('')) : setRevertModal(c)}
                        title={c.estado !== 'pagado' ? 'Clic para marcar como pagado' : 'Clic para revertir a pendiente'}>
                        <Badge variant={ESTADO_COLOR[c.estado]} className="cursor-pointer hover:opacity-70 transition-opacity">
                          {ESTADO_LABEL[c.estado]}
                        </Badge>
                      </button>
                    </div>
                    <p className="font-medium text-navy-600 truncate">{c.cliente_nombre || '—'}</p>
                    {descLineasM && <p className="text-xs text-[#8a9ab0] truncate">{descLineasM}</p>}
                    <p className="text-sm font-semibold text-navy-600 mt-0.5">{cop(c.monto)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => compartirWhatsApp(c)} className="p-1.5 rounded-lg hover:bg-green-50 text-[#8a9ab0] hover:text-green-600"><Share2 size={14} /></button>
                    <button onClick={() => verPdf(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8a9ab0] hover:text-accent"><Eye size={14} /></button>
                    <button onClick={() => descargarPdf(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8a9ab0] hover:text-accent"><Download size={14} /></button>
                    <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600"><Pencil size={14} /></button>
                    <button onClick={() => setConfirmId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              )})}
            </div>
          </>
        )}
      </Card>

      {/* ── Modal crear/editar ──────────────────────────────────────────────── */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'crear' ? 'Nueva cuenta de cobro' : 'Editar cuenta de cobro'}>
        <div className="flex flex-col gap-4">
          <ClienteAutocomplete clientes={clientes} value={form.cliente_nombre} clienteId={form.cliente_id}
            onChange={({ id, nombre }) => setForm(f => ({ ...f, cliente_id: id || '', cliente_nombre: nombre }))} />

          {/* Tipo de cobro */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-600">Tipo de cobro</label>
            <div className="flex gap-2">
              {TIPOS_COBRO.map(t => (
                <button key={t.id} type="button"
                  onClick={() => setForm(f => ({ ...f, concepto: t.id }))}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border-2 font-medium transition-colors ${
                    form.concepto === t.id
                      ? 'border-accent bg-blue-50 text-accent'
                      : 'border-[#e2e6ea] bg-white text-[#8a9ab0] hover:border-[#c0cad6]'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Líneas / productos */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-navy-600">Productos / Servicios *</label>
              <button onClick={addLinea} type="button"
                className="text-xs text-accent hover:underline flex items-center gap-1">
                <Plus size={12} /> Agregar línea
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {(form.lineas || []).map((linea, i) => (
                <div key={i} className="flex flex-col gap-1.5 p-2 border border-[#e2e6ea] rounded-lg sm:border-0 sm:p-0 sm:grid sm:grid-cols-[1fr_80px_70px_24px] sm:gap-1.5 sm:items-start">
                  <div className="flex flex-col gap-1">
                    <input value={linea.descripcion}
                      onChange={e => setLinea(i, 'descripcion', e.target.value)}
                      placeholder="Descripción del producto o servicio"
                      className="w-full px-2.5 py-1.5 text-sm border border-[#e2e6ea] rounded-lg text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
                    <input value={linea.detalle || ''}
                      onChange={e => setLinea(i, 'detalle', e.target.value)}
                      placeholder="Detalle (opcional)"
                      className="w-full px-2.5 py-1.5 text-xs border border-[#e2e6ea] rounded-lg text-[#8a9ab0] placeholder:text-[#c0cad6] focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div className="flex gap-2 sm:contents">
                    <input value={linea.precio_unitario} type="number" min="0"
                      onChange={e => setLinea(i, 'precio_unitario', e.target.value)}
                      placeholder="Precio"
                      className="flex-1 sm:flex-none px-2.5 py-1.5 text-sm border border-[#e2e6ea] rounded-lg text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
                    <input value={linea.cantidad} type="number" min="1"
                      onChange={e => setLinea(i, 'cantidad', e.target.value)}
                      placeholder="Cant."
                      className="w-20 sm:w-auto px-2.5 py-1.5 text-sm border border-[#e2e6ea] rounded-lg text-navy-600 text-center focus:outline-none focus:ring-2 focus:ring-accent" />
                    <button onClick={() => removeLinea(i)} disabled={form.lineas.length === 1}
                      className="p-1.5 rounded hover:bg-red-50 text-[#8a9ab0] hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
                      <Minus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {subtotalLineas > 0 && (
              <div className="flex justify-end text-sm font-semibold text-navy-600 pr-8 pt-1 border-t border-[#f0f2f5]">
                Total: {cop(subtotalLineas)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Fecha de emisión" type="date" value={form.fecha_emision}
              onChange={e => setForm(f => ({ ...f, fecha_emision: e.target.value }))} />
            <Input label="Fecha de vencimiento" type="date" value={form.fecha_vencimiento}
              onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-600">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Información adicional..." rows={2}
              className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.cliente_nombre.trim() || form.lineas.length === 0 || saving}>
              {saving ? 'Guardando...' : modal?.mode === 'crear' ? 'Crear cuenta de cobro' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Vista previa PDF (igual que Cotizaciones) ───────────────────────── */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
          onClick={() => setPreviewUrl(null)}>
          <div className="relative bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col w-full max-w-3xl h-[92vh] sm:h-[90vh]"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e6ea] shrink-0">
              <span className="font-semibold text-navy-600 text-sm">Vista previa</span>
              <button onClick={() => setPreviewUrl(null)}
                className="p-1.5 rounded-lg hover:bg-[#f0f2f5] text-[#8a9ab0] hover:text-navy-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full rounded-b-2xl" title="Vista previa cobro" />
          </div>
        </div>
      )}

      {/* ── Registrar pago ─────────────────────────────────────────────────── */}
      <Modal open={!!pagoModal} onClose={() => setPagoModal(null)} title="Registrar pago" size="sm">
        <p className="text-sm text-navy-600 mb-4">
          Marcando como pagado: <strong>{pagoModal?.cliente_nombre}</strong> — {cop(pagoModal?.monto)}
        </p>
        <div className="flex flex-col gap-1 mb-5">
          <label className="text-sm font-medium text-navy-600">Método de pago</label>
          <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
            className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent">
            <option value="">— Selecciona (opcional) —</option>
            {METODOS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setPagoModal(null)}>Cancelar</Button>
          <Button onClick={confirmarPago} disabled={saving}>{saving ? 'Guardando...' : '✓ Confirmar pago'}</Button>
        </div>
      </Modal>

      {/* ── Confirmar revertir a pendiente ─────────────────────────────────── */}
      <Modal open={!!revertModal} onClose={() => setRevertModal(null)} title="Revertir pago" size="sm">
        <p className="text-sm text-navy-600 mb-1">
          ¿Seguro que quieres marcar esta cuenta como <strong>pendiente</strong> de nuevo?
        </p>
        <p className="text-xs text-[#8a9ab0] mb-3">
          {revertModal?.cliente_nombre} — {cop(revertModal?.monto)}
        </p>

        {/* Aviso sobre la orden de producción vinculada */}
        {linkedPedido ? (
          (() => {
            const enCola = linkedPedido.estado === 'en_cola'
            const estadoLabels = {
              en_cola: 'En cola', diseno_stl: 'Diseño STL', imprimiendo: 'Impresión',
              acabado: 'Acabado final', terminado: 'Terminado', entregado: 'Entregado',
            }
            return (
              <div className={`rounded-xl p-3 mb-4 text-xs border ${
                enCola
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <p className="font-semibold mb-1">
                  {enCola ? '⚠️' : '🚨'} También se eliminará la orden de Producción:
                </p>
                <p className="font-medium">{linkedPedido.descripcion}</p>
                <p className="mt-0.5 opacity-80">
                  Estado actual: <strong>{estadoLabels[linkedPedido.estado] || linkedPedido.estado}</strong>
                </p>
                {!enCola && (
                  <p className="mt-1.5 font-semibold">
                    Esta orden ya está en proceso. ¿Seguro que quieres eliminarla?
                  </p>
                )}
              </div>
            )
          })()
        ) : (
          <div className="rounded-xl p-3 mb-4 bg-[#f8f9fb] border border-[#e2e6ea] text-xs text-[#8a9ab0]">
            No se encontró ninguna orden de producción vinculada a este cobro.
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setRevertModal(null)}>Cancelar</Button>
          <Button variant="danger" disabled={saving} onClick={async () => {
            setSaving(true)
            await revertirAPendiente(revertModal)
            setSaving(false)
            setRevertModal(null)
          }}>
            {saving ? 'Revirtiendo...' : linkedPedido ? 'Revertir y eliminar orden' : 'Sí, revertir'}
          </Button>
        </div>
      </Modal>

      {/* ── Confirmar eliminar ──────────────────────────────────────────────── */}
      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Eliminar cuenta de cobro" size="sm">
        <p className="text-sm text-navy-600 mb-5">¿Seguro que quieres eliminar esta cuenta de cobro?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancelar</Button>
          <Button variant="danger" disabled={saving}
            onClick={async () => { setSaving(true); await eliminarCobro(confirmId); setSaving(false); setConfirmId(null) }}>
            {saving ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
