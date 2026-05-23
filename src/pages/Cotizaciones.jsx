import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, Download, Eye, Share2, User, UserPlus, X, ChevronDown, Receipt } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { useCotizaciones } from '../hooks/useCotizaciones'
import { generarPdfCotizacion, previewUrlCotizacion, blobCotizacion } from '../utils/pdfCotizacion'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const ESTADO_COLOR  = { borrador: 'gray', enviada: 'blue', aprobada: 'green', rechazada: 'red' }
const ESTADO_LABEL  = { borrador: 'Borrador', enviada: 'Enviada', aprobada: 'Aprobada', rechazada: 'Rechazada' }
const ESTADOS       = ['borrador', 'enviada', 'aprobada', 'rechazada']
const ESTADO_SELECT = {
  borrador:  'bg-gray-100 text-gray-600',
  enviada:   'bg-blue-100 text-blue-700',
  aprobada:  'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
}

const DEFAULT_NOTAS = [
  'Anticipo del 50% para iniciar producción.',
  'Saldo al momento de la entrega.',
  'El cliente debe enviar el logo en formato vectorial (AI, SVG, PDF) o PNG de alta resolución.',
  'Cotización válida por 7 días calendario.',
].join('\n')

const cop = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0)

const LINEA_EMPTY = { descripcion: '', detalle: '', cantidad: 1, precio_unitario: '' }
const FORM_EMPTY  = {
  cliente_id: '', cliente_nombre: '',
  lineas: [{ ...LINEA_EMPTY }],
  descuento: '', estado: 'borrador',
  valida_hasta: '', tiempo_entrega: '', notas: DEFAULT_NOTAS,
}

