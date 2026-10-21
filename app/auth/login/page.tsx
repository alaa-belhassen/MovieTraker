'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? searchParams.get('next') ?? '/profil'
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    try {
      const supabase = createClient()
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { username: username.trim() },
              emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
            },
          })

      if (result.error) {
        const errorMessage = result.error.message.toLowerCase()
        setMessage(errorMessage.includes('captcha')
          ? 'La vérification de sécurité a échoué. Rechargez la page puis réessayez.'
          : errorMessage.includes('invalid')
            ? 'Email ou mot de passe invalide.'
            : errorMessage.includes('confirm')
              ? 'Confirmez votre adresse email avant de vous connecter.'
              : 'Impossible de terminer la demande. Vérifiez les informations saisies puis réessayez.')
        return
      }

      if (mode === 'signup') {
        setMessage(result.data.session
          ? 'Compte créé. Vous allez être redirigé.'
          : 'Compte créé. Consultez votre boîte mail pour confirmer votre adresse.')
        if (result.data.session) {
          router.push(redirectTo)
          router.refresh()
        }
        return
      }

      if (result.data.session) {
        router.push(redirectTo)
        router.refresh()
      } else {
        setMessage('Connexion impossible pour le moment. Réessayez dans quelques instants.')
      }
    } catch {
      setMessage('Une erreur inattendue est survenue. Rechargez la page puis réessayez.')
    } finally {
      setBusy(false)
    }
  }
  return <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground"><div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-2xl"><Link href="/" className="text-sm text-muted-foreground">← Retour à CinéTrack</Link><p className="mt-8 text-sm font-medium text-primary">Votre espace personnel</p><h1 className="mt-2 text-3xl font-semibold">{mode === 'login' ? 'Se connecter' : 'Créer un compte'}</h1><p className="mt-3 text-sm text-muted-foreground">Participez au forum, rejoignez des listes et retrouvez vos films.</p><form onSubmit={submit} className="mt-7 flex flex-col gap-4">{mode === 'signup' && <input required minLength={3} maxLength={30} value={username} onChange={e => setUsername(e.target.value)} placeholder="Nom public" className="rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" />}<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" /><input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe (8 caractères minimum)" className="rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" />{message && <p role="alert" className="rounded-xl bg-primary/10 p-3 text-sm text-primary">{message}</p>}<button disabled={busy} className="rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Patientez…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button></form><button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }} className="mt-6 text-sm text-muted-foreground underline underline-offset-4">{mode === 'login' ? 'Créer un compte' : 'J’ai déjà un compte'}</button></div></main>
}
