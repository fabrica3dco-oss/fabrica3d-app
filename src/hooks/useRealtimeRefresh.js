import { useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'

/**
 * Suscribe a cambios de Supabase Realtime en una o varias tablas.
 * Cuando cualquier fila cambia (INSERT / UPDATE / DELETE), llama a `refetch`
 * con un debounce de 350 ms para evitar dobles-fetches cuando la misma
 * página origina la mutación.
 *
 * @param {string | string[]} tables  - Nombre(s) de tabla a escuchar
 * @param {() => void}        refetch - Función que recarga los datos
 */
export function useRealtimeRefresh(tables, refetch) {
  const timerRef  = useRef(null)
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch   // mantiene siempre la versión más fresca

  useEffect(() => {
    const list = Array.isArray(tables) ? tables : [tables]

    const debounced = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => refetchRef.current(), 350)
    }

    const channels = list.map(table =>
      supabase
        .channel(`rt_${table}_${Date.now()}_${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, debounced)
        .subscribe()
    )

    return () => {
      clearTimeout(timerRef.current)
      channels.forEach(ch => supabase.removeChannel(ch))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(Array.isArray(tables) ? tables : [tables])])
}
