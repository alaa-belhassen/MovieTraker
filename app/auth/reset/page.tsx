'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setHasSession(Boolean(data.user))).catch(() => setHasSession(false)).finally(() => setReady(true))
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError(true)
    if (password.length < 8) return setMessage('Le mot de passe doit contenir au moins 8 caractères.')
    if (password !== confirm) return setMessage('La confirmation ne correspond pas au mot de passe.')
    setBusy(true)
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password })
      if (updateError) return setMessage('Impossible de modifier le mot de passe. Le lien a peut-être expiré : demandez-en un nouveau.')
      setError(false)
      setMessage('Mot de passe modifié. Redirection…')
      setTimeout(() => { router.push('/profil'); router.refresh() }, 1200)
    } catch {
      setMessage('Une erreur est survenue. Vérifiez votre connexion puis réessayez.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
    <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-2xl">
      <h1 className="text-3xl font-semibold">Nouveau mot de passe</h1>
      {!ready && <p className="mt-6 text-sm text-muted-foreground">Vérification du lien…</p>}
      {ready && !hasSession && <>
        <p role="alert" className="mt-6 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Ce lien est invalide ou a expiré.</p>
        <Link href="/auth/forgot" className="mt-4 inline-block text-sm underline underline-offset-4">Demander un nouveau lien</Link>
      </>}
      {ready && hasSession && <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
        <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe (8 caractères minimum)" autoComplete="new-password" aria-label="Nouveau mot de passe" className="rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" />
        <input required minLength={8} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmer le mot de passe" autoComplete="new-password" aria-label="Confirmer le mot de passe" className="rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" />
        {message && <p role={error ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${error ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{message}</p>}
        <button disabled={busy} className="rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>}
    </div>
  </main>
}
