'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Copy, ExternalLink, MoreVertical, Play, Share2, Trash2, Users, X, Film, LogOut, Radio } from 'lucide-react'
import {
  detectVideoProvider,
  extractVimeoId,
  extractYouTubeId,
  getMyWatchRooms,
  supabase,
  updateRoomVideo,
  validateVideoUrl,
  type WatchRoomSummary,
} from '@/lib/cinetrack-data'
import useSWR from 'swr'
import { Player } from '@/components/video-player'
import { useWatchParty } from '@/hooks/use-watch-party'
import { useWatchPresence } from '@/hooks/use-watch-presence'
import { useAuth } from '@/components/auth-provider'

type Room = {
  id: string
  title: string
  video_url: string | null
  video_provider: string | null
  mode: 'video' | 'timer'
  host_id?: string
}

const poster = 'https://image.tmdb.org/t/p/w342/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'

function Layout({ children, eyebrow, title }: { children: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <main className="min-h-screen bg-[#0b0d0e] text-[#f2f0eb]">
      <div className="mx-auto max-w-6xl px-5 py-7 md:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#a7aaa7] transition hover:text-[#d8ff45] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d8ff45]"
        >
          <ArrowLeft aria-hidden="true" /> Retour à CinéTrack
        </Link>
        <div className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8ff45]">{eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">{title}</h1>
        </div>
        {children}
      </div>
    </main>
  )
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

