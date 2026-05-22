import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, Download, CheckCircle, AlertCircle, Clock, User, UserPlus, Eye, MessageCircle, Link } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { useCobros } from '../hooks/useCobros'
import { generarPdfCobro } from '../utils/pdfCobro'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const cop = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0)

const ESTADO_COLOR = { pendiente: 'amber', pagado: 'green', vencido: 'red' }
const ESTADO_LABEL = { pendiente: 'Pendiente', pagado: 'Pagado', vencido: 'Vencido' }
const ESTADOS      = ['pendiente', 'pagado', 'vencido']
const METODOS      = [
  { id: 'transferencia', label: 'Transferencia bancaria' },
  { id: 'efectivo',      label: 'Efectivo' },
  { id: 'nequi',         label: 'Nequi' },
  { id: 'daviplata',     label: 'Daviplata' },
  { id: 'otro',          label: 'Otro' },
]

const EMPTY = { cliente_id: '', cliente_nombre: '', concepto: '', monto: '', estado: 'pendiente', fecha_emision: '', fecha_vencimiento: '', metodo_pago: '', notas: '' }

const BASE_URL = window.location.origin

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
        <input value={query} onChange={e => { setQuery(e.target.value); onChange({ id: null, nombre: e.target.value }); setOpen(true) }} onFocus={() => setOpen(true)}
          placeholder="Buscar cliente..." className="w-full pl-8 pr-3 py-2 text-sm border border-[#e2e6ea] rounded-lg bg-white text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e2e6ea] rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
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

