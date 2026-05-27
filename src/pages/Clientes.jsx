import { useState, useEffect } from 'react'
import { Users, Plus, Search, Pencil, Trash2, Phone, Mail, TrendingUp, DollarSign, FileText, X, Loader2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { useClientes } from '../hooks/useClientes'
import { supabase } from '../services/supabase'

const cop = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0)
const fmtFecha = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const ESTADO_OPTS  = ['activo', 'inactivo', 'prospecto']
const ESTADO_BADGE = { activo: 'green', inactivo: 'gray', prospecto: 'blue' }
const EMPTY = { empresa: '', contacto: '', cargo: '', whatsapp: '', email: '', sector: '', estado: 'activo', notas: '' }

function Skeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="animate-pulse bg-[#e2e6ea] rounded h-12 w-full" />
      ))}
    </div>
  )
}

// ── Modal historial de cliente ────────────────────────────────────────────────
function HistorialModal({ cliente, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistorial() {
      const nombre = cliente.empresa
      const [cotRes, cobRes] = await Promise.all([
        supabase.from('cotizaciones').select('numero, total, estado, fecha_emision').ilike('cliente_nombre', nombre).order('numero', { ascending: false }),
        supabase.from('cobros').select('numero, monto, estado, concepto, fecha_emision').ilike('cliente_nombre', nombre).order('numero', { ascending: false }),
      ])
      const cots  = cotRes.data || []
      const cobros = cobRes.data || []
      const totalComprado = cobros.filter(c => c.estado === 'pagado').reduce((s, c) => s + Number(c.monto), 0)
      const pagados       = cobros.filter(c => c.estado === 'pagado').length
      const pendientes    = cobros.filter(c => c.estado === 'pendiente').length
      const convRate = cots.length > 0
        ? Math.round((cots.filter(c => c.estado === 'aprobada').length / cots.length) * 100)
        : null
      setData({ cots, cobros, totalComprado, pagados, pendientes, convRate })
      setLoading(false)
    }
    fetchHistorial()
  }, [cliente.empresa])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e2e6ea]">
          <div>
            <h2 className="font-semibold text-navy-600">{cliente.empresa}</h2>
            {cliente.contacto && <p className="text-xs text-[#8a9ab0]">{cliente.contacto}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f8f9fb]"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-[#8a9ab0] text-sm">
            <Loader2 size={16} className="animate-spin" /> Cargando historial...
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-5">
            {/* Métricas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-xs text-green-600 font-medium flex items-center gap-1 mb-0.5">
                  <DollarSign size={11} /> Total comprado
                </p>
                <p className="text-lg font-bold text-green-700">{cop(data.totalComprado)}</p>
                <p className="text-xs text-green-600">{data.pagados} cobro{data.pagados !== 1 ? 's' : ''} pagado{data.pagados !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-600 font-medium flex items-center gap-1 mb-0.5">
                  <TrendingUp size={11} /> Conversión
                </p>
                <p className="text-lg font-bold text-blue-700">{data.convRate !== null ? `${data.convRate}%` : '—'}</p>
                <p className="text-xs text-blue-600">{data.cots.length} cotización{data.cots.length !== 1 ? 'es' : ''}</p>
              </div>
              {data.pendientes > 0 && (
                <div className="col-span-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs text-amber-700 font-medium">
                    {data.pendientes} cobro{data.pendientes !== 1 ? 's' : ''} pendiente{data.pendientes !== 1 ? 's' : ''} de pago
                  </p>
                  <p className="text-lg font-bold text-amber-800">
                    {cop(data.cobros.filter(c => c.estado === 'pendiente').reduce((s, c) => s + Number(c.monto), 0))}
                  </p>
                </div>
              )}
            </div>

            {/* Cotizaciones */}
            {data.cots.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0] mb-2 flex items-center gap-1.5">
                  <FileText size={11} /> Cotizaciones ({data.cots.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {data.cots.slice(0, 6).map(c => (
                    <div key={c.id || c.numero} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#f8f9fb] transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#8a9ab0]">COT-{String(c.numero).padStart(3, '0')}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          c.estado === 'aprobada' ? 'bg-green-100 text-green-700'
                          : c.estado === 'rechazada' ? 'bg-red-100 text-red-700'
                          : c.estado === 'enviada' ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{c.estado}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#8a9ab0]">{fmtFecha(c.fecha_emision)}</span>
                        <span className="text-sm font-semibold text-navy-600">{cop(c.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cobros */}
            {data.cobros.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a9ab0] mb-2 flex items-center gap-1.5">
                  <DollarSign size={11} /> Cobros ({data.cobros.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {data.cobros.slice(0, 8).map(c => (
                    <div key={c.id || c.numero} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#f8f9fb] transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#8a9ab0]">COB-{String(c.numero).padStart(3, '0')}</span>
                        {c.concepto && <span className="text-[10px] text-[#8a9ab0]">{c.concepto}</span>}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          c.estado === 'pagado' ? 'bg-green-100 text-green-700'
                          : c.estado === 'vencido' ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                        }`}>{c.estado}</span>
                      </div>
                      <span className="text-sm font-semibold text-navy-600">{cop(c.monto)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.cots.length === 0 && data.cobros.length === 0 && (
              <p className="text-sm text-center text-[#8a9ab0] py-4">Sin transacciones registradas para este cliente.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Clientes() {
  const { clientes, loading, crearCliente, actualizarCliente, eliminarCliente } = useClientes()
  const [busqueda,    setBusqueda]    = useState('')
  const [modal,       setModal]       = useState(null)
  const [confirmId,   setConfirmId]   = useState(null)
  const [historial,   setHistorial]   = useState(null)   // cliente cuyo historial está abierto
  const [form,        setForm]        = useState(EMPTY)
  const [saving,      setSaving]      = useState(false)

  const filtrados = clientes.filter(c =>
    c.empresa?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.contacto?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.sector?.toLowerCase().includes(busqueda.toLowerCase())
  )

  function abrirCrear() { setForm(EMPTY); setModal({ mode: 'crear' }) }

  function abrirEditar(c) {
    setForm({
      empresa: c.empresa || '', contacto: c.contacto || '', cargo: c.cargo || '',
      whatsapp: c.whatsapp || '', email: c.email || '', sector: c.sector || '',
      estado: c.estado || 'activo', notas: c.notas || '',
    })
    setModal({ mode: 'editar', id: c.id })
  }

  async function guardar() {
    if (!form.empresa.trim()) return
    setSaving(true)
    const ok = modal.mode === 'crear' ? await crearCliente(form) : await actualizarCliente(modal.id, form)
    setSaving(false)
    if (ok) setModal(null)
  }

  async function confirmarEliminar() {
    if (!confirmId) return
    setSaving(true)
    await eliminarCliente(confirmId)
    setSaving(false)
    setConfirmId(null)
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Clientes</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">{loading ? '...' : `${clientes.length} registrados`}</p>
        </div>
        <Button onClick={abrirCrear}><Plus size={16} /> Nuevo cliente</Button>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9ab0]" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por empresa, contacto, email o sector..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-[#e2e6ea] rounded-lg bg-white text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="p-4"><Skeleton /></div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center gap-3">
            <Users size={40} className="text-[#e2e6ea]" />
            <p className="text-sm font-medium text-navy-600">{busqueda ? 'Sin resultados' : 'Sin clientes aún'}</p>
            <p className="text-xs text-[#8a9ab0]">{busqueda ? 'Intenta con otro término.' : 'Agrega tu primer cliente.'}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e6ea] bg-[#f8f9fb]">
                    <th className="text-left px-4 py-3 font-semibold text-[#8a9ab0] text-xs uppercase tracking-wide">Empresa</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#8a9ab0] text-xs uppercase tracking-wide">Contacto</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#8a9ab0] text-xs uppercase tracking-wide">Sector</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#8a9ab0] text-xs uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f5]">
                  {filtrados.map(c => (
                    <tr key={c.id} className="hover:bg-[#f8f9fb] transition-colors cursor-pointer"
                      onClick={() => setHistorial(c)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-navy-600">{c.empresa}</p>
                        {c.cargo && <p className="text-xs text-[#8a9ab0]">{c.cargo}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          {c.contacto && <span className="text-navy-600">{c.contacto}</span>}
                          {c.email && <span className="flex items-center gap-1.5 text-[#8a9ab0]"><Mail size={12} />{c.email}</span>}
                          {c.whatsapp && <span className="flex items-center gap-1.5 text-[#8a9ab0]"><Phone size={12} />{c.whatsapp}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#8a9ab0]">{c.sector || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ESTADO_BADGE[c.estado] || 'gray'}>{c.estado || 'activo'}</Badge>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setHistorial(c)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-[#8a9ab0] hover:text-accent transition-colors"
                            title="Ver historial">
                            <TrendingUp size={14} />
                          </button>
                          <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setConfirmId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[#f0f2f5]">
              {filtrados.map(c => (
                <div key={c.id} className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-[#f8f9fb]"
                  onClick={() => setHistorial(c)}>
                  <div className="min-w-0">
                    <p className="font-medium text-navy-600 truncate">{c.empresa}</p>
                    {c.contacto && <p className="text-xs text-navy-600 truncate mt-0.5">{c.contacto}</p>}
                    {c.email && <p className="text-xs text-[#8a9ab0] truncate">{c.email}</p>}
                    {c.whatsapp && <p className="text-xs text-[#8a9ab0]">{c.whatsapp}</p>}
                    <div className="mt-1.5">
                      <Badge variant={ESTADO_BADGE[c.estado] || 'gray'}>{c.estado || 'activo'}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#8a9ab0] hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Historial de cliente */}
      {historial && <HistorialModal cliente={historial} onClose={() => setHistorial(null)} />}

      {/* Modal crear/editar */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'crear' ? 'Nuevo cliente' : 'Editar cliente'}>
        <div className="flex flex-col gap-4">
          <Input label="Empresa *" value={form.empresa}
            onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} placeholder="Nombre de la empresa o persona" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contacto" value={form.contacto}
              onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} placeholder="Nombre del contacto" />
            <Input label="Cargo" value={form.cargo}
              onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Gerente, Compras..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
            <Input label="WhatsApp" value={form.whatsapp}
              onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+57 300 000 0000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Sector" value={form.sector}
              onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} placeholder="Construcción, Salud..." />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Estado</label>
              <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent">
                {ESTADO_OPTS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-600">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              rows={3} placeholder="Observaciones adicionales..."
              className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.empresa.trim() || saving}>
              {saving ? 'Guardando...' : modal?.mode === 'crear' ? 'Crear cliente' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmar eliminar */}
      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Eliminar cliente" size="sm">
        <p className="text-sm text-navy-600 mb-5">¿Seguro que quieres eliminar este cliente? Esta acción no se puede deshacer.</p>
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
