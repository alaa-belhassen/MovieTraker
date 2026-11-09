'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Check, Pencil, Send, Trash2, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { FORUM_CATEGORIES, type ForumCategory } from '@/lib/forum-types'

type Topic = { id: string; title: string; content: string; category: ForumCategory; author_id: string; author_username: string; created_at: string; updated_at?: string }
type Reply = { id: string; topic_id: string; content: string; author_id: string; author_username: string; created_at: string; updated_at?: string }

export default function ForumDetail({ topicId }: { topicId: string }) {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingTopic, setEditingTopic] = useState(false)
  const [topicTitle, setTopicTitle] = useState('')
  const [topicContent, setTopicContent] = useState('')
  const [topicCategory, setTopicCategory] = useState<ForumCategory>('Discussion générale')
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')

  async function loadTopic() {
    try {
      const response = await fetch(`/api/forum/${topicId}`, { cache: 'no-store' })
      const data = await response.json() as { discussion?: Topic & { replies: Reply[] }; error?: string }
      if (!response.ok) throw new Error(data.error || 'Impossible de charger cette discussion.')
      setTopic(data.discussion ?? null)
      setReplies(data.discussion?.replies ?? [])
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger cette discussion.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    void loadTopic()
    const interval = window.setInterval(() => { if (active) void loadTopic() }, 2500)
    return () => { active = false; window.clearInterval(interval) }
  }, [topicId])

  async function addReply(event: FormEvent) {
    event.preventDefault()
    if (!user || !message.trim()) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/forum/${topicId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Votre réponse n’a pas pu être publiée.')
      setMessage('')
      await loadTopic()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Votre réponse n’a pas pu être publiée.')
    } finally {
      setSaving(false)
    }
  }

  async function saveTopic(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/forum/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: topicTitle, content: topicContent, category: topicCategory }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'La discussion n’a pas pu être modifiée.')
      setEditingTopic(false)
      await loadTopic()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'La discussion n’a pas pu être modifiée.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTopic() {
    if (!window.confirm('Supprimer cette discussion et toutes ses réponses ?')) return
    const response = await fetch(`/api/forum/${topicId}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json() as { error?: string }
      setError(data.error || 'Impossible de supprimer la discussion.')
      return
    }
    router.replace('/forum')
  }

  async function saveReply(event: FormEvent) {
    event.preventDefault()
    if (!editingReplyId) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/forum/replies/${editingReplyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyDraft }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'La réponse n’a pas pu être modifiée.')
      setEditingReplyId(null)
      await loadTopic()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'La réponse n’a pas pu être modifiée.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteReply(replyId: string) {
    const response = await fetch(`/api/forum/replies/${replyId}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json() as { error?: string }
      setError(data.error || 'Impossible de supprimer la réponse.')
      return
    }
    setReplies(current => current.filter(reply => reply.id !== replyId))
  }

  const canManageTopic = Boolean(user && topic && (user.id === topic.author_id || profile?.is_moderator))

  return <main className="min-h-screen bg-background pb-24 text-foreground"><header className="border-b border-border/60 bg-background/90"><div className="mx-auto flex h-18 max-w-4xl items-center px-5 md:px-8"><Link href="/" className="font-bold">Ciné<span className="text-primary">Track</span></Link><Link href="/forum" className="ml-auto text-sm text-muted-foreground">Retour au forum</Link></div></header><div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
    <Link href="/forum" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Toutes les discussions</Link>
    {loading ? <p className="py-16 text-center text-muted-foreground">Chargement...</p> : !topic ? <div className="py-16 text-center"><h1 className="text-2xl font-semibold">Discussion introuvable</h1><Link href="/forum" className="mt-4 inline-block text-primary">Retourner au forum</Link></div> : <>
      {editingTopic ? <form onSubmit={saveTopic} className="mt-6 rounded-lg border border-border bg-card p-5 md:p-7"><label className="block text-sm font-medium">Titre<input required maxLength={120} value={topicTitle} onChange={event => setTopicTitle(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3" /></label><label className="mt-4 block text-sm font-medium">Catégorie<select value={topicCategory} onChange={event => setTopicCategory(event.target.value as ForumCategory)} className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3">{FORUM_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label><label className="mt-4 block text-sm font-medium">Message<textarea required maxLength={5000} rows={6} value={topicContent} onChange={event => setTopicContent(event.target.value)} className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-4 py-3" /></label><div className="mt-4 flex gap-2"><button disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Check className="size-4" />Enregistrer</button><button type="button" onClick={() => setEditingTopic(false)} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"><X className="size-4" />Annuler</button></div></form> : <article className="mt-6 rounded-lg border border-border bg-card p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{topic.category}</span><h1 className="mt-4 text-3xl font-semibold tracking-tight">{topic.title}</h1></div>{canManageTopic && <div className="flex gap-1"><button aria-label="Modifier la discussion" title="Modifier" onClick={() => { setTopicTitle(topic.title); setTopicContent(topic.content); setTopicCategory(topic.category); setEditingTopic(true) }} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-4" /></button><button aria-label="Supprimer la discussion" title="Supprimer" onClick={() => void deleteTopic()} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></div>}</div><p className="mt-5 whitespace-pre-wrap leading-7 text-muted-foreground">{topic.content}</p><p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">{topic.author_username} · {new Date(topic.created_at).toLocaleString('fr-FR')}{topic.updated_at ? ' · modifié' : ''}</p></article>}
      <section className="mt-8"><h2 className="text-xl font-semibold">Réponses ({replies.length})</h2><div className="mt-4 grid gap-3">{replies.length === 0 ? <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">Soyez le premier à répondre.</p> : replies.map(reply => {
        const canManageReply = Boolean(user && (user.id === reply.author_id || profile?.is_moderator))
        return <article key={reply.id} className="rounded-lg border border-border bg-card p-5">{editingReplyId === reply.id ? <form onSubmit={saveReply}><label className="text-sm font-medium">Modifier votre réponse<textarea required maxLength={2000} rows={4} value={replyDraft} onChange={event => setReplyDraft(event.target.value)} className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-4 py-3" /></label><div className="mt-3 flex gap-2"><button disabled={saving} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Enregistrer</button><button type="button" onClick={() => setEditingReplyId(null)} className="rounded-lg border border-border px-3 py-2 text-sm">Annuler</button></div></form> : <><p className="whitespace-pre-wrap leading-7">{reply.content}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><p className="text-xs text-muted-foreground">{reply.author_username} · {new Date(reply.created_at).toLocaleString('fr-FR')}{reply.updated_at ? ' · modifiée' : ''}</p>{canManageReply && <div className="flex gap-1"><button aria-label="Modifier la réponse" title="Modifier" onClick={() => { setEditingReplyId(reply.id); setReplyDraft(reply.content) }} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-4" /></button><button aria-label="Supprimer la réponse" title="Supprimer" onClick={() => void deleteReply(reply.id)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></div>}</div></>}</article>
      })}</div></section>
      {!authLoading && (user ? <form onSubmit={addReply} className="mt-8 rounded-lg border border-border bg-card p-5"><label className="text-sm font-medium">Votre réponse<textarea required maxLength={2000} rows={4} value={message} onChange={e => setMessage(e.target.value)} className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-4 py-3" /></label><button disabled={saving} className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Send className="size-4" />{saving ? 'Publication...' : 'Répondre'}</button></form> : <Link href={`/auth/login?next=/forum/${topicId}`} className="mt-8 block rounded-lg border border-border bg-card p-5 text-center font-medium text-primary">Connectez-vous pour répondre</Link>)}
    </>}
    {error && <p role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
  </div></main>
}
