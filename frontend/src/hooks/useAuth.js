import { useState, useEffect } from 'react'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { setAuthToken } from '../lib/authState'

// Module-level user store: ensures ALL useAuth() instances update together.
// Individual useState would only update the calling component's instance.
let _user = null
const _userListeners = new Set()
function broadcastUser(u) {
  _user = u
  _userListeners.forEach(fn => fn(u))
}

export function useAuth() {
  const [user, _setUser] = useState(_user)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    _userListeners.add(_setUser)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthToken(session?.access_token ?? null)
      broadcastUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token ?? null)
      broadcastUser(session?.user ?? null)
    })
    return () => {
      _userListeners.delete(_setUser)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    // On iOS+CapacitorHttp, the patched window.fetch can corrupt Supabase's auth
    // response parsing so that result.data.session is null even on HTTP 200.
    // Use CapacitorHttp.request() (native HTTP, not patched fetch) as the primary
    // path, then persist the session to Preferences (iOS UserDefaults) so that
    // getSession() finds it on the next call and across app restarts.
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
          const iosUser = resp.data.user ?? null
          // Write session to Preferences so getSession() can read it (survives app restarts).
          const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
          await Preferences.set({ key: `sb-${projectRef}-auth-token`, value: JSON.stringify(resp.data) })
          setAuthToken(resp.data.access_token)
          broadcastUser(iosUser)
          return { data: { user: iosUser, session: resp.data }, error: null }
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
