import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseAnonKey || supabaseAnonKey.includes('placeholder')) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devono essere configurati nel file .env')
}

function getIframeFetch() {
  if (typeof document === 'undefined') return undefined
  try {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'display:none;width:0;height:0'
    document.head.appendChild(iframe)
    const f = iframe.contentWindow?.fetch?.bind(iframe.contentWindow)
    document.head.removeChild(iframe)
    return f || undefined
  } catch {
    return undefined
  }
}

const _nativeFetch = getIframeFetch()
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: _nativeFetch ? { fetch: _nativeFetch } : {},
})
