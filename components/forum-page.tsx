'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { MessageCircle, Plus, Search, Send } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase/client'

interface ForumTopic {
  id: string
  title: string
  content: string
  category?: string
  author_id: string | null
  created_at: string
}

export default function ForumPage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [topics, setTopics] = useState<ForumTopic[]>([])
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({})
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Discussion générale')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadTopics() {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('forum_topics')
      .select('*')
      .order('created_at', { ascending: false })
    if (!loadError) {
      const rows = (data ?? []) as ForumTopic[]
      setTopics(rows)
      const counts: Record<string, number> = {}
      await Promise.all(rows.map(async (topic) => {
        const { count } = await supabase.from('forum_replies').select('*', { count: 'exact', head: true }).eq('topic_id', topic.id)
        counts[topic.id] = count ?? 0
      }))
      setReplyCounts(counts)
    } else {
      setError('Impossible de charger les discussions.')
    }
    setLoading(false)
  }

  useEffect(() => { void loadTopics() }, [])

  async function createTopic(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    if (!title.trim() || !content.trim()) {
      setError('Ajoutez un titre et un message.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: insertError } = await supabase.from('forum_topics').insert({
      title: title.trim(), content: content.trim(), author_id: user.id,
    })
    setSaving(false)
    if (insertError) {
      setError(`La discussion n’a pas pu être créée : ${insertError.message}`)
      return
    }
    setTitle('')
    setContent('')
    setShowForm(false)
    await loadTopics()
  }

  const visibleTopics = topics.filter(topic =>
    `${topic.title} ${topic.content} ${topic.category ?? ''}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground">
      <header className="border-b border-border/60 bg-background/90">
        <div className="mx-auto flex h-18 max-w-5xl items-center px-5 md:px-8">
          <Link href="/" className="font-bold">Ciné<span className="text-primary">Track</span></Link>
          <nav className="ml-auto hidden gap-6 text-sm text-muted-foreground sm:flex"><Link href="/">Accueil</Link><Link href="/forum" className="font-medium text-foreground">Forum</Link><Link href="/mes-listes">Mes listes</Link></nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-sm font-medium text-primary">Communauté</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Forum cinéma</h1><p className="mt-3 text-muted-foreground">Partagez vos avis, découvertes et recommandations.</p></div>
          {!authLoading && <button onClick={() => user ? setShowForm(value => !value) : (window.location.href = '/auth/login?next=/forum')} className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"><Plus className="size-4" />Nouvelle discussion</button>}
        </div>

        {showForm && <form onSubmit={createTopic} className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <label className="text-sm font-medium">Titre<input required value={title} onChange={e => setTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3" placeholder="De quoi voulez-vous parler ?" /></label>
            <label className="text-sm font-medium">Catégorie<select value={category} onChange={e => setCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3"><option>Discussion générale</option><option>Recommandations</option><option>Critiques</option><option>Séries</option></select></label>
          </div>
          <label className="mt-4 block text-sm font-medium">Votre message<textarea required rows={5} value={content} onChange={e => setContent(e.target.value)} className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-4 py-3" /></label>
          <button disabled={saving} className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Send className="size-4" />{saving ? 'Publication...' : 'Publier'}</button>
        </form>}

        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-card px-4"><Search className="size-5 text-muted-foreground" /><input value={query} onChange={e => setQuery(e.target.value)} className="flex-1 bg-transparent py-3 outline-none" placeholder="Rechercher une discussion" /></div>
        {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 grid gap-3">
          {loading ? <p className="py-12 text-center text-muted-foreground">Chargement des discussions...</p> : visibleTopics.length === 0 ? <div className="rounded-2xl border border-dashed border-border py-14 text-center"><MessageCircle className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">Aucune discussion pour le moment</h2><p className="mt-1 text-sm text-muted-foreground">Soyez la première personne à lancer la conversation.</p></div> : visibleTopics.map(topic => <Link key={topic.id} href={`/forum/${topic.id}`} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50">
            <div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{topic.category ?? 'Discussion générale'}</span><h2 className="mt-3 text-lg font-semibold">{topic.title}</h2><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{topic.content}</p></div><div className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground"><MessageCircle className="size-4" />{replyCounts[topic.id] ?? 0}</div></div>
            <p className="mt-4 text-xs text-muted-foreground">{new Date(topic.created_at).toLocaleDateString('fr-FR')}</p>
          </Link>)}
        </div>
      </div>
    </main>
  )
}
