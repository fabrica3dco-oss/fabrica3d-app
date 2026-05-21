import { useState } from 'react'
import { Users, Plus, Search, Pencil, Trash2, Phone, Mail } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { useClientes } from '../hooks/useClientes'

const ESTADO_OPTS = ['activo', 'inactivo', 'prospecto']
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

export default function Clientes() {
  const { clientes, loading, crearCliente, actualizarCliente, eliminarCliente } = useClientes()
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const filtrados = clientes.filter(c =>
    c.empresa?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.contacto?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.sector?.toLowerCase().includes(busqueda.toLowerCase())
  )

  function abrirCrear() {
    setForm(EMPTY)
    setModal({ mode: 'crear' })
  }

  function abrirEditar(c) {
    setForm({
      empresa: c.empresa || '',
      contacto: c.contacto || '',
      cargo: c.cargo || '',
      whatsapp: c.whatsapp || '',
      email: c.email || '',
      sector: c.sector || '',
      estado: c.estado || 'activo',
      notas: c.notas || '',
    })
    setModal({ mode: 'editar', id: c.id })
  }

  async function guardar() {
    if (!form.empresa.trim()) return
    setSaving(true)
    let ok
    if (modal.mode === 'crear') ok = await crearCliente(form)
    else ok = await actualizarCliente(modal.id, form)
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
          <p className="text-sm text-[#8a9ab0] mt-0.5">
            {loading ? '...' : `${clientes.length} registrados`}
          </p>
        </div>
        <Button onClick={abrirCrear}><Plus size={16} /> Nuevo cliente</Button>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9ab0]" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por empresa, contacto, email o sector..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-[#e2e6ea] rounded-lg bg-white text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="p-4"><Skeleton /></div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center gap-3">
            <Users size={40} className="text-[#e2e6ea]" />
            <p className="text-sm font-medium text-navy-600">
              {busqueda ? 'Sin resultados' : 'Sin clientes aún'}
            </p>
            <p className="text-xs text-[#8a9ab0]">
              {busqueda ? 'Intenta con otro término.' : 'Agrega tu primer cliente.'}
            </p>
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
                    <tr key={c.id} className="hover:bg-[#f8f9fb] transition-colors">
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
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
                <div key={c.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-navy-600 truncate">{c.empresa}</p>
                    {c.contacto && <p className="text-xs text-navy-600 truncate mt-0.5">{c.contacto}</p>}
                    {c.email && <p className="text-xs text-[#8a9ab0] truncate">{c.email}</p>}
                    {c.whatsapp && <p className="text-xs text-[#8a9ab0]">{c.whatsapp}</p>}
                    <div className="mt-1.5">
                      <Badge variant={ESTADO_BADGE[c.estado] || 'gray'}>{c.estado || 'activo'}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
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

      {/* Modal crear/editar */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'crear' ? 'Nuevo cliente' : 'Editar cliente'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Empresa *"
            value={form.empresa}
            onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}
            placeholder="Nombre de la empresa o persona"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contacto"
              value={form.contacto}
              onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))}
              placeholder="Nombre del contacto"
            />
            <Input
              label="Cargo"
              value={form.cargo}
              onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
              placeholder="Gerente, Compras..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
            />
            <Input
              label="WhatsApp"
              value={form.whatsapp}
              onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
              placeholder="+57 300 000 0000"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sector"
              value={form.sector}
              onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
              placeholder="Construcción, Salud..."
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Estado</label>
              <select
                value={form.estado}
                onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {ESTADO_OPTS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-600">Notas</label>
            <textarea
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones adicionales..."
              rows={3}
              className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.empresa.trim() || saving}>
              {saving ? 'Guardando...' : modal?.mode === 'crear' ? 'Crear cliente' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmar eliminar */}
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
