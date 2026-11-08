'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { Settings2, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase/client'

type Feedback = { type: 'ok' | 'error'; text: string } | null

const USERNAME_PATTERN = /^[\p{L}\p{N}._-]{3,30}$/u
const inputClass = 'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary'

function Message({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  return <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${feedback.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{feedback.text}</p>
}

function UsernameForm() {
  const { user, profile } = useAuth()
  const [username, setUsername] = useState(profile?.username ?? '')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { if (profile?.username) setUsername(profile.username) }, [profile?.username])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const value = username.trim().replace(/^@+/, '')
    setFeedback(null)
    if (!USERNAME_PATTERN.test(value)) return setFeedback({ type: 'error', text: 'Le pseudo doit contenir 3 à 30 caractères : lettres, chiffres, point, tiret ou underscore (sans espace).' })
    if (value === profile?.username) return setFeedback({ type: 'error', text: 'C’est déjà votre pseudo actuel.' })
    setBusy(true)
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: value }) })
      if (response.status === 409) return setFeedback({ type: 'error', text: 'Ce pseudo est déjà utilisé. Essayez-en un autre.' })
      if (response.status === 400) return setFeedback({ type: 'error', text: 'Pseudo invalide : 3 à 30 caractères, sans espace.' })
      if (!response.ok) return setFeedback({ type: 'error', text: 'Impossible d’enregistrer pour le moment. Réessayez.' })
      // Synchronise aussi le compte d'authentification : cela déclenche le rechargement du profil dans toute l'application.
      await createClient().auth.updateUser({ data: { username: value } }).catch(() => undefined)
      setFeedback({ type: 'ok', text: 'Pseudo mis à jour.' })
    } catch {
      setFeedback({ type: 'error', text: 'Problème de connexion. Vérifiez votre réseau puis réessayez.' })
    } finally {
      setBusy(false)
    }
  }

  return <form onSubmit={submit} className="flex flex-col gap-3">
    <h3 className="font-semibold">Pseudo public</h3>
    <p className="text-xs text-muted-foreground">Compte : {user?.email}</p>
    <label htmlFor="edit-username" className="sr-only">Pseudo public</label>
    <input id="edit-username" ref={inputRef} value={username} onChange={(e) => setUsername(e.target.value)} maxLength={31} autoComplete="username" className={inputClass} />
    <Message feedback={feedback} />
    <button disabled={busy} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Enregistrement…' : 'Enregistrer le pseudo'}</button>
  </form>
}

function PasswordForm() {
  const { user } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFeedback(null)
    if (!user?.email) return setFeedback({ type: 'error', text: 'Session introuvable. Reconnectez-vous.' })
    if (next.length < 8) return setFeedback({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' })
    if (next !== confirm) return setFeedback({ type: 'error', text: 'La confirmation ne correspond pas au nouveau mot de passe.' })
    if (next === current) return setFeedback({ type: 'error', text: 'Le nouveau mot de passe doit être différent de l’ancien.' })
    setBusy(true)
    try {
      const supabase = createClient()
      // On vérifie l'ancien mot de passe avant d'autoriser le changement.
      const check = await supabase.auth.signInWithPassword({ email: user.email, password: current })
      if (check.error) return setFeedback({ type: 'error', text: 'Mot de passe actuel incorrect.' })
      const { error } = await supabase.auth.updateUser({ password: next })
      if (error) return setFeedback({ type: 'error', text: 'Impossible de changer le mot de passe. Choisissez-en un plus robuste ou réessayez.' })
      setCurrent(''); setNext(''); setConfirm('')
      setFeedback({ type: 'ok', text: 'Mot de passe modifié.' })
    } catch {
      setFeedback({ type: 'error', text: 'Problème de connexion. Vérifiez votre réseau puis réessayez.' })
    } finally {
      setBusy(false)
    }
  }

  return <form onSubmit={submit} className="flex flex-col gap-3">
    <h3 className="font-semibold">Mot de passe</h3>
    <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Mot de passe actuel" autoComplete="current-password" aria-label="Mot de passe actuel" className={inputClass} />
    <input type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nouveau mot de passe (8 caractères minimum)" autoComplete="new-password" aria-label="Nouveau mot de passe" className={inputClass} />
    <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmer le nouveau mot de passe" autoComplete="new-password" aria-label="Confirmer le nouveau mot de passe" className={inputClass} />
    <Message feedback={feedback} />
    <button disabled={busy} className="rounded-xl border border-border px-4 py-3 text-sm font-semibold disabled:opacity-60">{busy ? 'Modification…' : 'Changer le mot de passe'}</button>
  </form>
}

export function EditProfileButton() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return <>
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm"><Settings2 className="size-4" /> Modifier le profil</button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="edit-profile-title" className="text-xl font-semibold">Modifier le profil</h2>
          <button onClick={() => setOpen(false)} aria-label="Fermer" className="grid size-9 place-items-center rounded-xl border border-border"><X className="size-4" /></button>
        </div>
        <div className="mt-6 flex flex-col gap-8">
          <UsernameForm />
          <PasswordForm />
        </div>
      </div>
    </div>}
  </>
}
