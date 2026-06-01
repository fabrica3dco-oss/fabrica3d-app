import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-navy-900/40" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-white sm:rounded-xl shadow-lg animate-fade-in flex flex-col max-h-[92vh] rounded-t-2xl`}>
        {/* Header fijo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e6ea] shrink-0">
          <h3 className="text-base font-semibold text-navy-600 pr-4">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f8f9fb] text-[#8a9ab0] hover:text-navy-600 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        {/* Contenido con scroll */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
