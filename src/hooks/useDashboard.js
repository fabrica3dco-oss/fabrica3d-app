import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export function useDashboard() {
  const [metrics, setMetrics] = useState({
    cobradoMes: 0,
    porCobrar: 0,
    leadsActivos: 0,
    enProduccion: 0,
  })
  const [alertas, setAlertas] = useState({ stockBajo: [], cobrosVencidos: [] })
  const [cobrosProximos, setCobrosProximos] = useState([])
  const [ultimosMovimientos, setUltimosMovimientos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      try {
        const now = new Date()
        const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

        const [cobradoRes, porCobrarRes, leadsRes, produccionRes,
               stockRes, vencidosRes, proximosRes, movimientosRes] = await Promise.all([
          supabase.from('cobros').select('monto').eq('estado', 'pagado').gte('fecha_emision', primerDiaMes),
          supabase.from('cobros').select('monto').eq('estado', 'pendiente'),
          supabase.from('leads').select('id', { count: 'exact' }).not('etapa', 'in', '("cerrado_ganado","cerrado_perdido")'),
          supabase.from('pedidos').select('id', { count: 'exact' }).in('estado', ['en_cola', 'imprimiendo']),
          supabase.from('inventario').select('nombre, stock_actual, stock_minimo').filter('stock_actual', 'lte', 'stock_minimo'),
          supabase.from('cobros').select('id, cliente_nombre, monto, fecha_vencimiento').eq('estado', 'pendiente').lt('fecha_vencimiento', now.toISOString().split('T')[0]),
          supabase.from('cobros').select('id, cliente_nombre, monto, fecha_vencimiento').eq('estado', 'pendiente').gte('fecha_vencimiento', now.toISOString().split('T')[0]).order('fecha_vencimiento').limit(5),
          supabase.from('transacciones').select('descripcion, monto, tipo, fecha').order('created_at', { ascending: false }).limit(5),
        ])

        const cobradoMes = (cobradoRes.data || []).reduce((s, c) => s + Number(c.monto), 0)
        const porCobrar = (porCobrarRes.data || []).reduce((s, c) => s + Number(c.monto), 0)

        setMetrics({
          cobradoMes,
          porCobrar,
          leadsActivos: leadsRes.count || 0,
          enProduccion: produccionRes.count || 0,
        })

        setAlertas({
          stockBajo: stockRes.data || [],
          cobrosVencidos: vencidosRes.data || [],
        })
        setCobrosProximos(proximosRes.data || [])
        setUltimosMovimientos(movimientosRes.data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  return { metrics, alertas, cobrosProximos, ultimosMovimientos, loading }
}
