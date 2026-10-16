import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseAnonKey || supabaseAnonKey.includes('placeholder')) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devono essere configurati nel file .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
