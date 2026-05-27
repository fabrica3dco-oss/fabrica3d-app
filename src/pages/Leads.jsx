import { useState } from 'react'
import { Plus, Phone, Mail, DollarSign, Pencil, Trash2, GripVertical } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { useLeads } from '../hooks/useLeads'

const ETAPAS = [
  { id: 'prospecto',      label: 'Prospecto',          color: 'blue',  bg: 'bg-blue-500' },
  { id: 'contactado',     label: 'Contactado',         color: 'amber', bg: 'bg-amber-500' },
  { id: 'cotizando',      label: 'Cotización enviada', color: 'gray',  bg: 'bg-purple-500' },
  { id: 'cerrado_ganado', label: 'Ganado',             color: 'green', bg: 'bg-green-500' },
  { id: 'cerrado_perdido',label: 'Perdido',            color: 'red',   bg: 'bg-red-400' },
]

const FUENTES = [
  { id: 'instagram',  label: 'Instagram' },
  { id: 'whatsapp',   label: 'WhatsApp' },
  { id: 'linkedin',   label: 'LinkedIn' },
  { id: 'email_frio', label: 'Email frío' },
  { id: 'referido',   label: 'Referido' },
  { id: 'otro',       label: 'Otro' },
]

const EMPTY = { empresa: '', contacto: '', cargo: '', whatsapp: '', email: '', valor_estimado: '', fuente: '', etapa: 'prospecto', notas: '' }

const cop = (v) => v ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v) : null

