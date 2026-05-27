import { useEffect, useState, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, TrendingUp, Package,
  FileText, CreditCard, Archive, BarChart2,
  ClipboardList, Calculator,
  ChevronLeft, ChevronRight, LogOut
} from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'

// Badge de stock bajo con realtime
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

const groups = [
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
      { to: '/inventario',  icon: Archive,    label: 'Materiales',  badge: 'stock' },
      { to: '/finanzas',    icon: BarChart2,  label: 'Finanzas' },
      { to: '/calculadora', icon: Calculator, label: 'Calculadora' },
    ],
  },
]

// Solo el ícono geométrico (primeros 3 paths del logo)
function LogoMark() {
  return (
    <svg width="30" height="37" viewBox="0 0 261 326" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M130.042 0L0.0370991 64.6518H0V260.175L65.0209 292.538V97.0151L65.058 96.9778L195.026 32.3259L130.042 0Z" fill="white"/>
      <path d="M130.568 259.916V325.594L196.616 292.774L261.136 260.665V195.026L130.568 259.916Z" fill="white"/>
      <path d="M130.568 129.367V195.026L196.616 162.178L261.136 130.116V64.4575L130.568 129.367Z" fill="white"/>
    </svg>
  )
}

// Logo completo (ícono + texto)
function LogoFull() {
  return (
    <svg width="138" height="33" viewBox="0 0 1347 326" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M130.042 0L0.0370991 64.6518H0V260.175L65.0209 292.538V97.0151L65.058 96.9778L195.026 32.3259L130.042 0Z" fill="white"/>
      <path d="M130.568 259.916V325.594L196.616 292.774L261.136 260.665V195.026L130.568 259.916Z" fill="white"/>
      <path d="M130.568 129.367V195.026L196.616 162.178L261.136 130.116V64.4575L130.568 129.367Z" fill="white"/>
      <path d="M301.308 211.106C301.308 183.627 323.179 175.365 348.938 171.963C372.267 169.046 380.529 166.616 380.529 158.092C380.529 150.054 375.408 144.708 363.519 144.708C350.882 144.708 344.564 150.316 343.33 160.747H306.879C307.851 137.642 325.572 117.977 363.257 117.977C381.95 117.977 394.624 121.379 403.597 128.183C414.289 135.96 419.411 148.11 419.411 163.663V226.359C419.411 236.342 420.383 241.912 423.785 244.118V245.838H385.39C383.446 243.183 382.212 238.286 381.277 231.967H380.791C373.501 242.398 362.547 248.978 343.854 248.978C319.067 248.978 301.308 235.594 301.308 211.069V211.106ZM381.501 201.385V186.581C376.417 189.235 369.127 191.179 361.089 193.123C345.76 196.525 339.442 200.413 339.442 209.91C339.442 219.892 346.732 223.78 356.453 223.78C371.295 223.78 381.501 214.77 381.501 201.423V201.385Z" fill="white"/>
      <path d="M476.986 230.061H476.5V245.875H438.591V72.104H478.22V135.548H478.968C486.744 124.856 497.436 117.79 514.447 117.79C546.786 117.79 567.685 146.241 567.685 183.664C567.685 224.976 546.786 249.763 514.709 249.763C498.184 249.763 484.8 242.959 477.024 230.061H476.986ZM527.57 183.403C527.57 162.018 519.046 147.923 503.007 147.923C485.51 147.923 476.986 163.252 476.986 183.664C476.986 204.077 487.193 218.434 503.456 218.434C519.719 218.434 527.532 205.049 527.532 183.44L527.57 183.403Z" fill="white"/>
      <path d="M580.994 121.454H618.904V140.895H619.651C628.4 126.052 638.606 119.51 653.673 119.51C657.299 119.51 659.729 119.734 661.449 120.482V154.503H660.477C636.176 151.101 620.624 162.99 620.624 189.983V245.875H580.994V121.454Z" fill="white"/>
      <path d="M674.086 72.104H713.715V104.181H674.086V72.104ZM674.086 121.454H713.715V245.875H674.086V121.454Z" fill="white"/>
      <path d="M727.062 183.889C727.062 146.465 752.821 118.014 792.189 118.014C825.986 118.014 847.595 137.717 851.222 165.644H813.05C810.62 154.466 803.816 147.175 792.637 147.175C775.627 147.175 767.103 161.27 767.103 183.889C767.103 206.507 775.627 220.116 792.637 220.116C805.05 220.116 812.564 212.826 814.284 198.731H852.194C851.222 227.406 828.379 249.763 793.123 249.763C753.008 249.763 727.025 221.312 727.025 183.889H727.062Z" fill="white"/>
      <path d="M861.428 211.106C861.428 183.627 883.299 175.365 909.058 171.963C932.387 169.046 940.649 166.616 940.649 158.092C940.649 150.054 935.527 144.708 923.639 144.708C911.002 144.708 904.684 150.316 903.487 160.747H867.036C868.008 137.642 885.766 117.977 923.414 117.977C942.107 117.977 954.744 121.379 963.754 128.183C974.446 135.96 979.568 148.11 979.568 163.663V226.359C979.568 236.342 980.54 241.912 983.942 244.118V245.838H945.547C943.603 243.183 942.406 238.286 941.397 231.967H940.911C933.621 242.398 922.666 248.978 903.973 248.978C879.186 248.978 861.428 235.594 861.428 211.069V211.106ZM941.621 201.385V186.581C936.499 189.235 929.209 191.179 921.208 193.123C905.88 196.525 899.562 200.413 899.562 209.91C899.562 219.892 906.852 223.78 916.573 223.78C931.378 223.78 941.621 214.77 941.621 201.423V201.385Z" fill="white"/>
      <path d="M1011.12 233.725C998.972 223.032 992.653 207.479 992.653 188.263H1031.27C1032.25 206.021 1040.99 218.396 1061.89 218.396C1078.68 218.396 1087.91 209.162 1087.91 195.292C1087.91 180.711 1077.71 173.421 1059.5 173.421H1049.52V144.97H1058.53C1074.08 144.97 1084.29 138.165 1084.29 125.529C1084.29 114.089 1076.25 106.574 1062.42 106.574C1044.66 106.574 1036.88 117.753 1035.95 132.109H997.775C998.486 99.0595 1021.59 75.9548 1062.9 75.9548C1099.62 75.9548 1124.63 93.4516 1124.63 122.874C1124.63 139.885 1114.2 150.353 1099.35 156.186V156.672C1117.6 162.28 1129.49 175.14 1129.49 197.497C1129.49 233.238 1098.61 249.763 1063.61 249.763C1040.06 249.763 1022.79 244.155 1011.12 233.725Z" fill="white"/>
      <path d="M1146.72 72.104H1220.86C1268.97 72.104 1301.31 106.836 1301.31 160.074C1301.31 190.693 1290.62 215.256 1271.18 230.061C1257.57 240.267 1240.08 245.875 1218.2 245.875H1146.76V72.104H1146.72ZM1215.03 209.648C1243.22 209.648 1257.8 191.889 1257.8 160.074C1257.8 128.258 1242.47 108.07 1215.51 108.07H1189.75V209.648H1215.03Z" fill="white"/>
      <path d="M1305.43 205.049H1347V245.875H1305.43V205.049Z" fill="white"/>
    </svg>
  )
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const stockBajoCount = useStockBajoCount()

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen bg-[#142236] py-4 shrink-0 transition-all duration-200 overflow-hidden ${collapsed ? 'w-16' : 'w-56'}`}
    >
      {/* Logo / cabecera */}
      <div className={`mb-6 flex items-center ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
        {collapsed ? <LogoMark /> : <LogoFull />}
      </div>

      {/* Navegación */}
      <nav className="flex flex-col gap-4 flex-1 px-2 overflow-y-auto overflow-x-hidden">
        {groups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 px-2">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors
                    ${collapsed ? 'justify-center' : ''}
                    ${isActive
                      ? 'bg-white/[0.13] text-white'
                      : 'text-white/60 hover:bg-white/[0.07] hover:text-white'
                    }`
                  }
                >
                  <item.icon size={16} className="shrink-0" />
                  {!collapsed && (
                    <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                      {item.label}
                    </span>
                  )}
                  {item.badge === 'stock' && stockBajoCount > 0 && (
                    collapsed ? (
                      <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                        {stockBajoCount}
                      </span>
                    ) : (
                      <span className="bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                        {stockBajoCount}
                      </span>
                    )
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: cerrar sesión + colapsar */}
      <div className="mt-2 px-2 pt-3 border-t border-white/[0.08] flex flex-col gap-0.5">
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expandir' : 'Minimizar'}
          className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors w-full ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span className="text-sm font-medium">Minimizar</span>}
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          title="Cerrar sesión"
          className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/[0.10] transition-colors w-full ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} />
          {!collapsed && <span className="text-sm font-medium">Salir</span>}
        </button>
      </div>
    </aside>
  )
}
