import 'server-only'

import { createClient } from '@supabase/supabase-js'

// Client "administrateur" Supabase (clé service_role). À utiliser UNIQUEMENT côté serveur.
// Retourne null si la clé n'est pas configurée afin de pouvoir refuser l'opération proprement.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
