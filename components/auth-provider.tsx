'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type Profile = { id: string; username: string | null; avatar_url: string | null; is_moderator?: boolean }
type AuthValue = { user: User | null; profile: Profile | null; loading: boolean; signOut: () => Promise<void> }
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ initialUser, children }: { initialUser: User | null; children: React.ReactNode }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [session, setSession] = useState<Session | null>(initialUser ? { user: initialUser } as Session : null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(!initialUser)

  useEffect(() => {
    let active = true
    async function loadProfile(userId: string) {
      try {
        const { data } = await supabase.from('profiles').select('id, username, avatar_url, is_moderator').eq('id', userId).maybeSingle()
        if (active) setProfile(data as Profile | null)
      } catch (error) {
        console.warn('[v0] Profile unavailable', error)
        if (active) setProfile(null)
      }
    }
    if (session?.user) void loadProfile(session.user.id)
    else { setProfile(null); setLoading(false) }
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
      if (nextSession?.user) void loadProfile(nextSession.user.id)
      else setProfile(null)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') router.refresh()
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [router, session?.user?.id, supabase])

  async function signOut() {
    try { await supabase.auth.signOut() } catch (error) { console.warn('[v0] Sign out request unavailable', error) }
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
      window.sessionStorage.clear()
      await new Promise<void>((resolve) => {
        const channel = new BroadcastChannel('cinetrack-auth')
        channel.postMessage({ type: 'SIGNED_OUT' })
        channel.close()
        resolve()
      })
    }
    setSession(null)
    setProfile(null)
    router.replace('/')
    router.refresh()
  }
  return <AuthContext.Provider value={{ user: session?.user ?? null, profile, loading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return value
}
