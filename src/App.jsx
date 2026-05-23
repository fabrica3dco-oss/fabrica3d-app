import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
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
import Redes from './pages/Redes'
import Equipo from './pages/Equipo'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="leads" element={<Leads />} />
          <Route path="cotizaciones" element={<Cotizaciones />} />
          <Route path="cobros" element={<Cobros />} />
          <Route path="produccion" element={<Produccion />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="finanzas" element={<Finanzas />} />
          <Route path="calculadora" element={<Calculadora />} />
          <Route path="redes" element={<Redes />} />
          <Route path="equipo" element={<Equipo />} />
        </Route>
        <Route path="cotizacion/:id" element={<CotizacionPublica />} />
      </Routes>
    </BrowserRouter>
  )
}