// ── Vista previa de cobro ─────────────────────────────────────────────────────
function CobroVista({ cobro }) {
  const ESTADO_STYLE = { pendiente: 'bg-amber-100 text-amber-800', pagado: 'bg-green-100 text-green-800', vencido: 'bg-red-100 text-red-800' }
  return (
    <div className="bg-white font-sans text-navy-600 max-w-2xl mx-auto">
      <div className="bg-[#142236] text-white px-8 py-6 flex items-start justify-between">
        <div>
          <p className="text-xl font-bold">Fabrica<span className="text-blue-400">3D</span></p>
          <p className="text-xs text-[#8aa0b8] mt-0.5">Impresión 3D · Barranquilla, Colombia</p>
          <p className="text-xs text-[#8aa0b8]">fabrica3d.co</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">COBRO #{String(cobro.numero).padStart(4, '0')}</p>
          {cobro.fecha_emision && <p className="text-xs text-[#8aa0b8] mt-1">Emisión: {new Date(cobro.fecha_emision + 'T00:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}</p>}
          {cobro.fecha_vencimiento && <p className="text-xs text-[#8aa0b8]">Vencimiento: {new Date(cobro.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}</p>}
          <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLE[cobro.estado]}`}>{ESTADO_LABEL[cobro.estado]}</span>
        </div>
      </div>
      <div className="px-8 py-6">
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#8a9ab0] uppercase tracking-widest mb-1">Para</p>
          <p className="text-lg font-bold">{cobro.cliente_nombre || 'Cliente'}</p>
        </div>
        <div className="border border-[#e2e6ea] rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#8a9ab0] uppercase tracking-widest mb-1">Concepto</p>
              <p className="text-base font-medium text-navy-600">{cobro.concepto}</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-xs font-semibold text-[#8a9ab0] uppercase tracking-widest mb-1">Monto</p>
              <p className="text-2xl font-bold text-navy-600">{cop(cobro.monto)}</p>
            </div>
          </div>
        </div>
        {cobro.estado === 'pagado' && cobro.metodo_pago && (
          <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-0.5">Método de pago</p>
            <p className="text-sm text-green-800">{METODOS.find(m => m.id === cobro.metodo_pago)?.label || cobro.metodo_pago}</p>
          </div>
        )}
        {cobro.notas && (
          <div className="bg-[#f8f9fb] rounded-lg px-4 py-3 mb-6">
            <p className="text-xs font-semibold text-[#8a9ab0] uppercase tracking-widest mb-1">Notas</p>
            <p className="text-sm text-navy-600 whitespace-pre-line">{cobro.notas}</p>
          </div>
        )}
        <div className="border-t border-[#e2e6ea] pt-4 text-center">
          <p className="text-xs text-[#8a9ab0]">Gracias por confiar en Fabrica3D · fabrica3d.co · Barranquilla, Colombia</p>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Cobros() {
  const { cobros, loading, crearCobro, actualizarCobro, marcarPagado, eliminarCobro } = useCobros()
  const [clientes,     setClientes]    = useState([])
  const [busqueda,     setBusqueda]    = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modal,        setModal]       = useState(null)
  const [confirmId,    setConfirmId]   = useState(null)
  const [previewing,   setPreviewing]  = useState(null)
  const [pagoModal,    setPagoModal]   = useState(null)
  const [metodoPago,   setMetodoPago]  = useState('')
  const [form,         setForm]        = useState(EMPTY)
  const [saving,       setSaving]      = useState(false)

  useEffect(() => {
    supabase.from('clientes').select('id, empresa').order('empresa').then(({ data }) => setClientes(data || []))
  }, [])

  // Marcar vencidos automáticamente en cliente
  const hoy = new Date().toISOString().split('T')[0]
  const cobrosConEstado = cobros.map(c =>
    c.estado === 'pendiente' && c.fecha_vencimiento && c.fecha_vencimiento < hoy
      ? { ...c, estado: 'vencido' }
      : c
  )

  const filtrados = cobrosConEstado.filter(c => {
    const match = c.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
                  c.concepto?.toLowerCase().includes(busqueda.toLowerCase()) ||
                  String(c.numero).includes(busqueda)
    return match && (!filtroEstado || c.estado === filtroEstado)
  })

  const totalPendiente = cobrosConEstado.filter(c => c.estado === 'pendiente' || c.estado === 'vencido').reduce((s, c) => s + Number(c.monto), 0)
  const totalPagadoMes = cobrosConEstado.filter(c => {
    if (c.estado !== 'pagado') return false
    const d = new Date(c.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, c) => s + Number(c.monto), 0)
  const vencidos = cobrosConEstado.filter(c => c.estado === 'vencido').length

  function abrirCrear() { setForm(EMPTY); setModal({ mode: 'crear' }) }
  function abrirEditar(c) {
    setForm({ cliente_id: c.cliente_id || '', cliente_nombre: c.cliente_nombre || '', concepto: c.concepto || '', monto: c.monto || '', estado: c.estado || 'pendiente', fecha_emision: c.fecha_emision || '', fecha_vencimiento: c.fecha_vencimiento || '', metodo_pago: c.metodo_pago || '', notas: c.notas || '' })
    setModal({ mode: 'editar', id: c.id })
  }

  async function guardar() {
    if (!form.concepto.trim() || !form.monto) return
    setSaving(true)
    const datos = { ...form, monto: Number(form.monto), cliente_id: form.cliente_id || null, fecha_emision: form.fecha_emision || null, fecha_vencimiento: form.fecha_vencimiento || null, metodo_pago: form.metodo_pago || null }
    let ok
    if (modal.mode === 'crear') ok = await crearCobro(datos)
    else ok = await actualizarCobro(modal.id, datos)
    setSaving(false)
    if (ok) setModal(null)
  }

  async function confirmarPago() {
    setSaving(true)
    await marcarPagado(pagoModal.id, metodoPago)
    setSaving(false)
    setPagoModal(null)
    setMetodoPago('')
  }

  function copiarLink(c) {
    navigator.clipboard.writeText(`${BASE_URL}/cobro/${c.id}`)
    toast.success('Link copiado al portapapeles')
  }
  function compartirWhatsApp(c) {
    const msg = encodeURIComponent(`Hola, te comparto el cobro #${String(c.numero).padStart(4,'0')} de Fabrica3D:\n${BASE_URL}/cobro/${c.id}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Cobros</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">{loading ? '...' : `${cobros.length} cobros`}</p>
        </div>
        <Button onClick={abrirCrear}><Plus size={16} /> Nuevo cobro</Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
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
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9ab0]" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por cliente o concepto..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#e2e6ea] rounded-lg bg-white text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent">
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="p-4 flex flex-col gap-2">{Array(4).fill(0).map((_, i) => <div key={i} className="animate-pulse bg-[#e2e6ea] rounded h-12 w-full" />)}</div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center gap-3">
            <span className="text-5xl">💳</span>
            <p className="text-sm font-medium text-navy-600">{busqueda || filtroEstado ? 'Sin resultados' : 'Sin cobros aún'}</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Concepto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Monto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">Vencimiento</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f5]">
                  {filtrados.map(c => (
                    <tr key={c.id} className="hover:bg-[#f8f9fb] transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-navy-600">#{String(c.numero).padStart(4,'0')}</td>
                      <td className="px-4 py-3 font-medium text-navy-600">{c.cliente_nombre || '—'}</td>
                      <td className="px-4 py-3 text-[#8a9ab0] max-w-[200px] truncate">{c.concepto}</td>
                      <td className="px-4 py-3 font-semibold text-navy-600">{cop(c.monto)}</td>
                      <td className="px-4 py-3"><Badge variant={ESTADO_COLOR[c.estado]}>{ESTADO_LABEL[c.estado]}</Badge></td>
                      <td className="px-4 py-3 text-xs text-[#8a9ab0]">
                        {c.fecha_vencimiento ? new Date(c.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {c.estado !== 'pagado' && (
                            <button onClick={() => { setPagoModal(c); setMetodoPago('') }} title="Marcar como pagado"
                              className="p-1.5 rounded-lg hover:bg-green-50 text-[#8a9ab0] hover:text-green-600 transition-colors">
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button onClick={() => setPreviewing(c)} title="Vista previa" className="p-1.5 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600 transition-colors"><Eye size={14} /></button>
                          <button onClick={() => compartirWhatsApp(c)} title="WhatsApp" className="p-1.5 rounded-lg hover:bg-green-50 text-[#8a9ab0] hover:text-green-600 transition-colors"><MessageCircle size={14} /></button>
                          <button onClick={() => generarPdfCobro(c)} title="PDF" className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8a9ab0] hover:text-accent transition-colors"><Download size={14} /></button>
                          <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600 transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => setConfirmId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-[#f0f2f5]">
              {filtrados.map(c => (
                <div key={c.id} className="p-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-semibold text-[#8a9ab0]">#{String(c.numero).padStart(4,'0')}</span>
                      <Badge variant={ESTADO_COLOR[c.estado]}>{ESTADO_LABEL[c.estado]}</Badge>
                    </div>
                    <p className="font-medium text-navy-600 truncate">{c.cliente_nombre || '—'}</p>
                    <p className="text-xs text-[#8a9ab0] truncate">{c.concepto}</p>
                    <p className="text-sm font-semibold text-navy-600 mt-0.5">{cop(c.monto)}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {c.estado !== 'pagado' && <button onClick={() => { setPagoModal(c); setMetodoPago('') }} className="p-1.5 rounded-lg hover:bg-green-50 text-[#8a9ab0] hover:text-green-600"><CheckCircle size={14} /></button>}
                    <button onClick={() => setPreviewing(c)} className="p-1.5 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600"><Eye size={14} /></button>
                    <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600"><Pencil size={14} /></button>
                    <button onClick={() => setConfirmId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Modal crear/editar */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'crear' ? 'Nuevo cobro' : 'Editar cobro'}>
        <div className="flex flex-col gap-4">
          <ClienteAutocomplete clientes={clientes} value={form.cliente_nombre} clienteId={form.cliente_id}
            onChange={({ id, nombre }) => setForm(f => ({ ...f, cliente_id: id || '', cliente_nombre: nombre }))} />
          <Input label="Concepto *" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} placeholder="Ej: Impresión 3D pieza dental × 3" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto (COP) *" type="number" min="0" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0" />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Estado</label>
              <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent">
                {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha de emisión" type="date" value={form.fecha_emision} onChange={e => setForm(f => ({ ...f, fecha_emision: e.target.value }))} />
            <Input label="Fecha de vencimiento" type="date" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
          </div>
          {form.estado === 'pagado' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Método de pago</label>
              <select value={form.metodo_pago} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="">— Selecciona —</option>
                {METODOS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-600">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Información adicional..."
              rows={2} className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.concepto.trim() || !form.monto || saving}>
              {saving ? 'Guardando...' : modal?.mode === 'crear' ? 'Crear cobro' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal marcar pagado */}
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

      {/* Vista previa */}
      <Modal open={!!previewing} onClose={() => setPreviewing(null)} title={`Vista previa — Cobro #${String(previewing?.numero || 0).padStart(4,'0')}`} size="lg">
        {previewing && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <button onClick={() => copiarLink(previewing)} className="flex items-center gap-2 border border-[#e2e6ea] rounded-lg px-3 py-1.5 text-sm text-navy-600 hover:bg-[#f8f9fb]"><Link size={13} /> Copiar link</button>
              <button onClick={() => compartirWhatsApp(previewing)} className="flex items-center gap-2 border border-green-200 rounded-lg px-3 py-1.5 text-sm text-green-700 hover:bg-green-50"><MessageCircle size={13} /> Enviar por WhatsApp</button>
              <button onClick={() => generarPdfCobro(previewing)} className="flex items-center gap-2 border border-blue-200 rounded-lg px-3 py-1.5 text-sm text-accent hover:bg-blue-50"><Download size={13} /> Descargar PDF</button>
            </div>
            <div className="border border-[#e2e6ea] rounded-xl overflow-hidden"><CobroVista cobro={previewing} /></div>
          </div>
        )}
      </Modal>

      {/* Confirmar eliminar */}
      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Eliminar cobro" size="sm">
        <p className="text-sm text-navy-600 mb-5">¿Seguro que quieres eliminar este cobro?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={async () => { setSaving(true); await eliminarCobro(confirmId); setSaving(false); setConfirmId(null) }} disabled={saving}>
            {saving ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
