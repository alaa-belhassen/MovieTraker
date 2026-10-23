'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Film, House, Search, Tags, Users, LogIn, LogOut, Share2, MessageSquare, PlayCircle, Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'

const publicItems = [
  { href: '/', label: 'Accueil', icon: House },
  { href: '/movies', label: 'Films', icon: Film },
  { href: '/genres', label: 'Genres', icon: Tags },
  { href: '/actors', label: 'Acteurs', icon: Users },
  { href: '/search', label: 'Recherche', icon: Search },
]

const authenticatedItems = [
  { href: '/acteurs-favoris', label: 'Suivis', icon: Heart },
  { href: '/listes-partagees', label: 'Listes partagées', icon: Share2 },
  { href: '/forum', label: 'Forum', icon: MessageSquare },
  { href: '/watch', label: 'Watch Together', icon: PlayCircle },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [query, setQuery] = useState('')
  const items = user ? [...publicItems, ...authenticatedItems] : publicItems

  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 40); onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll) }, [])
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`) }
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  return <>
    <header className={`sticky inset-x-0 top-0 z-40 border-b transition-colors duration-200 ${scrolled ? 'border-white/10 bg-[#080909]/90 backdrop-blur-xl' : 'border-white/10 bg-[#080909]/80 backdrop-blur-xl'}`}>
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff45]"><Film className="text-[#d8ff45]" aria-hidden="true" />MovieTracker</Link>
        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Navigation principale">{items.map(({ href, label, icon: Icon }) => { const active = isActive(href); return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff45] ${active ? 'font-semibold text-white' : 'text-white/55'}`}><Icon aria-hidden="true" />{label}{active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[#d8ff45] shadow-[0_0_12px_#d8ff45]" />}</Link> })}</nav>
        <div className="ml-auto flex items-center gap-2"><form onSubmit={submit} className="hidden items-center rounded-full border border-white/10 bg-white/5 px-3 focus-within:border-[#d8ff45] sm:flex"><Search aria-hidden="true" /><label htmlFor="global-search" className="sr-only">Rechercher</label><input id="global-search" value={query} onChange={e => setQuery(e.target.value)} className="w-28 bg-transparent px-2 py-2 text-sm outline-none transition focus:w-44" placeholder="Rechercher" /></form>{user ? <button type="button" onClick={() => void signOut()} className="hidden items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff45] sm:flex"><LogOut aria-hidden="true" />Se déconnecter</button> : <Link href="/auth/login" className="hidden items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff45] sm:flex"><LogIn aria-hidden="true" />Se connecter</Link>}</div>
      </div>
    </header>
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-[#080909]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Navigation mobile">{items.map(({ href, label, icon: Icon }) => { const active = isActive(href); return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 py-3 text-[10px] active:scale-95 ${active ? 'text-[#d8ff45]' : 'text-white/50'}`}><Icon aria-hidden="true" /><span>{label}</span>{active && <span className="absolute top-1 size-1 rounded-full bg-[#d8ff45]" />}</Link> })}</nav>
  </>
}
