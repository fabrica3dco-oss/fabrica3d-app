import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, BarChart2, Plus, X, FileEdit, CreditCard, TrendingUp, ClipboardList, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'

const tabs = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  null, // FAB placeholder
  { to: '/cotizaciones', icon: FileText, label: 'Docs' },
  { to: '/finanzas', icon: BarChart2, label: 'Finanzas' },
]

const fabActions = [
  { icon: FileEdit,      label: 'Nueva cotización',       to: '/cotizaciones', state: { _new: true } },
  { icon: CreditCard,    label: 'Nueva cuenta de cobro',  to: '/cobros',       state: { _new: true } },
  { icon: TrendingUp,    label: 'Nuevo lead',             to: '/leads',        state: { _new: true } },
  { icon: ClipboardList, label: 'Nuevo pedido',           to: '/pedidos',      state: { _new: true } },
]

export default function BottomNav() {
  const [fabOpen, setFabOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      {fabOpen && (
        <div className="fixed inset-0 z-30 bg-navy-900/30" onClick={() => setFabOpen(false)} />
      )}

      {fabOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
          {fabActions.map(action => (
            <button
              key={action.label}
              onClick={() => { setFabOpen(false); navigate(action.to, action.state ? { state: action.state } : {}) }}
              className="flex items-center gap-3 bg-white border border-[#e2e6ea] rounded-xl px-4 py-3 shadow-sm text-sm font-medium text-navy-600 hover:bg-[#f8f9fb] transition-colors min-w-[200px]"
            >
              <action.icon size={16} className="text-accent" />
              {action.label}
            </button>
          ))}
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#e2e6ea] flex items-center justify-around px-2 h-16 safe-area-bottom">
        {/* Botón cerrar sesión — esquina derecha oculto hasta long-press */}
        <button
          onClick={() => { if (window.confirm('¿Cerrar sesión?')) supabase.auth.signOut() }}
          className="absolute top-1 right-1 p-1.5 rounded-lg text-[#c8d0da] hover:text-red-400 hover:bg-red-50 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={14} />
        </button>
        {tabs.map((tab, i) => {
          if (!tab) {
            return (
              <button
                key="fab"
                onClick={() => setFabOpen(v => !v)}
                className="relative -top-5 w-14 h-14 rounded-full bg-navy-600 text-white flex items-center justify-center shadow-lg hover:bg-navy-700 transition-colors"
              >
                {fabOpen ? <X size={22} /> : <Plus size={22} />}
              </button>
            )
          }
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-medium transition-colors
                ${isActive ? 'text-navy-600' : 'text-[#8a9ab0]'}`
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  {tab.label}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
