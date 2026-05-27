import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export function useAuth() {
  const [session, setSession] = useState(undefined) // undefined = cargando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return {
    session,
    loading: session === undefined,
    user: session?.user ?? null,
  }
}
