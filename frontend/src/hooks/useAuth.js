import { useState, useEffect } from 'react'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { setAuthToken } from '../lib/authState'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthToken(session?.access_token ?? null)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token ?? null)
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    // On iOS+CapacitorHttp, the patched window.fetch can corrupt Supabase's auth
    // response parsing so that result.data.session is null even on HTTP 200.
    // Use CapacitorHttp.request() (native HTTP, not patched fetch) as the primary
    // path, then register the session with Supabase so React state stays in sync.
    if (Capacitor.isNativePlatform()) {
      try {
        const resp = await CapacitorHttp.request({
          method: 'POST',
          url: `${supabaseUrl}/auth/v1/token?grant_type=password`,
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          data: { email, password },
        })
        if (resp.status === 200 && resp.data?.access_token) {
          const { access_token, refresh_token } = resp.data
          setAuthToken(access_token)
          // Register session with Supabase client (no network call, JWT decoded locally)
          await supabase.auth.setSession({ access_token, refresh_token })
          return { data: { user: resp.data.user, session: resp.data }, error: null }
        }
        const msg = resp.data?.error_description || resp.data?.msg || 'Email o password non corretti'
        return { data: { user: null, session: null }, error: { message: msg } }
      } catch (err) {
        return { data: { user: null, session: null }, error: { message: err?.message || 'Errore di rete' } }
      }
    }
    // Browser: standard Supabase flow (unchanged)
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.data?.session?.access_token) setAuthToken(result.data.session.access_token)
    return result
  }

  const signUp = (email, password) =>
    supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: 'https://www.pikyapp.it/conferma-email' },
    })

  const signOut = () => supabase.auth.signOut()

  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.pikyapp.it/reset-password',
    })

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  return { user, loading, signIn, signUp, signOut, getToken, resetPassword }
}
