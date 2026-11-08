'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError(false)
    try {
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
      })
      if (resetError?.status === 429) {
        setError(true)
        setMessage('Trop de demandes. Patientez quelques minutes puis réessayez.')
      } else {
        // Même message que le compte existe ou non, pour ne pas révéler quelles adresses sont inscrites.
        setMessage('Si un compte existe pour cette adresse, un email avec un lien de réinitialisation vient d’être envoyé.')
      }
    } catch {
      setError(true)
      setMessage('Une erreur est survenue. Vérifiez votre connexion puis réessayez.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
    <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-2xl">
      <Link href="/auth/login" className="text-sm text-muted-foreground">← Retour à la connexion</Link>
      <h1 className="mt-8 text-3xl font-semibold">Mot de passe oublié</h1>
      <p className="mt-3 text-sm text-muted-foreground">Saisissez votre adresse email : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
      <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" aria-label="Email" className="rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" />
        {message && <p role={error ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${error ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{message}</p>}
        <button disabled={busy} className="rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Envoi…' : 'Envoyer le lien'}</button>
      </form>
    </div>
  </main>
}
