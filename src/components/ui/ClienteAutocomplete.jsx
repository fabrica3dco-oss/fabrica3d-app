import { useState, useEffect, useRef } from 'react'
import { Search, User, UserPlus } from 'lucide-react'

/**
 * Input con autocompletado de clientes.
 *
 * Props:
 *  - clientes   : array [{ id, empresa }]  — lista de clientes existentes
 *  - value      : string                   — nombre actual (controlled)
 *  - clienteId  : string | null            — id del cliente seleccionado
 *  - onChange   : ({ id, nombre }) => void — llamado al seleccionar o escribir
 *  - label      : string                   — etiqueta del campo (default "Cliente")
 *  - placeholder: string                   — placeholder del input
 *  - className  : string                   — clase extra para el contenedor
 *  - inputClass : string                   — clase extra para el <input>
 */
export default function ClienteAutocomplete({
  clientes = [],
  value,
  clienteId,
  onChange,
  label = 'Cliente',
  placeholder = 'Buscar o escribir cliente...',
  className = '',
  inputClass = '',
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState(value || '')
  const ref = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const filtrados = query.trim()
    ? clientes.filter(c => c.empresa.toLowerCase().includes(query.toLowerCase()))
    : clientes.slice(0, 8)

  const hayExacto = clientes.some(c => c.empresa.toLowerCase() === query.trim().toLowerCase())

  return (
    <div ref={ref} className={`relative flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs font-semibold text-[#8a9ab0] uppercase tracking-wide">{label}</label>}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9ab0] pointer-events-none" />
        <input
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            onChange({ id: null, nombre: e.target.value })
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-8 pr-3 py-2.5 text-sm border border-[#e2e6ea] rounded-xl bg-white text-navy-600 placeholder:text-[#c0cad6] focus:outline-none focus:ring-2 focus:ring-navy-600/20 ${inputClass}`}
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e2e6ea] rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
          {filtrados.length === 0 && !query.trim() && (
            <p className="text-xs text-[#8a9ab0] px-3 py-2.5">Sin clientes guardados aún</p>
          )}
          {filtrados.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => {
                onChange({ id: c.id, nombre: c.empresa })
                setQuery(c.empresa)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f8f9fb] flex items-center gap-2
                ${clienteId === c.id ? 'bg-blue-50 text-accent font-medium' : 'text-navy-600'}`}>
              <User size={12} className="text-[#8a9ab0] shrink-0" />
              {c.empresa}
            </button>
          ))}
          {query.trim() && !hayExacto && (
            <button
              type="button"
              onMouseDown={() => {
                onChange({ id: null, nombre: query.trim() })
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-accent hover:bg-blue-50 flex items-center gap-2 border-t border-[#f0f2f5]">
              <UserPlus size={12} className="shrink-0" />
              Usar "<span className="font-medium">{query.trim()}</span>"
            </button>
          )}
        </div>
      )}
    </div>
  )
}
