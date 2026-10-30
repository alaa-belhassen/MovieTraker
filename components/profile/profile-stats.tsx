'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Check, Clock3, Heart, Star } from 'lucide-react'
import { formatDuration, type ProfileStats } from '@/lib/profile-stats'

type StatsResponse = ProfileStats & { partial?: boolean }

const fetcher = async (url: string): Promise<StatsResponse> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><div className="text-primary">{icon}</div><div className="mt-4 truncate text-xl font-semibold">{value}</div><div className="mt-1 text-sm text-muted-foreground">{label}</div></div>
}

export function ProfileStatsSection() {
  const { data, error, isLoading, mutate } = useSWR('/api/profile/stats', fetcher, { revalidateOnFocus: false })

  if (isLoading) return <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />)}</div>
  if (error || !data) return <div role="alert" className="mt-10 rounded-2xl border border-border bg-card p-6 text-sm"><p className="text-muted-foreground">Impossible de charger vos statistiques.</p><button onClick={() => void mutate()} className="mt-3 rounded-xl border border-border px-4 py-2">Réessayer</button></div>

  if (data.watchedCount === 0) return <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center"><p className="font-medium">Aucun film vu pour l’instant</p><p className="mt-1 text-sm text-muted-foreground">Marquez un film comme « Déjà vu » pour voir vos statistiques apparaître ici.</p><Link href="/recherche" className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Chercher un film</Link></div>

  return <>
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat icon={<Clock3 />} value={formatDuration(data.totalMinutes)} label="Temps de visionnage" />
      <Stat icon={<Heart />} value={data.favoriteGenre ?? '—'} label="Genre préféré" />
      <Stat icon={<Star />} value={data.bestRated?.title ?? '—'} label={data.bestRated ? `Film le mieux noté (${data.bestRated.rating})` : 'Film le mieux noté'} />
      <Stat icon={<Check />} value={String(data.watchedCount)} label="Films vus" />
    </div>
    {data.partial && <p className="mt-3 text-xs text-muted-foreground">Certaines données de films sont momentanément indisponibles : les statistiques peuvent être incomplètes.</p>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Votre activité</h2>
        <p className="text-xs text-muted-foreground">Heures regardées sur 6 mois</p>
        <div className="mt-5 h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.monthly}><XAxis dataKey="month" stroke="currentColor" fontSize={12} /><Tooltip formatter={(v) => [`${v} h`, 'Visionnage']} contentStyle={{ background: 'oklch(0.2 0 0)', border: '1px solid oklch(0.3 0 0)', borderRadius: 12 }} /><Area type="monotone" dataKey="hours" stroke="oklch(0.72 0.15 55)" fill="oklch(0.72 0.15 55 / .16)" /></AreaChart></ResponsiveContainer></div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Historique récent</h2>
        <div className="mt-4 flex flex-col gap-4">{data.recent.map((m) => <Link href={`/film/${m.id}`} key={m.id} className="flex items-center gap-3">{m.poster_path ? <img src={`https://image.tmdb.org/t/p/w185${m.poster_path}`} alt={`Affiche de ${m.title}`} className="size-12 rounded-lg object-cover" /> : <span className="size-12 rounded-lg bg-muted" aria-hidden />}<span className="min-w-0 flex-1 truncate text-sm">{m.title}</span><span className="text-xs text-muted-foreground">{m.date ? new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</span></Link>)}</div>
      </div>
    </div>
  </>
}
