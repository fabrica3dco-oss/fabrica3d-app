import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { useRealtimeRefresh } from './useRealtimeRefresh'

const ESTADO_LABELS = {
  en_cola: 'Cola', diseno_stl: 'Diseño STL',
  imprimiendo: 'Impresión', acabado: 'Acabado', terminado: 'Terminado',
}
const ESTADOS_ACTIVOS = ['en_cola', 'diseno_stl', 'imprimiendo', 'acabado', 'terminado']

export function useDashboard() {
  const [metrics, setMetrics] = useState({
    cobradoMes: 0, cobradoMesAnterior: 0,
    porCobrar: 0, leadsActivos: 0, enProduccion: 0,
  })
  const [alertas, setAlertas]               = useState({ stockBajo: [], cobrosVencidos: [], cotizPendientes: [] })
  const [cobrosProximos, setCobrosProximos] = useState([])
  const [ultimosMovimientos, setUltimosMovimientos] = useState([])
  const [pedidosPorEstado, setPedidosPorEstado]     = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const now          = new Date()
      const hoy          = now.toISOString().split('T')[0]
      const primerMes    = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const primerMesAnt = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      const hace15       = new Date(now - 15 * 86400000).toISOString().split('T')[0]

      const [
        cobradoRes, cobradoAntRes, porCobrarRes,
        leadsRes, produccionRes,
        stockRes, vencidosRes, proximosRes,
        movimientosRes, cotizPendRes, pedidosEstadoRes,
      ] = await Promise.all([
        supabase.from('cobros').select('monto').eq('estado', 'pagado').gte('fecha_emision', primerMes),
        supabase.from('cobros').select('monto').eq('estado', 'pagado').gte('fecha_emision', primerMesAnt).lt('fecha_emision', primerMes),
        supabase.from('cobros').select('monto').eq('estado', 'pendiente'),
        supabase.from('leads').select('id', { count: 'exact' }).not('etapa', 'in', '("cerrado_ganado","cerrado_perdido")'),
        supabase.from('pedidos').select('id', { count: 'exact' }).in('estado', ['en_cola', 'diseno_stl', 'imprimiendo', 'acabado']),
        supabase.from('inventario').select('nombre, stock_actual, stock_minimo').filter('stock_actual', 'lte', 'stock_minimo'),
        supabase.from('cobros').select('id, cliente_nombre, monto, fecha_vencimiento').eq('estado', 'pendiente').lt('fecha_vencimiento', hoy),
        supabase.from('cobros').select('id, cliente_nombre, monto, fecha_vencimiento').eq('estado', 'pendiente').gte('fecha_vencimiento', hoy).order('fecha_vencimiento').limit(5),
        supabase.from('transacciones').select('descripcion, monto, tipo, fecha').order('created_at', { ascending: false }).limit(5),
        supabase.from('cotizaciones').select('id, cliente_nombre, fecha_emision').eq('estado', 'enviada').lt('fecha_emision', hace15),
        supabase.from('pedidos').select('estado').not('estado', 'eq', 'entregado'),
      ])

      const cobradoMes    = (cobradoRes.data    || []).reduce((s, c) => s + Number(c.monto), 0)
      const cobradoMesAnt = (cobradoAntRes.data || []).reduce((s, c) => s + Number(c.monto), 0)
      const porCobrar     = (porCobrarRes.data  || []).reduce((s, c) => s + Number(c.monto), 0)

      const estadoCounts = {}
      ;(pedidosEstadoRes.data || []).forEach(p => {
        estadoCounts[p.estado] = (estadoCounts[p.estado] || 0) + 1
      })
      const pedidosArr = ESTADOS_ACTIVOS
        .map(e => ({ id: e, label: ESTADO_LABELS[e], count: estadoCounts[e] || 0 }))
        .filter(e => e.count > 0)

      setMetrics({ cobradoMes, cobradoMesAnterior: cobradoMesAnt, porCobrar, leadsActivos: leadsRes.count || 0, enProduccion: produccionRes.count || 0 })
      setAlertas({ stockBajo: stockRes.data || [], cobrosVencidos: vencidosRes.data || [], cotizPendientes: cotizPendRes.data || [] })
      setCobrosProximos(proximosRes.data || [])
      setUltimosMovimientos(movimientosRes.data || [])
      setPedidosPorEstado(pedidosArr)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Actualización en tiempo real: cualquier cambio en estas tablas refresca el dashboard
  useRealtimeRefresh(['cobros', 'pedidos', 'inventario', 'cotizaciones', 'leads'], fetchAll)

  return { metrics, alertas, cobrosProximos, ultimosMovimientos, pedidosPorEstado, loading, refetch: fetchAll }
}