function CreateRoom({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess?: (createdRoom: any) => void
}) {
  const [mode, setMode] = useState<'video' | 'timer'>('video')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('Soirée cinéma')
  const [invited, setInvited] = useState('')
  const [rights, setRights] = useState(false)
  const [created, setCreated] = useState<Room | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [invitationNotice, setInvitationNotice] = useState('')

  const submit = async () => {
    setError('')
    if (!title.trim()) return setError('Donnez un titre à votre salon.')

    if (mode === 'video') {
      if (!validateVideoUrl(url)) return setError('Ajoutez un lien HTTPS valide (YouTube, Vimeo, MP4 direct).')
      if (!rights) return setError('Confirmez que vous avez le droit de partager cette vidéo.')
    }

    setSaving(true)
    try {
      const invitedList = invited
        .split(/[\s,]+/)
        .map((p) => p.trim())
        .filter(Boolean)

      const response = await fetch('/api/watch/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          videoUrl: mode === 'video' ? url.trim() : '',
          mode,
          invitedUsernames: invitedList,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Impossible de créer le salon.')

      setCreated(payload.room)
      const notices = []
      if (payload.invitationError) notices.push(payload.invitationError)
      if (payload.invitedUsers?.length) notices.push(`Invités : ${payload.invitedUsers.join(', ')}.`)
      if (payload.notFoundUsers?.length) notices.push(`Pseudos introuvables : ${payload.notFoundUsers.join(', ')}.`)
      setInvitationNotice(notices.join(' '))
      if (onSuccess) onSuccess(payload.room)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de créer le salon.')
    } finally {
      setSaving(false)
    }
  }

  if (created) {
    const roomUrl = `${location.origin}/watch/${created.id}`
    return (
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#171a1b] p-6 shadow-2xl">
          <button onClick={onClose} aria-label="Fermer" className="float-right text-[#a7aaa7] hover:text-white">
            <X />
          </button>
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-[#d8ff45] p-2 text-black">
              <Check />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Votre salon est prêt !</h2>
              <p className="mt-1 text-sm text-[#a7aaa7]">
                Enregistré dans Supabase. Partagez le lien avec vos amis pour qu’ils vous rejoignent.
              </p>
              {invitationNotice && <p role="status" className="mt-3 text-sm text-[#d8ff45]">{invitationNotice}</p>}
            </div>
          </div>
          <div className="mt-6 flex gap-3 rounded-xl bg-black/30 p-3">
            <input readOnly value={roomUrl} className="min-w-0 flex-1 bg-transparent text-sm text-[#a7aaa7] outline-none" />
            <button
              onClick={() => copyText(roomUrl)}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20"
            >
              <Copy size={16} /> Copier
            </button>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/watch/${created.id}`}
              className="flex flex-1 items-center justify-center rounded-xl bg-[#d8ff45] py-3 font-semibold text-black transition hover:brightness-105"
            >
              Entrer dans le salon
            </Link>
            <button
              onClick={() => copyText(roomUrl)}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 transition hover:bg-white/15"
            >
              <Share2 size={16} /> Partager
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="create-title" className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4">
      <div className="mx-auto mt-8 w-full max-w-xl rounded-3xl border border-white/10 bg-[#171a1b] p-6 shadow-2xl">
        <div className="flex justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#d8ff45]">Nouveau salon</p>
            <h2 id="create-title" className="mt-2 text-2xl font-semibold">
              Créer un espace Watch Together
            </h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-[#a7aaa7] hover:text-white">
            <X />
          </button>
        </div>

        <div className="mt-7 grid gap-5">
          <label className="text-sm font-medium">
            Titre du salon
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Dune entre amis, Vendredi cinéma"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[#d8ff45]"
            />
          </label>

          <div>
            <label className="text-sm font-medium">Mode de diffusion</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('video')}
                className={`rounded-xl border p-3 text-left transition ${
                  mode === 'video'
                    ? 'border-[#d8ff45] bg-[#d8ff45]/10 text-white'
                    : 'border-white/10 bg-white/5 text-[#a7aaa7] hover:border-white/20'
                }`}
              >
                <div className="text-sm font-semibold text-white">Vidéo intégrée</div>
                <div className="mt-1 text-xs text-[#a7aaa7]">YouTube, Vimeo, fichier MP4</div>
              </button>
              <button
                type="button"
                onClick={() => setMode('timer')}
                className={`rounded-xl border p-3 text-left transition ${
                  mode === 'timer'
                    ? 'border-[#d8ff45] bg-[#d8ff45]/10 text-white'
                    : 'border-white/10 bg-white/5 text-[#a7aaa7] hover:border-white/20'
                }`}
              >
                <div className="text-sm font-semibold text-white">Minuteur partagé</div>
                <div className="mt-1 text-xs text-[#a7aaa7]">Netflix, Prime, Disney+, etc.</div>
              </button>
            </div>
          </div>

          {mode === 'video' ? (
            <>
              <label className="text-sm font-medium">
                Lien de la vidéo <span className="text-[#d8ff45]">*</span>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  type="url"
                  placeholder="https://youtube.com/watch?v=... ou https://.../movie.mp4"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[#d8ff45]"
                />
                <span className="mt-2 block text-xs text-[#a7aaa7]">
                  Plateforme détectée : <strong className="text-white">{url ? detectVideoProvider(url) : '—'}</strong>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-[#a7aaa7]">
                <input
                  type="checkbox"
                  checked={rights}
                  onChange={(e) => setRights(e.target.checked)}
                  className="mt-1 accent-[#d8ff45]"
                />
                Je confirme avoir le droit de partager cette vidéo avec les participants.
              </label>
            </>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-xs leading-5 text-[#a7aaa7]">
              Le minuteur synchronise le temps de lecture, le bouton play/pause et le chat entre tous les invités. Chacun lance son film en parallèle sur sa propre plateforme.
            </div>
          )}

          <label className="text-sm font-medium">
            Inviter des amis (optionnel)
            <input
              value={invited}
              onChange={(e) => setInvited(e.target.value)}
              placeholder="@camille, @lucas, alex..."
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[#d8ff45]"
            />
            <span className="mt-1 block text-xs text-[#a7aaa7]">
              Saisissez les pseudos de comptes CinéTrack, séparés par des virgules. Ils retrouveront le salon dans « Salons où je suis invité ».
            </span>
          </label>

          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

          <button
            disabled={saving}
            onClick={submit}
            className="rounded-xl bg-[#d8ff45] py-3 font-semibold text-black transition hover:brightness-105 disabled:opacity-60"
          >
            {saving ? 'Création et enregistrement dans Supabase…' : 'Créer le salon'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RoomCard({
  room,
  onNotice,
  onDelete,
}: {
  room: WatchRoomSummary
  onNotice: (message: string) => void
  onDelete: (room: WatchRoomSummary) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isOwner = room.role === 'owner'
  const roomUrl = `${typeof location !== 'undefined' ? location.origin : ''}/watch/${room.id}`

  const providerLabel =
    room.mode === 'timer'
      ? 'Minuteur'
      : room.video_provider === 'youtube'
      ? 'YouTube'
      : room.video_provider === 'vimeo'
      ? 'Vimeo'
      : room.video_provider === 'direct'
      ? 'Direct MP4'
      : 'Vidéo'

  const formattedDate = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Récemment'

  return (
    <article className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:border-[#d8ff45]/40 sm:flex-row sm:items-center">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-white/[.06]">
        <div className="grid size-full place-items-center bg-[#171a1b] text-[#d8ff45]">
          <Play className="size-8" aria-hidden="true" />
        </div>
        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-[#0b0d0e]/85 px-2 py-0.5 text-[9px] font-semibold text-[#d8ff45]">
          <span className="size-1.5 animate-pulse rounded-full bg-[#d8ff45]" /> ACTIF
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isOwner ? 'bg-[#d8ff45]/20 text-[#d8ff45]' : 'bg-white/10 text-white/80'
            }`}
          >
            {isOwner ? 'Mon salon' : `Invité · par ${room.host_username || 'un ami'}`}
          </span>
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-[#a7aaa7]">{providerLabel}</span>
          <span className="text-xs text-[#a7aaa7]">{formattedDate}</span>
        </div>

        <h2 className="mt-2 truncate text-xl font-semibold text-white">{room.title}</h2>

        <div className="mt-2 flex items-center gap-3 text-xs text-[#a7aaa7]">
          <span className="flex items-center gap-1.5">
            <Users size={14} className="text-[#d8ff45]" />
            {room.participantCount ?? 1} participant{(room.participantCount ?? 1) > 1 ? 's' : ''}
          </span>
          {room.video_url && (
            <span className="truncate max-w-xs text-xs text-[#777] hidden md:inline">
              {room.video_url}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
        <Link
          href={`/watch/${room.id}`}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-[#d8ff45] px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-105"
        >
          Entrer
        </Link>
        <div className="relative flex gap-2">
          <button
            onClick={async () => {
              if (await copyText(roomUrl)) onNotice('Lien du salon copié dans le presse-papier !')
            }}
            aria-label={`Partager ${room.title}`}
            title="Copier le lien"
            className="rounded-full bg-white/10 p-2.5 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <Share2 size={16} aria-hidden="true" />
          </button>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={`Actions pour ${room.title}`}
            className="rounded-full bg-white/10 p-2.5 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <MoreVertical size={16} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-12 z-20 min-w-44 rounded-xl border border-white/10 bg-[#171a1b] p-1 shadow-xl"
            >
              <button
                role="menuitem"
                onClick={async () => {
                  setMenuOpen(false)
                  if (await copyText(roomUrl)) onNotice('Lien copié !')
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/10"
              >
                <Copy size={15} /> Copier le lien
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete(room)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-200 transition hover:bg-red-500/15"
              >
                {isOwner ? (
                  <>
                    <Trash2 size={15} /> Supprimer le salon
                  </>
                ) : (
                  <>
                    <LogOut size={15} /> Quitter le salon
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function InviteParticipants({ roomId }: { roomId: string }) {
  const [usernames, setUsernames] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [sending, setSending] = useState(false)

  const invite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setIsError(false)
    const names = usernames.split(/[\s,]+/).map((name) => name.trim()).filter(Boolean)
    if (names.length === 0) {
      setMessage('Saisissez au moins un pseudo.')
      setIsError(true)
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/watch/rooms/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, usernames: names }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Impossible d’envoyer les invitations.')

      const notices: string[] = []
      if (result.invited?.length) notices.push(`Invités : ${result.invited.join(', ')}.`)
      if (result.notFound?.length) notices.push(`Pseudos introuvables : ${result.notFound.join(', ')}.`)
      setMessage(notices.join(' ') || 'Aucun nouvel utilisateur à inviter.')
      setUsernames('')
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : 'Impossible d’envoyer les invitations.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={invite} className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-4">
      <label htmlFor="invite-usernames" className="block text-sm font-semibold">Inviter des utilisateurs</label>
      <p className="mt-1 text-xs text-[#a7aaa7]">Pseudos CinéTrack séparés par des virgules. Les invités retrouveront ce salon dans leur liste.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="invite-usernames"
          value={usernames}
          onChange={(event) => setUsernames(event.target.value)}
          placeholder="@camille, lucas"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#d8ff45]"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-xl bg-[#d8ff45] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {sending ? 'Envoi…' : 'Inviter'}
        </button>
      </div>
      {message && <p role={isError ? 'alert' : 'status'} className={`mt-3 text-sm ${isError ? 'text-red-300' : 'text-[#d8ff45]'}`}>{message}</p>}
    </form>
  )
}

function EmptySalons({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/[.03] px-6 py-14 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#d8ff45]/10 text-[#d8ff45]">
        <Users size={28} aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">Aucun salon pour le moment</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#a7aaa7]">
        Créez un salon dans Supabase et invitez vos proches à partager votre prochaine séance cinéma en direct.
      </p>
      <button
        onClick={onCreate}
        className="mt-6 rounded-full bg-[#d8ff45] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-105"
      >
        Créer mon premier salon
      </button>
    </div>
  )
}

export function WatchLanding() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [join, setJoin] = useState('')
  const [joining, setJoining] = useState(false)
  const [tab, setTab] = useState<'all' | 'owned' | 'invited'>('all')
  const [notice, setNotice] = useState('')

  const {
    data: rooms,
    error: roomsError,
    isLoading: roomsLoading,
    mutate,
  } = useSWR<WatchRoomSummary[]>(
    'my-watch-rooms',
    async () => {
      try {
        const response = await fetch('/api/watch/rooms', {
          credentials: 'include',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (response.ok) {
          const payload = (await response.json()) as { rooms?: WatchRoomSummary[] }
          return payload.rooms ?? []
        }
      } catch (err) {
        console.warn('[CinéTrack] API watch rooms failed, falling back to client', err)
      }
      return await getMyWatchRooms()
    },
    { revalidateOnFocus: true }
  )

  const ownedRooms = (rooms ?? []).filter((room) => room.role === 'owner')
  const invitedRooms = (rooms ?? []).filter((room) => room.role === 'participant')

  const showNotice = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(''), 3000)
  }

  const handleDeleteOrLeave = async (room: WatchRoomSummary) => {
    const isOwner = room.role === 'owner'
    const confirmMsg = isOwner
      ? `Voulez-vous vraiment supprimer le salon « ${room.title} » ?`
      : `Voulez-vous vraiment quitter le salon « ${room.title} » ?`

    if (!window.confirm(confirmMsg)) return

    try {
      const res = await fetch(`/api/watch/rooms?id=${room.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Échec')
      showNotice(isOwner ? 'Salon supprimé avec succès.' : 'Vous avez quitté le salon.')
      await mutate()
    } catch {
      showNotice('Impossible de terminer l’action.')
    }
  }

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const inputVal = join.trim()
    if (!inputVal) return

    setJoining(true)
    try {
      const res = await fetch('/api/watch/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: inputVal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Salon introuvable')

      showNotice(`Vous avez rejoint « ${data.title} » !`)
      await mutate()
      router.push(`/watch/${data.roomId}`)
    } catch (err: any) {
      showNotice(err.message || 'Impossible de rejoindre ce salon.')
    } finally {
      setJoining(false)
    }
  }

  const totalRooms = (rooms ?? []).length

  return (
    <Layout eyebrow="Watch Together" title="Mes séances en direct">
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-base leading-7 text-[#a7aaa7]">
          Retrouvez toutes vos séances synchronisées avec Supabase : celles que vous avez créées et celles où vous êtes invité.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#d8ff45] px-6 py-3 font-semibold text-black transition hover:brightness-105"
        >
          <Play size={18} aria-hidden="true" /> Créer un salon
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-2 border-b border-white/10" role="tablist" aria-label="Filtres des salons">
        <button
          role="tab"
          aria-selected={tab === 'all'}
          onClick={() => setTab('all')}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
            tab === 'all' ? 'border-[#d8ff45] text-[#d8ff45]' : 'border-transparent text-[#a7aaa7] hover:text-white'
          }`}
        >
          Toutes les séances ({totalRooms})
        </button>
        <button
          role="tab"
          aria-selected={tab === 'owned'}
          onClick={() => setTab('owned')}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
            tab === 'owned' ? 'border-[#d8ff45] text-[#d8ff45]' : 'border-transparent text-[#a7aaa7] hover:text-white'
          }`}
        >
          Mes salons créés ({ownedRooms.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === 'invited'}
          onClick={() => setTab('invited')}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
            tab === 'invited' ? 'border-[#d8ff45] text-[#d8ff45]' : 'border-transparent text-[#a7aaa7] hover:text-white'
          }`}
        >
          Salons où je suis invité ({invitedRooms.length})
        </button>
      </div>

      {notice && (
        <div role="status" className="mt-5 rounded-2xl bg-[#d8ff45]/15 border border-[#d8ff45]/30 px-5 py-3 text-sm font-medium text-[#d8ff45]">
          {notice}
        </div>
      )}

      {roomsError && (
        <p role="alert" className="mt-5 rounded-2xl bg-red-400/10 border border-red-400/20 px-5 py-3 text-sm text-red-200">
          Impossible de synchroniser vos salons. Réessayez dans un instant.
        </p>
      )}

      {roomsLoading && (
        <div className="mt-10 flex items-center justify-center gap-3 py-10 text-sm text-[#a7aaa7]">
          <span className="size-4 animate-spin rounded-full border-2 border-[#d8ff45] border-t-transparent" />
          Chargement de vos séances depuis Supabase…
        </div>
      )}

      {!roomsLoading && totalRooms === 0 && (
        <div className="mt-8">
          <EmptySalons onCreate={() => setOpen(true)} />
        </div>
      )}

      {!roomsLoading && totalRooms > 0 && (
        <div className="mt-8 space-y-10" aria-live="polite">
          {/* Section 1: Salons créés */}
          {(tab === 'all' || tab === 'owned') && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">Mes salons créés</h2>
                  <span className="rounded-full bg-[#d8ff45]/20 px-2.5 py-0.5 text-xs font-semibold text-[#d8ff45]">
                    {ownedRooms.length}
                  </span>
                </div>
              </div>

              {ownedRooms.length ? (
                <div className="flex flex-col gap-3">
                  {ownedRooms.map((room) => (
                    <RoomCard key={`owned-${room.id}`} room={room} onNotice={showNotice} onDelete={handleDeleteOrLeave} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-[#a7aaa7]">
                  Vous n’avez pas encore créé de salon. Cliquez sur « Créer un salon » ci-dessus.
                </div>
              )}
            </section>
          )}

          {/* Section 2: Salons où je suis invité */}
          {(tab === 'all' || tab === 'invited') && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">Salons où je suis invité</h2>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/80">
                    {invitedRooms.length}
                  </span>
                </div>
              </div>

              {invitedRooms.length ? (
                <div className="flex flex-col gap-3">
                  {invitedRooms.map((room) => (
                    <RoomCard key={`invited-${room.id}`} room={room} onNotice={showNotice} onDelete={handleDeleteOrLeave} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-[#a7aaa7]">
                  Les salons auxquels vos amis vous ont invité ou que vous rejoignez apparaîtront ici.
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Join room input */}
      <form onSubmit={handleJoinSubmit} className="mt-12 rounded-2xl border border-white/10 bg-white/[.02] p-5">
        <label htmlFor="join-room" className="block text-sm font-semibold text-white">
          Rejoindre une séance existante
        </label>
        <p className="mt-1 text-xs text-[#a7aaa7]">
          Collez le lien complet (ex: {typeof location !== 'undefined' ? location.origin : ''}/watch/...) ou l’identifiant du salon.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="join-room"
            value={join}
            onChange={(e) => setJoin(e.target.value)}
            placeholder="Code ou lien d’invitation"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-[#d8ff45]"
          />
          <button
            type="submit"
            disabled={joining || !join.trim()}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-40"
          >
            {joining ? 'Connexion…' : 'Rejoindre le salon'}
          </button>
        </div>
      </form>

      {open && <CreateRoom onClose={() => setOpen(false)} onSuccess={() => void mutate()} />}
    </Layout>
  )
}

function LegacyPlayer({ room, onChanged }: { room: Room; onChanged: (room: Room) => void }) {
  const [edit, setEdit] = useState(false)
  const [url, setUrl] = useState(room.video_url ?? '')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const save = async () => {
    try {
      const updated = await updateRoomVideo(room.id, url)
      onChanged({ ...room, ...updated })
      setEdit(false)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lien invalide.')
    }
  }

  if (!room.video_url)
    return (
      <div className="grid aspect-video place-items-center rounded-2xl border border-white/10 bg-black p-8 text-center">
        <p className="text-[#a7aaa7]">Cette séance utilise le minuteur partagé, sans vidéo intégrée.</p>
      </div>
    )

  const unsupported = /netflix|primevideo|disney|hbomax|max\.com/i.test(room.video_url)

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
        {unsupported ? (
          <div className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center">
            <p>Cette plateforme ne permet pas la lecture intégrée.</p>
            <a
              href={room.video_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#d8ff45] px-4 py-2 font-semibold text-black"
            >
              Ouvrir sur le site <ExternalLink />
            </a>
          </div>
        ) : room.video_provider !== 'direct' && room.video_provider !== 'hls' && room.video_provider !== 'dash' ? (
          <iframe
            key={
              room.video_provider === 'youtube'
                ? extractYouTubeId(room.video_url)
                : room.video_provider === 'vimeo'
                ? extractVimeoId(room.video_url)
                : room.video_url
            }
            src={
              room.video_provider === 'youtube'
                ? `https://www.youtube-nocookie.com/embed/${extractYouTubeId(room.video_url)}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`
                : room.video_provider === 'vimeo'
                ? `https://player.vimeo.com/video/${extractVimeoId(room.video_url)}`
                : room.video_url
            }
            title={room.title}
            className="size-full"
            allow="autoplay; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <video
            key={room.video_url}
            src={room.video_url}
            controls
            className="size-full"
            aria-label={`Vidéo de ${room.title}`}
          />
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="truncate text-xs text-[#a7aaa7]">{room.video_url}</span>
        <button
          onClick={async () => {
            setCopied(await copyText(room.video_url!))
          }}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs"
        >
          {copied ? 'Copié' : 'Copier'} <Copy size={13} />
        </button>
        {room.host_id && (
          <button onClick={() => setEdit(!edit)} className="rounded-full bg-white/10 px-3 py-2 text-xs">
            Modifier le lien
          </button>
        )}
      </div>
      {edit && (
        <div className="mt-3 flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm"
          />
          <button onClick={save} className="rounded-lg bg-[#d8ff45] px-3 py-2 text-sm font-semibold text-black">
            Enregistrer
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  )
}

export function WatchRoomError() {
  const router = useRouter()
  return (
    <Layout eyebrow="Salon indisponible" title="Impossible de charger ce salon.">
      <div className="mt-8 max-w-xl rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6">
        <p className="text-sm leading-7 text-[#f2f0eb]">
          Une erreur temporaire est survenue lors du chargement de la séance. Réessayez dans un instant.
        </p>
        <button
          onClick={() => router.refresh()}
          className="mt-5 rounded-full bg-[#d8ff45] px-5 py-3 font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff45]"
        >
          Réessayer
        </button>
      </div>
    </Layout>
  )
}

export function WatchRoom({ initialRoom, isHost = false }: { initialRoom: Room; isHost?: boolean }) {
  const [room, setRoom] = useState(initialRoom)
  const [toast, setToast] = useState('')
  const { user, profile } = useAuth()
  const participants = useWatchPresence(room.id, user, profile?.username, isHost)
  const { state: playbackState, position: syncedPosition, command: sendPlaybackCommand } = useWatchParty(room.id, isHost)

  useEffect(() => {
    if (playbackState)
      window.dispatchEvent(
        new CustomEvent('cinetrack:playback-state', {
          detail: { ...playbackState, roomId: room.id, position: syncedPosition },
        })
      )
  }, [playbackState, syncedPosition, room.id])

  useEffect(() => {
    const onLocalPlayback = (event: Event) => {
      if (!isHost) return
      const detail = (event as CustomEvent<{ type: 'play' | 'pause' | 'seek'; position: number }>).detail
      if (detail?.type)
        void sendPlaybackCommand(detail.type, {
          is_playing: detail.type === 'play' ? true : detail.type === 'pause' ? false : undefined,
          position_seconds: detail.position,
        })
    }
    window.addEventListener('cinetrack:local-playback', onLocalPlayback)
    return () => window.removeEventListener('cinetrack:local-playback', onLocalPlayback)
  }, [isHost, sendPlaybackCommand])

  useEffect(() => {
    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          const next = payload.new as Room
          setRoom(next)
          setToast("Le lien de la vidéo a été modifié par l'hôte")
          setTimeout(() => setToast(''), 3500)
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [room.id])

  return (
    <Layout eyebrow="Salon en direct" title={room.title}>
      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <Player
            room={room}
            isHost={isHost}
            onChanged={(next) => setRoom((current) => ({ ...current, ...next }))}
          />
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Connectés dans ce salon</h2>
              <span className="rounded-full bg-[#d8ff45]/15 px-2 py-1 text-xs font-semibold text-[#d8ff45]">
                {participants.length}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {participants.map((participant) => (
                <span
                  key={participant.key}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm"
                >
                  <span className="grid size-6 place-items-center rounded-full bg-[#3b4440] text-[10px] font-semibold">
                    {participant.username.slice(0, 2).toUpperCase()}
                  </span>
                  {participant.username}
                  {participant.isHost && <span className="text-xs text-[#d8ff45]">Créateur</span>}
                </span>
              ))}
            </div>
            {isHost && (
              <>
                <p className="mt-3 text-xs text-[#a7aaa7]">
                  Vous êtes l’hôte du salon. Vous avez le contrôle complet de la lecture et du lien vidéo.
                </p>
                <InviteParticipants roomId={room.id} />
              </>
            )}
          </div>
          {toast && (
            <p role="status" className="mt-3 rounded-xl bg-[#d8ff45]/15 px-4 py-3 text-sm text-[#d8ff45]">
              {toast}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/watch" className="rounded-full bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20">
              Quitter
            </Link>
            <span className="text-xs text-[#a7aaa7]">Synchronisé en direct avec Supabase Realtime</span>
          </div>
        </section>
        <aside className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users size={18} /> Participants
          </div>
          <p className="mt-4 text-sm text-[#a7aaa7]">
            Le salon et son état de lecture sont synchronisés automatiquement pour tous les membres connectés.
          </p>
        </aside>
      </div>
    </Layout>
  )
}

export function WatchInvite({ token }: { token?: string }) {
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  const accept = async () => {
    if (!token) {
      router.push('/watch')
      return
    }
    setJoining(true)
    setError('')
    try {
      const res = await fetch('/api/watch/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Impossible de rejoindre le salon.')
      router.push(`/watch/${data.roomId}`)
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la connexion.')
      setJoining(false)
    }
  }

  return (
    <Layout eyebrow="Invitation Watch Together" title="Rejoignez la séance.">
      <div className="mt-8 max-w-xl rounded-3xl border border-white/10 bg-white/[.04] p-6">
        <div className="flex gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-[#d8ff45]/15 text-[#d8ff45]">
            <Play className="size-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Invitation à regarder ensemble</h2>
            <p className="mt-2 text-sm text-[#a7aaa7]">
              Rejoignez vos proches sur CinéTrack pour une expérience cinéma synchronisée.
            </p>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

        <button
          onClick={accept}
          disabled={joining}
          className="mt-7 flex w-full items-center justify-center rounded-full bg-[#d8ff45] py-3.5 font-semibold text-black transition hover:brightness-105 disabled:opacity-60"
        >
          {joining ? 'Connexion au salon…' : 'Rejoindre le salon'}
        </button>
      </div>
    </Layout>
  )
}
