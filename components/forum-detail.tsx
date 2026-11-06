'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase/client'

interface Topic { id: string; title: string; content: string; category: string; author_id: string | null; created_at: string }
interface Reply { id: string; topic_id: string; content: string; author_id: string | null; created_at: string }

export default function ForumDetail({ topicId }: { topicId: string }) {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadTopic() {
    setLoading(true)
    const [{ data: topicData, error: topicError }, { data: replyData, error: replyError }] = await Promise.all([
      supabase.from('forum_topics').select('*').eq('id', topicId).maybeSingle(),
      supabase.from('forum_replies').select('*').eq('topic_id', topicId).order('created_at', { ascending: true }),
    ])
    if (topicError || replyError) setError('Impossible de charger cette discussion.')
    else setTopic((topicData as Topic | null) ?? null)
    setReplies((replyData ?? []) as Reply[])
    setLoading(false)
  }

  useEffect(() => { void loadTopic() }, [topicId])

  async function addReply(event: FormEvent) {
    event.preventDefault()
    if (!user || !message.trim()) return
    setSaving(true)
    setError(null)
    const { error: insertError } = await supabase.from('forum_replies').insert({ topic_id: topicId, content: message.trim(), author_id: user.id })
    setSaving(false)
    if (insertError) { setError('Votre réponse n’a pas pu être publiée.'); return }
    setMessage('')
    await loadTopic()
  }

  return <main className="min-h-screen bg-background pb-24 text-foreground"><header className="border-b border-border/60 bg-background/90"><div className="mx-auto flex h-18 max-w-4xl items-center px-5 md:px-8"><Link href="/" className="font-bold">Ciné<span className="text-primary">Track</span></Link><Link href="/forum" className="ml-auto text-sm text-muted-foreground">Retour au forum</Link></div></header><div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
    <Link href="/forum" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Toutes les discussions</Link>
    {loading ? <p className="py-16 text-center text-muted-foreground">Chargement...</p> : !topic ? <div className="py-16 text-center"><h1 className="text-2xl font-semibold">Discussion introuvable</h1><Link href="/forum" className="mt-4 inline-block text-primary">Retourner au forum</Link></div> : <>
      <article className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-7"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{topic.category}</span><h1 className="mt-4 text-3xl font-semibold tracking-tight">{topic.title}</h1><p className="mt-5 whitespace-pre-wrap leading-7 text-muted-foreground">{topic.content}</p><p className="mt-6 text-xs text-muted-foreground">Publié le {new Date(topic.created_at).toLocaleDateString('fr-FR')}</p></article>
      <section className="mt-8"><h2 className="text-xl font-semibold">Réponses ({replies.length})</h2><div className="mt-4 grid gap-3">{replies.length === 0 ? <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">Soyez le premier à répondre.</p> : replies.map(reply => <article key={reply.id} className="rounded-2xl border border-border bg-card p-5"><p className="whitespace-pre-wrap leading-7">{reply.content}</p><p className="mt-4 text-xs text-muted-foreground">{new Date(reply.created_at).toLocaleDateString('fr-FR')}</p></article>)}</div></section>
      {!authLoading && (user ? <form onSubmit={addReply} className="mt-8 rounded-2xl border border-border bg-card p-5"><label className="text-sm font-medium">Votre réponse<textarea required rows={4} value={message} onChange={e => setMessage(e.target.value)} className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-4 py-3" /></label><button disabled={saving} className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Send className="size-4" />{saving ? 'Publication...' : 'Répondre'}</button></form> : <Link href={`/auth/login?next=/forum/${topicId}`} className="mt-8 block rounded-2xl border border-border bg-card p-5 text-center font-medium text-primary">Connectez-vous pour répondre</Link>)}
    </>}
    {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
  </div></main>
}
