import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Leads from './pages/Leads'
import Cotizaciones from './pages/Cotizaciones'
import Cobros from './pages/Cobros'
import Produccion from './pages/Produccion'
import Pedidos from './pages/Pedidos'
import CotizacionPublica from './pages/CotizacionPublica'
import Inventario from './pages/Inventario'
import Finanzas from './pages/Finanzas'
import Calculadora from './pages/Calculadora'

// Protege todas las rutas internas
function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* Login — público */}
        <Route path="/login" element={<LoginGate />} />

        {/* Cotización pública — sin auth */}
        <Route path="cotizacion/:id" element={<CotizacionPublica />} />

        {/* App protegida */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="clientes"    element={<Clientes />} />
          <Route path="leads"       element={<Leads />} />
          <Route path="cotizaciones" element={<Cotizaciones />} />
          <Route path="cobros"      element={<Cobros />} />
          <Route path="produccion"  element={<Produccion />} />
          <Route path="pedidos"     element={<Pedidos />} />
          <Route path="inventario"  element={<Inventario />} />
          <Route path="finanzas"    element={<Finanzas />} />
          <Route path="calculadora" element={<Calculadora />} />
        </Route>

        {/* Cualquier ruta desconocida → dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// Redirige al dashboard si ya está logueado
function LoginGate() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
      </div>
    )
  }

  if (session) return <Navigate to="/dashboard" replace />

  return <Login />
}
