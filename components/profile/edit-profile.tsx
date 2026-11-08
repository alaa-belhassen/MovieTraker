'use client'

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react'
import { LogOut, Settings2, X } from 'lucide-react'
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

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const AVATAR_MAX_BYTES = 5 * 1024 * 1024

// Recadre l'image en carré 256x256 et la convertit en WebP : fichier léger, sans métadonnées (EXIF/GPS).
async function toAvatarBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas')
  const side = Math.min(bitmap.width, bitmap.height)
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('blob'))), 'image/webp', 0.85))
}

function AvatarForm() {
  const { user, profile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const initials = (profile?.username ?? user?.email ?? '?').slice(0, 2).toUpperCase()

  async function removeOldFiles(keep?: string) {
    if (!user) return
    const storage = createClient().storage.from('avatars')
    const { data: files } = await storage.list(user.id)
    const old = (files ?? []).filter((file) => file.name !== keep).map((file) => `${user.id}/${file.name}`)
    if (old.length) await storage.remove(old)
  }

  async function saveAvatar(avatarUrl: string | null) {
    const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar_url: avatarUrl }) })
    if (!response.ok) throw new Error('save')
    // Synchronise le compte d'authentification : cela recharge le profil (et la photo) dans toute l'application.
    await createClient().auth.updateUser({ data: { avatar_url: avatarUrl } }).catch(() => undefined)
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !user) return
    setFeedback(null)
    if (!AVATAR_TYPES.includes(file.type)) return setFeedback({ type: 'error', text: 'Format non pris en charge : utilisez une image JPEG, PNG ou WebP.' })
    if (file.size > AVATAR_MAX_BYTES) return setFeedback({ type: 'error', text: 'Image trop lourde (5 Mo maximum).' })
    setBusy(true)
    try {
      const blob = await toAvatarBlob(file)
      const name = `${Date.now()}.webp`
      const storage = createClient().storage.from('avatars')
      const { error } = await storage.upload(`${user.id}/${name}`, blob, { contentType: 'image/webp', cacheControl: '31536000' })
      if (error) return setFeedback({ type: 'error', text: 'Le stockage des photos n’est pas encore configuré ou est indisponible. Réessayez plus tard.' })
      await saveAvatar(storage.getPublicUrl(`${user.id}/${name}`).data.publicUrl)
      await removeOldFiles(name).catch(() => undefined)
      setFeedback({ type: 'ok', text: 'Photo mise à jour.' })
    } catch {
      setFeedback({ type: 'error', text: 'Impossible d’enregistrer la photo. Essayez une autre image.' })
    } finally {
      setBusy(false)
    }
  }

  async function onRemove() {
    setBusy(true)
    setFeedback(null)
    try {
      await saveAvatar(null)
      await removeOldFiles().catch(() => undefined)
      setFeedback({ type: 'ok', text: 'Photo supprimée.' })
    } catch {
      setFeedback({ type: 'error', text: 'Impossible de supprimer la photo pour le moment.' })
    } finally {
      setBusy(false)
    }
  }

  return <div className="flex flex-col gap-3">
    <h3 className="font-semibold">Photo de profil</h3>
    <div className="flex items-center gap-4">
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="Votre photo de profil" className="size-16 rounded-full object-cover" />
        : <span aria-hidden className="grid size-16 place-items-center rounded-full bg-primary/15 text-lg font-semibold text-primary">{initials}</span>}
      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(',')} onChange={onFile} className="sr-only" id="avatar-file" />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-60">{busy ? 'Envoi…' : 'Choisir une photo'}</button>
        {profile?.avatar_url && <button type="button" disabled={busy} onClick={() => void onRemove()} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground disabled:opacity-60">Retirer</button>}
      </div>
    </div>
    <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP. La photo est recadrée en carré.</p>
    <Message feedback={feedback} />
  </div>
}

export function SignOutButton() {
  const { signOut } = useAuth()
  return <button onClick={() => void signOut()} className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground md:hidden"><LogOut className="size-4" /> Se déconnecter</button>
}

export function DeleteAccountButton() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy])

  function close() { setOpen(false); setPassword(''); setConfirm(''); setFeedback(null) }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFeedback(null)
    if (!user?.email) return setFeedback({ type: 'error', text: 'Session introuvable. Reconnectez-vous.' })
    if (confirm !== 'SUPPRIMER') return setFeedback({ type: 'error', text: 'Tapez exactement SUPPRIMER (en majuscules) pour confirmer.' })
    setBusy(true)
    try {
      const check = await createClient().auth.signInWithPassword({ email: user.email, password })
      if (check.error) return setFeedback({ type: 'error', text: 'Mot de passe incorrect.' })
      const response = await fetch('/api/profile', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm }) })
      if (response.status === 503) return setFeedback({ type: 'error', text: 'La suppression de compte n’est pas encore activée sur ce serveur. Contactez l’administrateur du projet.' })
      if (!response.ok) return setFeedback({ type: 'error', text: 'La suppression a échoué. Réessayez dans un instant.' })
      await signOut()
    } catch {
      setFeedback({ type: 'error', text: 'Problème de connexion. Vérifiez votre réseau puis réessayez.' })
    } finally {
      setBusy(false)
    }
  }

  return <>
    <button onClick={() => setOpen(true)} className="mt-4 rounded-xl border border-destructive/50 px-4 py-2 text-sm text-destructive">Supprimer mon compte</button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) close() }}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-destructive/40 bg-card p-6 shadow-2xl">
        <h2 id="delete-account-title" className="text-xl font-semibold">Supprimer mon compte</h2>
        <p className="mt-3 text-sm text-muted-foreground">Cette action est <strong>définitive</strong>. Seront effacés : votre profil, vos listes de films, vos acteurs favoris, vos salons Watch Together, votre historique de discussion et votre accès à l’application.</p>
        <div className="mt-5 flex flex-col gap-3">
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Votre mot de passe" autoComplete="current-password" aria-label="Votre mot de passe" className={inputClass} />
          <input required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Tapez SUPPRIMER pour confirmer" aria-label="Tapez SUPPRIMER pour confirmer" autoComplete="off" className={inputClass} />
          <Message feedback={feedback} />
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" disabled={busy} onClick={close} className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold disabled:opacity-60">Annuler</button>
          <button disabled={busy || confirm !== 'SUPPRIMER' || !password} className="flex-1 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Suppression…' : 'Supprimer définitivement'}</button>
        </div>
      </form>
    </div>}
  </>
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
          <AvatarForm />
          <UsernameForm />
          <PasswordForm />
        </div>
      </div>
    </div>}
  </>
}
