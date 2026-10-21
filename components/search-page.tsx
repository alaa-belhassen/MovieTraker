'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Film, Loader2, Search, UserRound } from 'lucide-react'

type Result = { id: number; title?: string; name?: string; poster_path?: string | null; profile_path?: string | null; release_date?: string; known_for_department?: string }

const image = (path: string | null | undefined, size = 'w342') => path ? `https://image.tmdb.org/t/p/${size}${path}` : null

export default function SearchPage({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [submitted, setSubmitted] = useState(initialQuery)
  const [type, setType] = useState<'movie' | 'person'>('movie')
  const [results, setResults] = useState<Result[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!submitted) { setResults([]); setPage(0); return }
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`/api/tmdb/search?q=${encodeURIComponent(submitted)}&type=${type}&page=1`)
      .then(async response => { if (!response.ok) throw new Error('Recherche indisponible'); return response.json() })
      .then(data => { if (!cancelled) { setResults(data.results ?? []); setPage(1); setTotalPages(data.total_pages ?? 0) } })
      .catch(() => { if (!cancelled) setError('Impossible de charger les résultats. Réessayez.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [submitted, type])

  useEffect(() => {
    const node = sentinel.current
    if (!node || !submitted || page === 0 || page >= totalPages || loading) return
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return
      setLoading(true)
      fetch(`/api/tmdb/search?q=${encodeURIComponent(submitted)}&type=${type}&page=${page + 1}`)
        .then(response => response.json())
        .then(data => { setResults(current => [...current, ...(data.results ?? [])]); setPage(page + 1) })
        .finally(() => setLoading(false))
    }, { rootMargin: '500px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [submitted, type, page, totalPages, loading])

  const submit = (event: React.FormEvent) => { event.preventDefault(); setSubmitted(query.trim()) }
  const label = type === 'movie' ? 'films' : 'acteurs'

  return <main className="min-h-screen bg-background pb-12 text-foreground">
    <header className="border-b border-border/60 bg-background/90 backdrop-blur-xl"><div className="mx-auto flex h-18 max-w-7xl items-center gap-5 px-5 md:px-8"><Link href="/" aria-label="Retour à l'accueil" className="rounded-lg p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft className="size-5" /></Link><Link href="/" className="text-lg font-semibold tracking-tight">Ciné<span className="text-primary">Track</span></Link><span className="text-sm text-muted-foreground">Recherche</span></div></header>
    <section className="mx-auto max-w-7xl px-5 py-10 md:px-8"><p className="text-sm font-medium text-primary">Explorer le catalogue</p><h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Rechercher</h1>
      <form onSubmit={submit} className="mt-7 flex max-w-3xl items-center gap-3 rounded-2xl border border-border bg-card p-2 shadow-sm"><Search className="ml-3 size-5 text-muted-foreground" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Titre de film, nom d'acteur..." aria-label="Rechercher" className="min-w-0 flex-1 bg-transparent px-1 py-3 outline-none placeholder:text-muted-foreground" /><button type="submit" className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Chercher</button></form>
      <div className="mt-5 flex gap-2" role="group" aria-label="Type de recherche"><button type="button" onClick={() => setType('movie')} aria-pressed={type === 'movie'} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${type === 'movie' ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}><Film className="size-4" />Films</button><button type="button" onClick={() => setType('person')} aria-pressed={type === 'person'} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${type === 'person' ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}><UserRound className="size-4" />Acteurs</button></div>
      {submitted && <p className="mt-10 text-sm text-muted-foreground">Résultats pour <strong className="text-foreground">{submitted}</strong> · {label}</p>}
      {error && <div role="alert" className="mt-8 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-destructive">{error}</div>}
      {!submitted && <div className="mt-20 text-center text-muted-foreground"><Search className="mx-auto size-10 opacity-40" /><p className="mt-4">Lancez une recherche pour découvrir votre prochain film.</p></div>}
      {submitted && !loading && !results.length && !error && <div className="mt-12 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Aucun résultat pour cette recherche.</div>}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{results.map(result => { const title = result.title ?? result.name ?? 'Sans titre'; const path = type === 'movie' ? `/film/${result.id}` : `/acteur/${result.id}`; const imagePath = image(type === 'movie' ? result.poster_path : result.profile_path, type === 'movie' ? 'w342' : 'w185'); return <Link key={result.id} href={path} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><div className="aspect-[2/3] bg-muted">{imagePath ? <img src={imagePath} alt={type === 'movie' ? `Affiche de ${title}` : `Photo de ${title}`} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-muted-foreground"><Film className="size-8" /></div>}</div><div className="p-3"><h2 className="truncate font-medium">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{type === 'movie' ? (result.release_date?.slice(0, 4) || 'Date inconnue') : (result.known_for_department || 'Acteur')}</p></div></Link> })}</div>
      <div ref={sentinel} className="flex min-h-16 items-center justify-center" aria-live="polite">{loading && <Loader2 className="size-5 animate-spin text-primary" aria-label="Chargement" />}</div>
    </section>
  </main>
}
