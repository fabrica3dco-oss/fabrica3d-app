import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, TrendingUp, Package,
  FileText, CreditCard, Archive, BarChart2,
  Mail, Share2, UsersRound, ClipboardList
} from 'lucide-react'

const groups = [
  {
    label: 'Operaciones',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/clientes', icon: Users, label: 'Clientes' },
      { to: '/leads', icon: TrendingUp, label: 'Leads' },
      { to: '/produccion', icon: Package, label: 'Producción' },
      { to: '/pedidos', icon: ClipboardList, label: 'Pedidos' },
    ],
  },
  {
    label: 'Documentos',
    items: [
      { to: '/cotizaciones', icon: FileText, label: 'Cotizaciones' },
      { to: '/cobros', icon: CreditCard, label: 'Cobros' },
    ],
  },
  {
    label: 'Negocio',
    items: [
      { to: '/inventario', icon: Archive, label: 'Inventario' },
      { to: '/finanzas', icon: BarChart2, label: 'Finanzas' },
      { to: '/email-marketing', icon: Mail, label: 'Email Marketing' },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { to: '/redes', icon: Share2, label: 'Redes Sociales' },
      { to: '/equipo', icon: UsersRound, label: 'Equipo' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white border-r border-[#e2e6ea] py-6 px-4 shrink-0">
      <div className="mb-8 px-2">
        <span className="text-lg font-bold text-navy-600 tracking-tight">Fabrica<span className="text-accent">3D</span></span>
        <p className="text-xs text-[#8a9ab0] mt-0.5">Business OS</p>
      </div>

      <nav className="flex flex-col gap-6 flex-1">
        {groups.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a9ab0] mb-2 px-2">{group.label}</p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive ? 'bg-navy-600 text-white' : 'text-navy-600 hover:bg-[#f8f9fb]'}`
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