// ── Cliente autocomplete ──────────────────────────────────────────────────────
function ClienteAutocomplete({ clientes, value, clienteId, onChange }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState(value || '')
  const ref = useRef(null)
  useEffect(() => { setQuery(value || '') }, [value])
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])
  const filtrados = query.trim() ? clientes.filter(c => c.empresa.toLowerCase().includes(query.toLowerCase())) : clientes.slice(0, 8)
  const hayExacto = clientes.some(c => c.empresa.toLowerCase() === query.trim().toLowerCase())
  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      <label className="text-sm font-medium text-navy-600">Cliente</label>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9ab0]" />
        <input value={query}
          onChange={e => { setQuery(e.target.value); onChange({ id: null, nombre: e.target.value }); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-[#e2e6ea] rounded-lg bg-white text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e2e6ea] rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
          {filtrados.map(c => (
            <button key={c.id} type="button"
              onMouseDown={() => { onChange({ id: c.id, nombre: c.empresa, obj: c }); setQuery(c.empresa); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f8f9fb] flex items-center gap-2 ${clienteId === c.id ? 'bg-blue-50 text-accent font-medium' : 'text-navy-600'}`}>
              <User size={12} className="text-[#8a9ab0] shrink-0" />{c.empresa}
            </button>
          ))}
          {query.trim() && !hayExacto && (
            <button type="button"
              onMouseDown={() => { onChange({ id: null, nombre: query.trim(), obj: null }); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-accent hover:bg-blue-50 flex items-center gap-2 border-t border-[#f0f2f5]">
              <UserPlus size={12} className="shrink-0" />Usar "<span className="font-medium">{query.trim()}</span>"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Skeleton() {
  return <div className="flex flex-col gap-2">{Array(4).fill(0).map((_, i) => <div key={i} className="animate-pulse bg-[#e2e6ea] rounded h-12 w-full" />)}</div>
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Cotizaciones() {
  const { cotizaciones, loading, crearCotizacion, actualizarCotizacion, eliminarCotizacion } = useCotizaciones()
  const [clientes,     setClientes]     = useState([])
  const [busqueda,     setBusqueda]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modal,        setModal]        = useState(null)
  const [confirmId,    setConfirmId]    = useState(null)
  const [form,         setForm]         = useState(FORM_EMPTY)
  const [clienteObj,   setClienteObj]   = useState(null) // full client record for PDF
  const [saving,          setSaving]          = useState(false)
  const [previewUrl,      setPreviewUrl]      = useState(null)
  const [cobrosModal,     setCobrosModal]     = useState(null)
  const [modalidadCobro,  setModalidadCobro]  = useState('split') // 'split' | 'full'
  const [generandoCobros, setGenerandoCobros] = useState(false)
  const [cotConCobros,    setCotConCobros]    = useState(new Set()) // Set de números de COT que ya tienen cobros

  useEffect(() => {
    supabase.from('clientes').select('*').order('empresa').then(({ data }) => setClientes(data || []))
    // Qué cotizaciones ya tienen cobros generados
    supabase.from('cobros').select('notas').ilike('notas', '%Ref: COT-%').then(({ data }) => {
      const nums = new Set()
      data?.forEach(r => {
        const m = r.notas?.match(/Ref:\s*COT-(\d+)/i)
        if (m) nums.add(parseInt(m[1], 10))
      })
      setCotConCobros(nums)
    })
  }, [])

  const filtradas = cotizaciones.filter(c => {
    const ok = c.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
               String(c.numero).includes(busqueda)
    return ok && (!filtroEstado || c.estado === filtroEstado)
  })

  // ── Líneas helpers ─────────────────────────────────────────────────────────
  function setLinea(i, campo, valor) {
    setForm(f => ({ ...f, lineas: f.lineas.map((l, idx) => idx === i ? { ...l, [campo]: valor } : l) }))
  }
  function addLinea()     { setForm(f => ({ ...f, lineas: [...f.lineas, { ...LINEA_EMPTY }] })) }
  function removeLinea(i) { setForm(f => ({ ...f, lineas: f.lineas.filter((_, idx) => idx !== i) })) }

  const subtotal  = form.lineas.reduce((s, l) => s + Number(l.cantidad||0)*Number(l.precio_unitario||0), 0)
  const totalCalc = subtotal - Number(form.descuento || 0)

  // ── Modales ────────────────────────────────────────────────────────────────
  function abrirCrear() { setForm(FORM_EMPTY); setClienteObj(null); setModal({ mode: 'crear' }) }

  function abrirEditar(c) {
    setForm({
      cliente_id:     c.cliente_id || '',
      cliente_nombre: c.cliente_nombre || '',
      lineas:         c.lineas?.length ? c.lineas.map(l => ({ descripcion: l.descripcion||'', detalle: l.detalle||'', cantidad: l.cantidad||1, precio_unitario: l.precio_unitario||'' })) : [{ ...LINEA_EMPTY }],
      descuento:      c.descuento || '',
      estado:         c.estado || 'borrador',
      valida_hasta:   c.valida_hasta || '',
      tiempo_entrega: c.tiempo_entrega || '',
      notas:          c.notas || DEFAULT_NOTAS,
    })
    setClienteObj(clientes.find(cl => cl.id === c.cliente_id) || null)
    setModal({ mode: 'editar', id: c.id })
  }

  async function guardar() {
    if (!form.cliente_nombre.trim() || form.lineas.length === 0) return
    setSaving(true)
    const datos = {
      cliente_id:     form.cliente_id || null,
      cliente_nombre: form.cliente_nombre,
      lineas:         form.lineas.map(l => ({ descripcion: l.descripcion, detalle: l.detalle || null, cantidad: Number(l.cantidad)||1, precio_unitario: Number(l.precio_unitario)||0 })),
      descuento:      Number(form.descuento) || 0,
      total:          totalCalc,
      estado:         form.estado,
      valida_hasta:   form.valida_hasta || null,
      tiempo_entrega: form.tiempo_entrega || null,
      notas:          form.notas || null,
    }
    let ok
    if (modal.mode === 'crear') ok = await crearCotizacion(datos)
    else ok = await actualizarCotizacion(modal.id, datos)
    setSaving(false)
    if (ok) setModal(null)
  }

  async function descargarPdf(c) {
    const cliente = clientes.find(cl => cl.id === c.cliente_id) || null
    await generarPdfCotizacion(c, cliente)
  }

  async function verPdf(c) {
    const cliente = clientes.find(cl => cl.id === c.cliente_id) || null
    const url = await previewUrlCotizacion(c, cliente)
    setPreviewUrl(url)
  }

  async function compartirWhatsApp(c) {
    const cliente = clientes.find(cl => cl.id === c.cliente_id) || null
    const num     = String(c.numero).padStart(3, '0')
    const nombre  = c.cliente_nombre || 'cliente'
    const archivo = `COT-${num}-${nombre}.pdf`

    const blob = await blobCotizacion(c, cliente)
    const file = new File([blob], archivo, { type: 'application/pdf' })

    const mensaje = `Hola${c.cliente_nombre ? ` ${c.cliente_nombre}` : ''}, te comparto la cotización *COT-${num}* de Fabrica3D por un total de *${cop(c.total)}*. Quedo atento a cualquier pregunta. 😊`

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Cotización COT-${num} – Fabrica3D`, text: mensaje })
      } catch (err) {
        if (err.name !== 'AbortError') toast.error('No se pudo compartir el archivo.')
      }
    } else {
      toast('Tu navegador no soporta compartir archivos directamente.\nDescarga el PDF y adjúntalo en WhatsApp.', { icon: 'ℹ️', duration: 5000 })
    }
  }

  async function confirmarGenerarCobros() {
    const c = cobrosModal
    if (!c) return
    const num    = String(c.numero).padStart(3, '0')
    const hoy    = new Date().toISOString().split('T')[0]
    const vence7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const total  = Number(c.total)

    const cobros = modalidadCobro === 'split'
      ? [
          {
            cliente_id: c.cliente_id || null, cliente_nombre: c.cliente_nombre,
            concepto: 'Anticipo 50%',
            monto: total * 0.5, estado: 'pendiente',
            fecha_emision: hoy,
            notas: `Anticipo para iniciar producción.\nRef: COT-${num}`,
          },
          {
            cliente_id: c.cliente_id || null, cliente_nombre: c.cliente_nombre,
            concepto: 'Saldo 50%',
            monto: total * 0.5, estado: 'pendiente',
            fecha_emision: hoy,
            notas: `Saldo contra entrega del pedido.\nRef: COT-${num}`,
          },
        ]
      : [
          {
            cliente_id: c.cliente_id || null, cliente_nombre: c.cliente_nombre,
            concepto: 'Pago total',
            monto: total, estado: 'pendiente',
            fecha_emision: hoy,
            notas: `Pago total del pedido.\nRef: COT-${num}`,
          },
        ]

    setGenerandoCobros(true)
    const { error } = await supabase.from('cobros').insert(cobros)
    setGenerandoCobros(false)
    setCobrosModal(null)

    if (error) toast.error('No se pudieron generar las cuentas de cobro.')
    else {
      setCotConCobros(prev => new Set([...prev, c.numero]))
      toast.success(
        modalidadCobro === 'split'
          ? `¡Listo! Anticipo y saldo generados para COT-${num}.`
          : `¡Listo! Cuenta de cobro por el total generada para COT-${num}.`,
        { duration: 4000 }
      )
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Cotizaciones</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">{loading ? '...' : `${cotizaciones.length} cotizaciones`}</p>
        </div>
        <Button onClick={abrirCrear}><Plus size={16} /> Nueva cotización</Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9ab0]" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por cliente o número..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#e2e6ea] rounded-lg bg-white text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
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
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center gap-3">
            <span className="text-5xl">📄</span>
            <p className="text-sm font-medium text-navy-600">{busqueda || filtroEstado ? 'Sin resultados' : 'Sin cotizaciones aún'}</p>
            <p className="text-xs text-[#8a9ab0]">{busqueda || filtroEstado ? 'Prueba con otros filtros.' : 'Crea tu primera cotización.'}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Total</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Válida hasta</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f5]">
                  {filtradas.map(c => (
                    <tr key={c.id} className="hover:bg-[#f8f9fb] transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-navy-600">COT-{String(c.numero).padStart(3,'0')}</td>
                      <td className="px-4 py-3 font-medium text-navy-600">{c.cliente_nombre || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-navy-600">{cop(c.total)}</td>
                      <td className="px-4 py-3">
                        <div className="relative inline-flex items-center">
                          <select
                            value={c.estado}
                            onClick={e => e.stopPropagation()}
                            onChange={async e => {
                              e.stopPropagation()
                              await actualizarCotizacion(c.id, { estado: e.target.value })
                            }}
                            className={`text-xs font-semibold pl-2.5 pr-6 py-1 rounded-full cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-accent transition-colors appearance-none ${ESTADO_SELECT[c.estado]}`}>
                            {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 pointer-events-none opacity-60" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#8a9ab0]">
                        {c.valida_hasta ? new Date(c.valida_hasta+'T00:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {c.estado === 'aprobada' && (
                            cotConCobros.has(c.numero)
                              ? <button disabled title="Ya se generaron cuentas de cobro para esta cotización"
                                  className="p-1.5 rounded-lg bg-purple-100 text-purple-300 cursor-not-allowed">
                                  <Receipt size={15} />
                                </button>
                              : <button onClick={() => { setCobrosModal(c); setModalidadCobro('split') }}
                                  title="Generar cuentas de cobro"
                                  className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm">
                                  <Receipt size={15} />
                                </button>
                          )}
                          <button onClick={() => compartirWhatsApp(c)} title="Compartir por WhatsApp"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-[#8a9ab0] hover:text-green-600 transition-colors">
                            <Share2 size={14} />
                          </button>
                          <button onClick={() => verPdf(c)} title="Vista previa PDF"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8a9ab0] hover:text-accent transition-colors">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => descargarPdf(c)} title="Descargar PDF"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8a9ab0] hover:text-accent transition-colors">
                            <Download size={14} />
                          </button>
                          <button onClick={() => abrirEditar(c)}
                            className="p-1.5 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setConfirmId(c.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-600 transition-colors">
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
              {filtradas.map(c => (
                <div key={c.id} className="p-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-semibold text-[#8a9ab0]">COT-{String(c.numero).padStart(3,'0')}</span>
                      <div className="relative inline-flex items-center">
                        <select
                          value={c.estado}
                          onClick={e => e.stopPropagation()}
                          onChange={async e => { e.stopPropagation(); await actualizarCotizacion(c.id, { estado: e.target.value }) }}
                          className={`text-xs font-semibold pl-2 pr-5 py-0.5 rounded-full cursor-pointer border-0 focus:outline-none appearance-none ${ESTADO_SELECT[c.estado]}`}>
                          {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
                        </select>
                        <ChevronDown size={10} className="absolute right-1 pointer-events-none opacity-60" />
                      </div>
                    </div>
                    <p className="font-medium text-navy-600 truncate">{c.cliente_nombre || '—'}</p>
                    <p className="text-sm font-semibold text-navy-600 mt-0.5">{cop(c.total)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.estado === 'aprobada' && (
                      cotConCobros.has(c.numero)
                        ? <button disabled title="Ya se generaron cuentas de cobro para esta cotización"
                            className="p-1.5 rounded-lg bg-purple-100 text-purple-300 cursor-not-allowed"><Receipt size={15} /></button>
                        : <button onClick={() => { setCobrosModal(c); setModalidadCobro('split') }} title="Generar cuentas de cobro"
                            className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-sm"><Receipt size={15} /></button>
                    )}
                    <button onClick={() => compartirWhatsApp(c)} title="WhatsApp" className="p-1.5 rounded-lg hover:bg-green-50 text-[#8a9ab0] hover:text-green-600"><Share2 size={14} /></button>
                    <button onClick={() => verPdf(c)} title="Vista previa" className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8a9ab0] hover:text-accent"><Eye size={14} /></button>
                    <button onClick={() => descargarPdf(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8a9ab0] hover:text-accent"><Download size={14} /></button>
                    <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600"><Pencil size={14} /></button>
                    <button onClick={() => setConfirmId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* ── Modal crear/editar ──────────────────────────────────────────────── */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'crear' ? 'Nueva cotización' : 'Editar cotización'} size="lg">
        <div className="flex flex-col gap-5">
          {/* Cliente + Estado */}
          <div className="grid grid-cols-2 gap-3">
            <ClienteAutocomplete
              clientes={clientes}
              value={form.cliente_nombre}
              clienteId={form.cliente_id}
              onChange={({ id, nombre, obj }) => { setForm(f => ({ ...f, cliente_id: id || '', cliente_nombre: nombre })); setClienteObj(obj || null) }}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Estado</label>
              <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent">
                {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
              </select>
            </div>
          </div>

          {/* Ítems */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-navy-600">Ítems</label>
              <button onClick={addLinea} className="text-xs text-accent font-medium flex items-center gap-1 hover:text-navy-600 transition-colors">
                <Plus size={12} /> Agregar ítem
              </button>
            </div>
            <div className="hidden md:grid grid-cols-[1fr_56px_110px_24px] gap-2 mb-1 px-1">
              <span className="text-xs text-[#8a9ab0] font-medium">Descripción</span>
              <span className="text-xs text-[#8a9ab0] font-medium text-center">Cant.</span>
              <span className="text-xs text-[#8a9ab0] font-medium text-right">Precio unit.</span>
              <span />
            </div>
            <div className="flex flex-col gap-3">
              {form.lineas.map((linea, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="grid grid-cols-[1fr_56px_110px_24px] gap-2 items-center">
                    <input value={linea.descripcion} onChange={e => setLinea(i,'descripcion',e.target.value)} placeholder="Nombre del producto"
                      className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
                    <input type="number" min="1" value={linea.cantidad} onChange={e => setLinea(i,'cantidad',e.target.value)}
                      className="border border-[#e2e6ea] rounded-lg px-2 py-2 text-sm text-navy-600 text-center focus:outline-none focus:ring-2 focus:ring-accent" />
                    <input type="number" min="0" value={linea.precio_unitario} onChange={e => setLinea(i,'precio_unitario',e.target.value)} placeholder="0"
                      className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 text-right focus:outline-none focus:ring-2 focus:ring-accent" />
                    <button onClick={() => removeLinea(i)} disabled={form.lineas.length === 1}
                      className="p-1 rounded hover:bg-red-50 text-[#8a9ab0] hover:text-red-500 disabled:opacity-30 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  <input value={linea.detalle} onChange={e => setLinea(i,'detalle',e.target.value)}
                    placeholder="Detalle / especificaciones (opcional)"
                    className="border border-[#e2e6ea] rounded-lg px-3 py-1.5 text-xs text-[#8a9ab0] placeholder:text-[#b0bec5] focus:outline-none focus:ring-2 focus:ring-accent ml-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Descuento + Total */}
          <div className="flex items-end justify-between gap-4 pt-1 border-t border-[#f0f2f5]">
            <Input label="Descuento (COP)" type="number" min="0" value={form.descuento}
              onChange={e => setForm(f => ({ ...f, descuento: e.target.value }))} placeholder="0" className="max-w-[160px]" />
            <div className="text-right">
              {Number(form.descuento) > 0 && <p className="text-xs text-[#8a9ab0] mb-0.5">Subtotal: {cop(subtotal)}</p>}
              <p className="text-lg font-bold text-navy-600">Total: {cop(totalCalc)}</p>
            </div>
          </div>

          {/* Fechas + Tiempo entrega */}
          <div className="grid grid-cols-3 gap-3">
            <Input label="Válida hasta" type="date" value={form.valida_hasta} onChange={e => setForm(f => ({ ...f, valida_hasta: e.target.value }))} />
            <div className="col-span-2">
              <Input label="Tiempo de entrega" value={form.tiempo_entrega} onChange={e => setForm(f => ({ ...f, tiempo_entrega: e.target.value }))} placeholder="Ej: 5-7 días hábiles" />
            </div>
          </div>

          {/* Condiciones / Notas */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-600">Condiciones <span className="text-[#8a9ab0] font-normal text-xs">(una por línea)</span></label>
            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              rows={5}
              className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.cliente_nombre.trim() || form.lineas.length === 0 || saving}>
              {saving ? 'Guardando...' : modal?.mode === 'crear' ? 'Crear cotización' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Vista previa PDF ────────────────────────────────────────────────── */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPreviewUrl(null)}>
          <div className="relative bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-3xl"
            style={{ height: 'min(90vh, 900px)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e6ea]">
              <span className="font-semibold text-navy-600 text-sm">Vista previa</span>
              <button onClick={() => setPreviewUrl(null)}
                className="p-1.5 rounded-lg hover:bg-[#f0f2f5] text-[#8a9ab0] hover:text-navy-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            {/* PDF iframe */}
            <iframe
              src={previewUrl}
              className="flex-1 w-full rounded-b-2xl"
              title="Vista previa cotización"
            />
          </div>
        </div>
      )}

      {/* ── Generar cuentas de cobro ───────────────────────────────────────── */}
      <Modal open={!!cobrosModal} onClose={() => setCobrosModal(null)} title="Generar cuentas de cobro" size="sm">
        {cobrosModal && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#8a9ab0]">
              <strong className="text-navy-600">{cobrosModal.cliente_nombre}</strong> · Total {cop(cobrosModal.total)}
            </p>

            {/* Selector de modalidad */}
            <div className="flex flex-col gap-2">
              {/* Opción 50/50 */}
              <button onClick={() => setModalidadCobro('split')}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 border-2 text-left transition-colors ${modalidadCobro === 'split' ? 'border-accent bg-blue-50' : 'border-[#e2e6ea] bg-[#f8f9fb] hover:border-accent/40'}`}>
                <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${modalidadCobro === 'split' ? 'border-accent' : 'border-[#c0cad6]'}`}>
                  {modalidadCobro === 'split' && <span className="w-2 h-2 rounded-full bg-accent block" />}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy-600">50% anticipo + 50% saldo</p>
                  <p className="text-xs text-[#8a9ab0] mt-0.5">Dos cuentas de cobro pendientes</p>
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs bg-white border border-[#e2e6ea] rounded-lg px-2 py-1 text-navy-600 font-medium">Anticipo {cop(cobrosModal.total * 0.5)}</span>
                    <span className="text-xs bg-white border border-[#e2e6ea] rounded-lg px-2 py-1 text-navy-600 font-medium">Saldo {cop(cobrosModal.total * 0.5)}</span>
                  </div>
                </div>
              </button>

              {/* Opción 100% */}
              <button onClick={() => setModalidadCobro('full')}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 border-2 text-left transition-colors ${modalidadCobro === 'full' ? 'border-accent bg-blue-50' : 'border-[#e2e6ea] bg-[#f8f9fb] hover:border-accent/40'}`}>
                <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${modalidadCobro === 'full' ? 'border-accent' : 'border-[#c0cad6]'}`}>
                  {modalidadCobro === 'full' && <span className="w-2 h-2 rounded-full bg-accent block" />}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy-600">100% en una sola cuenta</p>
                  <p className="text-xs text-[#8a9ab0] mt-0.5">Una cuenta de cobro por el total</p>
                  <div className="mt-2">
                    <span className="text-xs bg-white border border-[#e2e6ea] rounded-lg px-2 py-1 text-navy-600 font-medium">Total {cop(cobrosModal.total)}</span>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <Button variant="secondary" onClick={() => setCobrosModal(null)}>Cancelar</Button>
              <Button onClick={confirmarGenerarCobros} disabled={generandoCobros}>
                {generandoCobros ? 'Generando...' : 'Generar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmar eliminar */}
      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Eliminar cotización" size="sm">
        <p className="text-sm text-navy-600 mb-2">¿Seguro que quieres eliminar esta cotización?</p>
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
          ⚠️ Las cuentas de cobro vinculadas a esta cotización también serán eliminadas automáticamente.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancelar</Button>
          <Button variant="danger" disabled={saving} onClick={async () => {
            setSaving(true)
            const cot = cotizaciones.find(c => c.id === confirmId)
            if (cot?.numero) {
              const refStr = `Ref: COT-${String(cot.numero).padStart(3, '0')}`
              await supabase.from('cobros').delete().ilike('notas', `%${refStr}%`)
            }
            await eliminarCotizacion(confirmId)
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
