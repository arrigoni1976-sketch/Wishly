import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { capacitorStorage } from './capacitorStorage'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseAnonKey || supabaseAnonKey.includes('placeholder')) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devono essere configurati nel file .env')
}

// On iOS, use Preferences (iOS UserDefaults) instead of localStorage:
// WKWebView can wipe localStorage at any time, causing silent session loss.
// detectSessionInUrl is false on native because deep links are handled by DeepLinkHandler in App.jsx.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: capacitorStorage,
    detectSessionInUrl: !Capacitor.isNativePlatform(),
    autoRefreshToken: true,
    persistSession: true,
  },
})
