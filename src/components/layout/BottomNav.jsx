import { useState, useCallback, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, TrendingUp, Package,
  FileText, CreditCard, Archive, BarChart2,
  ClipboardList, Calculator,
  Plus, X, FileEdit, TrendingUp as LeadIcon,
  Menu, LogOut, AlertTriangle
} from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'

function useStockBajoCount() {
  const [count, setCount] = useState(0)
  const fetch = useCallback(() => {
    supabase.from('inventario').select('id, stock_actual, stock_minimo')
      .then(({ data }) => {
        setCount((data || []).filter(i => Number(i.stock_actual) <= Number(i.stock_minimo)).length)
      })
  }, [])
  useEffect(() => { fetch() }, [fetch])
  useRealtimeRefresh('inventario', fetch)
  return count
}

const navGroups = [
  {
    label: 'Operaciones',
    items: [
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/clientes',   icon: Users,           label: 'Clientes' },
      { to: '/leads',      icon: TrendingUp,      label: 'Leads' },
      { to: '/produccion', icon: Package,         label: 'Producción' },
      { to: '/pedidos',    icon: ClipboardList,   label: 'Pedidos' },
    ],
  },
  {
    label: 'Documentos',
    items: [
      { to: '/cotizaciones', icon: FileText,   label: 'Cotizaciones' },
      { to: '/cobros',       icon: CreditCard, label: 'Cuentas de cobro' },
    ],
  },
  {
    label: 'Negocio',
    items: [
      { to: '/inventario',  icon: Archive,    label: 'Materiales', badge: 'stock' },
      { to: '/finanzas',    icon: BarChart2,  label: 'Finanzas' },
      { to: '/calculadora', icon: Calculator, label: 'Calculadora' },
    ],
  },
]

const fabActions = [
  { icon: FileEdit,    label: 'Nueva cotización',      to: '/cotizaciones', state: { _new: true } },
  { icon: CreditCard,  label: 'Nueva cuenta de cobro', to: '/cobros',       state: { _new: true } },
  { icon: LeadIcon,    label: 'Nuevo lead',            to: '/leads',        state: { _new: true } },
  { icon: ClipboardList, label: 'Nuevo pedido',        to: '/pedidos',      state: { _new: true } },
]

export default function BottomNav() {
  const [fabOpen,  setFabOpen]  = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate   = useNavigate()
  const stockBajo  = useStockBajoCount()

  // Cierra menú al navegar
  function goTo(to, state) {
    setMenuOpen(false)
    setFabOpen(false)
    navigate(to, state ? { state } : {})
  }

  return (
    <>
      {/* ── Overlay FAB ─────────────────────────────────────── */}
      {fabOpen && (
        <div className="fixed inset-0 z-30 bg-navy-900/30" onClick={() => setFabOpen(false)} />
      )}
      {fabOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
          {fabActions.map(action => (
            <button
              key={action.label}
              onClick={() => goTo(action.to, action.state)}
              className="flex items-center gap-3 bg-white border border-[#e2e6ea] rounded-xl px-4 py-3 shadow-sm text-sm font-medium text-navy-600 hover:bg-[#f8f9fb] transition-colors min-w-[220px]"
            >
              <action.icon size={16} className="text-accent" />
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Drawer menú completo ─────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />

          {/* Panel */}
          <div className="relative ml-auto w-72 h-full bg-[#0d1b2a] flex flex-col overflow-y-auto shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
              <span className="text-white font-bold text-base">Menú</span>
              <button onClick={() => setMenuOpen(false)} className="text-white/50 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            {/* Nav groups */}
            <div className="flex-1 px-3 py-4 flex flex-col gap-5">
              {navGroups.map(group => (
                <div key={group.label}>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                          ${isActive
                            ? 'bg-white/10 text-white'
                            : 'text-white/60 hover:text-white hover:bg-white/5'}`
                        }
                      >
                        <item.icon size={18} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge === 'stock' && stockBajo > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {stockBajo}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer cerrar sesión */}
            <div className="px-3 py-4 border-t border-white/10">
              <button
                onClick={() => { if (window.confirm('¿Cerrar sesión?')) supabase.auth.signOut() }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra inferior ──────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#e2e6ea] flex items-center justify-around px-2 h-16">

        {/* Dashboard */}
        <NavLink to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-medium transition-colors
            ${isActive ? 'text-navy-600' : 'text-[#8a9ab0]'}`
          }
        >
          {({ isActive }) => (<><LayoutDashboard size={20} strokeWidth={isActive ? 2.5 : 1.5} />Inicio</>)}
        </NavLink>

        {/* Clientes */}
        <NavLink to="/clientes"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-medium transition-colors
            ${isActive ? 'text-navy-600' : 'text-[#8a9ab0]'}`
          }
        >
          {({ isActive }) => (<><Users size={20} strokeWidth={isActive ? 2.5 : 1.5} />Clientes</>)}
        </NavLink>

        {/* FAB central */}
        <button
          onClick={() => { setMenuOpen(false); setFabOpen(v => !v) }}
          className="relative -top-5 w-14 h-14 rounded-full bg-navy-600 text-white flex items-center justify-center shadow-lg hover:bg-navy-700 transition-colors"
        >
          {fabOpen ? <X size={22} /> : <Plus size={22} />}
        </button>

        {/* Cotizaciones */}
        <NavLink to="/cotizaciones"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-medium transition-colors
            ${isActive ? 'text-navy-600' : 'text-[#8a9ab0]'}`
          }
        >
          {({ isActive }) => (<><FileText size={20} strokeWidth={isActive ? 2.5 : 1.5} />Docs</>)}
        </NavLink>

        {/* Menú completo */}
        <button
          onClick={() => { setFabOpen(false); setMenuOpen(v => !v) }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-medium transition-colors relative
            ${menuOpen ? 'text-navy-600' : 'text-[#8a9ab0]'}`}
        >
          <div className="relative">
            <Menu size={20} strokeWidth={menuOpen ? 2.5 : 1.5} />
            {stockBajo > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
          Más
        </button>
      </nav>
    </>
  )
}
