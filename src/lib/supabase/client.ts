import { createBrowserClient } from '@supabase/ssr'

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-anon-key'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isConfigured = url && url !== 'your_supabase_url' && key && key !== 'your_supabase_anon_key'
  return createBrowserClient(
    isConfigured ? url : PLACEHOLDER_URL,
    isConfigured ? key : PLACEHOLDER_KEY
  )
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!(url && url !== 'your_supabase_url')
}
