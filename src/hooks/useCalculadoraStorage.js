import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../services/supabase'

export const DEFAULT_CONFIG = {
  filamento_rollo_precio: 90000,
  filamento_rollo_gramos: 1000,
  tarifa_hora: 15000,
  accesorios: [
    { id: 'acc_1', nombre: 'Anillo 12 mm',        precio: 100, unidad: 'ud' },
    { id: 'acc_2', nombre: 'Anillo 20 mm',        precio: 400, unidad: 'ud' },
    { id: 'acc_3', nombre: 'Anillo con cadenita', precio: 500, unidad: 'ud' },
  ],
  acabados: [
    { id: 'acb_1', nombre: 'Resina (A+B)', precio: 80, unidad: 'ml' },
  ],
}

function mergeConfig(saved) {
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    accesorios: saved.accesorios ?? DEFAULT_CONFIG.accesorios,
    acabados:   saved.acabados   ?? DEFAULT_CONFIG.acabados,
  }
}

export function useCalculadoraStorage() {
  const [config, setConfigState]   = useState(DEFAULT_CONFIG)
  const [plantillas, setPlantillas] = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'ok' | 'error' | null
  const userIdRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      userIdRef.current = user.id

      const [{ data: cfgData }, { data: plantData }] = await Promise.all([
        supabase.from('calculadora_config').select('config').eq('user_id', user.id).maybeSingle(),
        supabase.from('calculadora_plantillas').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      ])

      if (cfgData?.config) setConfigState(mergeConfig(cfgData.config))
      if (plantData) setPlantillas(plantData.map(p => ({ id: p.id, nombre: p.nombre, rec: p.rec })))
      setLoading(false)
    }
    load()
  }, [])

  // Solo actualiza el estado local — el guardado es manual con saveConfig
  const setConfig = useCallback((updater) => {
    setConfigState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next
    })
    setSaveStatus(null) // marcar como pendiente
  }, [])

  // Guardado explícito — llamado desde el botón
  const saveConfig = useCallback(async (configToSave) => {
    const uid = userIdRef.current
    if (!uid) return false
    setSaving(true)
    setSaveStatus(null)
    const { error } = await supabase
      .from('calculadora_config')
      .upsert(
        { user_id: uid, config: configToSave, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    setSaving(false)
    setSaveStatus(error ? 'error' : 'ok')
    if (error) console.error('Error guardando config calculadora:', error)
    return !error
  }, [])

  async function guardarPlantilla(nombre, rec) {
    const uid = userIdRef.current
    if (!uid) return
    const { data, error } = await supabase
      .from('calculadora_plantillas')
      .insert({ user_id: uid, nombre, rec })
      .select()
      .single()
    if (!error && data) {
      setPlantillas(prev => [...prev, { id: data.id, nombre: data.nombre, rec: data.rec }])
    }
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

// Lightweight hook for pages that only need to read accesorios/acabados
export function useCalculadoraConfig() {
  const [calcConfig, setCalcConfig] = useState({ accesorios: [], acabados: [] })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('calculadora_config')
        .select('config')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data?.config) {
        setCalcConfig({
          accesorios: data.config.accesorios || [],
          acabados:   data.config.acabados   || [],
        })
      }
    }
    load()
  }, [])

  return calcConfig
}
