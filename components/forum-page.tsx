'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useState } from 'react'
import { MessageCircle, Pencil, Plus, Search, Send, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { FORUM_CATEGORIES, maskForumInsults, type ForumCategory } from '@/lib/forum-types'

type ForumTopic = {
  id: string
  title: string
  content: string
  category: ForumCategory
  author_id: string
  author_username: string
  created_at: string
  updated_at?: string
  reply_count: number
}

export default function ForumPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [topics, setTopics] = useState<ForumTopic[]>([])
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'Toutes' | ForumCategory>('Toutes')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Discussion générale')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadTopics(showLoading = false) {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch('/api/forum', { cache: 'no-store' })
      const data = await response.json() as { topics?: ForumTopic[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'Impossible de charger les discussions.')
      setTopics(data.topics ?? [])
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les discussions.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const refresh = () => {
      if (active && document.visibilityState === 'visible') void loadTopics()
    }
    void loadTopics(true)
    const interval = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  function openForm(topic?: ForumTopic) {
    setEditingId(topic?.id ?? null)
    setTitle(topic?.title ?? '')
    setContent(topic?.content ?? '')
    setCategory(topic?.category ?? 'Discussion générale')
    setError(null)
    setShowForm(true)
  }

  async function createTopic(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    if (!title.trim() || !content.trim()) {
      setError('Ajoutez un titre et un message.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(editingId ? `/api/forum/${editingId}` : '/api/forum', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'La discussion n’a pas pu être enregistrée.')
      setShowForm(false)
      setEditingId(null)
      await loadTopics()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'La discussion n’a pas pu être enregistrée.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTopic(topic: ForumTopic) {
    if (!window.confirm(`Supprimer « ${maskForumInsults(topic.title)} » et toutes ses réponses ?`)) return
    setError(null)
    try {
      const response = await fetch(`/api/forum/${topic.id}`, { method: 'DELETE' })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Impossible de supprimer la discussion.')
      setTopics(current => current.filter(item => item.id !== topic.id))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Impossible de supprimer la discussion.')
    }
  }

  const visibleTopics = topics.filter(topic =>
    (selectedCategory === 'Toutes' || topic.category === selectedCategory) &&
    `${topic.title} ${topic.content} ${topic.category} ${topic.author_username}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground">

      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-medium text-primary">Communauté</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Forum cinéma</h1><p className="mt-3 text-muted-foreground">Partagez vos avis, découvertes et recommandations.</p></div>
          {!authLoading && <button onClick={() => user ? (showForm ? setShowForm(false) : openForm()) : (window.location.href = '/auth/login?next=/forum')} className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"><Plus className="size-4" />Nouvelle discussion</button>}
        </div>

        {showForm && <form onSubmit={createTopic} className="mt-8 rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">{editingId ? 'Modifier la discussion' : 'Nouvelle discussion'}</h2>
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <label className="text-sm font-medium">Titre<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3" placeholder="De quoi voulez-vous parler ?" /></label>
            <label className="text-sm font-medium">Catégorie<select value={category} onChange={e => setCategory(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3">{FORUM_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label>
          </div>
          <label className="mt-4 block text-sm font-medium">Votre message<textarea required maxLength={5000} rows={5} value={content} onChange={e => setContent(e.target.value)} className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-4 py-3" /></label>
          <div className="mt-4 flex gap-2"><button disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Send className="size-4" />{saving ? 'Publication...' : editingId ? 'Enregistrer' : 'Publier'}</button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm">Annuler</button></div>
        </form>}

        <div className="mt-8 flex items-center gap-3 rounded-lg border border-border bg-card px-4"><Search className="size-5 text-muted-foreground" /><input value={query} onChange={e => setQuery(e.target.value)} className="flex-1 bg-transparent py-3 outline-none" placeholder="Rechercher une discussion" /></div>
        <div className="mt-4 flex gap-2 overflow-x-auto border-b border-border" role="tablist" aria-label="Catégories du forum">
          {(['Toutes', ...FORUM_CATEGORIES] as const).map(value => <button key={value} role="tab" aria-selected={selectedCategory === value} onClick={() => setSelectedCategory(value)} className={`shrink-0 border-b-2 px-3 py-3 text-sm ${selectedCategory === value ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{value}</button>)}
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 grid gap-3">
          {loading ? <p className="py-12 text-center text-muted-foreground">Chargement des discussions...</p> : visibleTopics.length === 0 ? <div className="rounded-lg border border-dashed border-border py-14 text-center"><MessageCircle className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">Aucune discussion pour le moment</h2><p className="mt-1 text-sm text-muted-foreground">Soyez la première personne à lancer la conversation.</p></div> : visibleTopics.map(topic => {
            const canManage = Boolean(user && (user.id === topic.author_id || profile?.is_moderator))
            return <article key={topic.id} className="rounded-lg border border-border bg-card p-5 transition hover:border-primary/50">
              <div className="flex items-start justify-between gap-4"><div className="min-w-0"><span className="bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{topic.category}</span><Link href={`/forum/${topic.id}`} className="mt-3 block text-lg font-semibold hover:text-primary">{maskForumInsults(topic.title)}</Link><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{maskForumInsults(topic.content)}</p></div><div className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground"><MessageCircle className="size-4" />{topic.reply_count}</div></div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><p className="text-xs text-muted-foreground">{maskForumInsults(topic.author_username)} · {new Date(topic.created_at).toLocaleDateString('fr-FR')}</p>{canManage && <div className="flex gap-1"><button aria-label="Modifier la discussion" title="Modifier" onClick={() => openForm(topic)} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-4" /></button><button aria-label="Supprimer la discussion" title="Supprimer" onClick={() => void deleteTopic(topic)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></div>}</div>
            </article>
          })}
        </div>
      </div>
    </main>
  )
}