export default function Leads() {
  const { leads, loading, crearLead, actualizarLead, moverEtapa, eliminarLead } = useLeads()
  const [modal, setModal]       = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [overCol, setOverCol]   = useState(null)

  const porEtapa = (etapaId) => leads.filter(l => (l.etapa || 'prospecto') === etapaId)

  const totalValor = leads
    .filter(l => l.etapa !== 'cerrado_perdido')
    .reduce((s, l) => s + Number(l.valor_estimado || 0), 0)

  function abrirCrear(etapaId = 'prospecto') {
    setForm({ ...EMPTY, etapa: etapaId })
    setModal({ mode: 'crear' })
  }

  function abrirEditar(lead) {
    setForm({
      empresa:        lead.empresa || '',
      contacto:       lead.contacto || '',
      cargo:          lead.cargo || '',
      whatsapp:       lead.whatsapp || '',
      email:          lead.email || '',
      valor_estimado: lead.valor_estimado || '',
      fuente:         lead.fuente || '',
      etapa:          lead.etapa || 'prospecto',
      notas:          lead.notas || '',
    })
    setModal({ mode: 'editar', id: lead.id })
  }

  async function guardar() {
    if (!form.empresa.trim()) return
    setSaving(true)
    const datos = { ...form, valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null }
    let ok
    if (modal.mode === 'crear') ok = await crearLead(datos)
    else ok = await actualizarLead(modal.id, datos)
    setSaving(false)
    if (ok) setModal(null)
  }

  async function confirmarEliminar() {
    setSaving(true)
    await eliminarLead(confirmId)
    setSaving(false)
    setConfirmId(null)
  }

  // Drag & drop handlers
  function onDragStart(e, leadId) {
    setDraggingId(leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e, etapaId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverCol(etapaId)
  }

  function onDrop(e, etapaId) {
    e.preventDefault()
    if (draggingId) moverEtapa(draggingId, etapaId)
    setDraggingId(null)
    setOverCol(null)
  }

  function onDragEnd() {
    setDraggingId(null)
    setOverCol(null)
  }

  return (
    <div className="p-4 lg:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Embudo de ventas</h1>
          <p className="text-sm text-[#8a9ab0] mt-0.5">
            {leads.filter(l => l.etapa !== 'cerrado_perdido' && l.etapa !== 'cerrado_ganado').length} oportunidades activas
            {totalValor > 0 && <span className="ml-2 text-navy-600 font-medium">· {cop(totalValor)}</span>}
          </p>
        </div>
        <Button onClick={() => abrirCrear()}><Plus size={16} /> Nuevo lead</Button>
      </div>

      {/* Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1 items-start">
        {ETAPAS.map(etapa => {
          const items = porEtapa(etapa.id)
          const isOver = overCol === etapa.id
          return (
            <div
              key={etapa.id}
              className={`flex flex-col shrink-0 w-64 lg:w-72 rounded-xl transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-accent' : 'bg-[#f8f9fb]'}`}
              onDragOver={e => onDragOver(e, etapa.id)}
              onDrop={e => onDrop(e, etapa.id)}
              onDragLeave={() => setOverCol(null)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${etapa.bg}`} />
                  <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">{etapa.label}</span>
                  <Badge variant={etapa.color}>{items.length}</Badge>
                </div>
                <button
                  onClick={() => abrirCrear(etapa.id)}
                  className="p-1 rounded-lg hover:bg-[#e2e6ea] text-[#8a9ab0] hover:text-navy-600 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 px-2 pb-3 min-h-[80px]">
                {loading ? (
                  <div className="animate-pulse bg-[#e2e6ea] rounded-lg h-20 w-full" />
                ) : items.length === 0 ? (
                  <p className="text-xs text-[#8a9ab0] text-center py-4">
                    {isOver ? 'Suelta aquí' : 'Sin leads'}
                  </p>
                ) : (
                  items.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={e => onDragStart(e, lead.id)}
                      onDragEnd={onDragEnd}
                      className={`bg-white border border-[#e2e6ea] rounded-lg p-3 cursor-grab active:cursor-grabbing select-none transition-all ${draggingId === lead.id ? 'opacity-40 scale-95' : 'hover:shadow-sm hover:border-navy-200'}`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-sm font-semibold text-navy-600 leading-tight">{lead.empresa}</p>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => abrirEditar(lead)}
                            className="p-1 rounded hover:bg-[#f0f2f5] text-[#8a9ab0] hover:text-navy-600 transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => setConfirmId(lead.id)}
                            className="p-1 rounded hover:bg-red-50 text-[#8a9ab0] hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {lead.contacto && (
                        <p className="text-xs text-[#8a9ab0] mb-1.5">{lead.contacto}</p>
                      )}

                      <div className="flex flex-col gap-0.5">
                        {lead.whatsapp && (
                          <span className="flex items-center gap-1.5 text-xs text-[#8a9ab0]">
                            <Phone size={10} />{lead.whatsapp}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1.5 text-xs text-[#8a9ab0]">
                            <Mail size={10} />{lead.email}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f0f2f5]">
                        {lead.valor_estimado ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                            <DollarSign size={10} />{cop(lead.valor_estimado)}
                          </span>
                        ) : <span />}
                        {lead.fuente && (
                          <Badge variant="gray" className="text-[10px]">{FUENTES.find(f => f.id === lead.fuente)?.label ?? lead.fuente}</Badge>
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
        title={modal?.mode === 'crear' ? 'Nuevo lead' : 'Editar lead'}
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
              label="WhatsApp"
              value={form.whatsapp}
              onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
              placeholder="+57 300 000 0000"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <Input
            label="Valor estimado (COP)"
            type="number"
            value={form.valor_estimado}
            onChange={e => setForm(f => ({ ...f, valor_estimado: e.target.value }))}
            placeholder="500000"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Etapa</label>
              <select
                value={form.etapa}
                onChange={e => setForm(f => ({ ...f, etapa: e.target.value }))}
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-navy-600">Fuente</label>
              <select
                value={form.fuente}
                onChange={e => setForm(f => ({ ...f, fuente: e.target.value }))}
                className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">— Selecciona —</option>
                {FUENTES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-600">Notas</label>
            <textarea
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Detalles del pedido, tamaño de pieza, material..."
              rows={3}
              className="border border-[#e2e6ea] rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.empresa.trim() || saving}>
              {saving ? 'Guardando...' : modal?.mode === 'crear' ? 'Crear lead' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmar eliminar */}
      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Eliminar lead" size="sm">
        <p className="text-sm text-navy-600 mb-5">¿Seguro que quieres eliminar este lead? Esta acción no se puede deshacer.</p>
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
