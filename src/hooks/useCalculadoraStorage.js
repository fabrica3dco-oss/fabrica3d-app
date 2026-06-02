import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../services/supabase'

export const DEFAULT_CONFIG = {
  filamento_rollo_precio: 90000,
  filamento_rollo_gramos: 1000,
  filamento_inventario_id: null,
  tarifa_hora: 15000,
  accesorios: [
    { id: 'acc_1', nombre: 'Anillo 12 mm',        precio: 100, unidad: 'ud', inventario_ids: [] },
    { id: 'acc_2', nombre: 'Anillo 20 mm',        precio: 400, unidad: 'ud', inventario_ids: [] },
    { id: 'acc_3', nombre: 'Anillo con cadenita', precio: 500, unidad: 'ud', inventario_ids: [] },
  ],
  acabados: [
    { id: 'acb_1', nombre: 'Resina (A+B)', precio: 80, unidad: 'ml', inventario_ids: [] },
  ],
}

// ID fijo para la fila de config compartida entre todos los usuarios
const CONFIG_ROW_ID = '00000000-0000-0000-0000-000000000001'

function normalizeLinks(arr) {
  return (arr || []).map(a => ({
    ...a,
    // migrar inventario_id (legacy) → inventario_ids (nuevo)
    inventario_ids: a.inventario_ids ?? (a.inventario_id ? [a.inventario_id] : []),
  }))
}

function mergeConfig(saved) {
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    accesorios: normalizeLinks(saved.accesorios ?? DEFAULT_CONFIG.accesorios),
    acabados:   normalizeLinks(saved.acabados   ?? DEFAULT_CONFIG.acabados),
    filamento_inventario_id: saved.filamento_inventario_id ?? null,
  }
}

export function useCalculadoraStorage() {
  const [config, setConfigState]   = useState(DEFAULT_CONFIG)
  const [plantillas, setPlantillas] = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const userIdRef = useRef(null)

  // ── Carga inicial ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    userIdRef.current = user.id

    // Config compartida — no filtra por user_id, toma la primera fila
    const [{ data: cfgData, error: cfgErr }, { data: plantData }] = await Promise.all([
      supabase.from('calculadora_config').select('config').limit(1).maybeSingle(),
      supabase.from('calculadora_plantillas').select('*').order('created_at', { ascending: true }),
    ])

    if (cfgErr) console.error('Error cargando config:', cfgErr)
    if (cfgData?.config) setConfigState(mergeConfig(cfgData.config))
    if (plantData) setPlantillas(plantData.map(p => ({ id: p.id, nombre: p.nombre, rec: p.rec })))
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Realtime: sync entre dispositivos ────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('calculadora-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calculadora_config' },
        () => loadData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calculadora_plantillas' },
        () => loadData()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  // ── Solo actualiza estado local ───────────────────────────────────────────
  const setConfig = useCallback((updater) => {
    setConfigState(prev => typeof updater === 'function' ? updater(prev) : updater)
    setSaveStatus(null)
  }, [])

  // ── Guardado explícito con ID fijo (upsert compartido) ───────────────────
  const saveConfig = useCallback(async (configToSave) => {
    setSaving(true)
    setSaveStatus(null)
    const { error } = await supabase
      .from('calculadora_config')
      .upsert(
        { id: CONFIG_ROW_ID, user_id: userIdRef.current, config: configToSave, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
    setSaving(false)
    if (error) {
      console.error('Error guardando config:', error)
      setSaveStatus('error')
    } else {
      setSaveStatus('ok')
      setTimeout(() => setSaveStatus(null), 3000)
    }
    return !error
  }, [])

  // ── Plantillas ────────────────────────────────────────────────────────────
  async function guardarPlantilla(nombre, rec) {
    const uid = userIdRef.current
    const { data, error } = await supabase
      .from('calculadora_plantillas')
      .insert({ user_id: uid, nombre, rec })
      .select().single()
    if (!error && data)
      setPlantillas(prev => [...prev, { id: data.id, nombre: data.nombre, rec: data.rec }])
    return !error
  }

  async function eliminarPlantilla(id) {
    await supabase.from('calculadora_plantillas').delete().eq('id', id)
    setPlantillas(prev => prev.filter(p => p.id !== id))
  }

  async function renombrarPlantilla(id, nombre) {
    await supabase.from('calculadora_plantillas').update({ nombre }).eq('id', id)
    setPlantillas(prev => prev.map(p => p.id === id ? { ...p, nombre } : p))
  }

  return {
    config, setConfig, saveConfig, saving, saveStatus,
    plantillas, loading,
    guardarPlantilla, eliminarPlantilla, renombrarPlantilla,
  }
}

// ── Hook ligero para Pedidos y Producción ─────────────────────────────────
export function useCalculadoraConfig() {
  const [calcConfig, setCalcConfig] = useState({ accesorios: [], acabados: [] })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('calculadora_config')
        .select('config')
        .limit(1)
        .maybeSingle()
      if (data?.config) {
        setCalcConfig({
          accesorios: data.config.accesorios || [],
          acabados:   data.config.acabados   || [],
        })
      }
    }
    load()

    const channel = supabase
      .channel('calc-config-light')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calculadora_config' },
        () => load()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return calcConfig
}
