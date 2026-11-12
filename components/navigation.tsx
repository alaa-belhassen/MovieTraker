'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Film,
  House,
  Search,
  Tags,
  Users,
  LogIn,
  LogOut,
  Share2,
  MessageSquare,
  PlayCircle,
  Bookmark,
  Sparkles,
} from 'lucide-react'
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
  { href: '/mes-listes', label: 'Mes listes', icon: Bookmark },
  { href: '/pour-vous', label: 'Pour vous', icon: Sparkles },
  { href: '/listes-partagees', label: 'Listes partagées', icon: Share2 },
  { href: '/forum', label: 'Forum', icon: MessageSquare },
  { href: '/watch', label: 'Watch Together', icon: PlayCircle },
]
export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, signOut } = useAuth()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const items = user ? [...publicItems, ...authenticatedItems] : publicItems
  const desktopItems = user
    ? [publicItems[0], publicItems[1], publicItems[2], authenticatedItems[3]]
    : publicItems.slice(0, 4)
  const mobileItems = user
    ? [publicItems[0], publicItems[1], publicItems[4], authenticatedItems[3]]
    : [publicItems[0], publicItems[1], publicItems[4], publicItems[2]]
  const extraItems = items.filter(item => !mobileItems.some(mobileItem => mobileItem.href === item.href))
  const profileInitials = (profile?.username ?? user?.email ?? 'Vous').slice(0, 2).toUpperCase()

  useEffect(() => { setMenuOpen(false) }, [pathname])
  const submit = (event: FormEvent) => { event.preventDefault(); if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`) }
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const menu = menuOpen && <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 rounded-xl border border-white/10 bg-[#11130f]/98 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-[4.5rem] sm:w-72">
    <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Explorer</p>
    <div className="grid grid-cols-2 gap-1">{extraItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className={`flex min-w-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/7 ${isActive(href) ? 'bg-white/7 text-[#d8ff45]' : 'text-white/70 hover:text-white'}`}><Icon aria-hidden="true" className="size-4 shrink-0" /><span className="truncate">{label}</span></Link>)}</div>
    {user && <div className="mt-2 border-t border-white/10 pt-2"><button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white/60 transition hover:bg-white/7 hover:text-white"><LogOut aria-hidden="true" className="size-4" />Se déconnecter</button></div>}
  </div>

  return <>
    <header className="sticky inset-x-0 top-0 z-40 border-b border-white/8 bg-[#0c0e0b]/90 backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-5 px-4 sm:px-7">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff45]"><span className="grid size-8 place-items-center rounded-lg bg-[#d8ff45] text-[#11130f]"><Film className="size-[18px]" aria-hidden="true" /></span><span>Movie<span className="text-[#d8ff45]">Tracker</span></span></Link>
        <nav className="hidden h-full items-center gap-1 md:flex" aria-label="Navigation principale">{desktopItems.map(({ href, label }) => { const active = isActive(href); return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`relative flex h-full items-center px-3 text-[13px] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff45] ${active ? 'font-medium text-white' : 'text-white/55'}`}>{label}{active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#d8ff45]" />}</Link> })}</nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <form onSubmit={submit} className="hidden h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 transition focus-within:border-[#d8ff45]/60 sm:flex"><Search aria-hidden="true" className="size-4 text-white/45" /><label htmlFor="global-search" className="sr-only">Rechercher</label><input id="global-search" value={query} onChange={e => setQuery(e.target.value)} className="w-28 bg-transparent text-sm outline-none placeholder:text-white/35 focus:w-36 transition-[width]" placeholder="Rechercher" /></form>
          <Link href="/search" aria-label="Recherche" className="grid size-9 place-items-center rounded-lg text-white/65 transition hover:bg-white/7 hover:text-white sm:hidden"><Search aria-hidden="true" className="size-[18px]" /></Link>
          {user ? <Link href="/profil" aria-label={`Profil de ${profile?.username ?? 'mon compte'}`} aria-current={isActive('/profil') ? 'page' : undefined} className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/8 text-xs font-semibold text-[#d8ff45] transition hover:border-[#d8ff45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff45]">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : profileInitials}</Link> : <Link href="/auth/login" aria-label="Se connecter" className="grid size-9 place-items-center rounded-lg text-white/65 transition hover:bg-white/7 hover:text-[#d8ff45]"><LogIn aria-hidden="true" className="size-[18px]" /><span className="sr-only">Se connecter</span></Link>}
          <button type="button" aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)} className="hidden size-9 place-items-center rounded-lg text-white/65 transition hover:bg-white/7 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff45] md:grid"><Menu aria-hidden="true" className="size-[18px]" /></button>
        </div>
      </div>
    </header>
    {menu}
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#0c0e0b]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Navigation mobile">{mobileItems.map(({ href, label, icon: Icon }) => { const active = isActive(href); const mobileLabel = label === 'Recherche' ? 'Chercher' : label === 'Discussion' ? 'Forum' : label; return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2.5 text-[10px] leading-tight transition active:scale-95 ${active ? 'text-[#d8ff45]' : 'text-white/50 hover:text-white'}`}><Icon aria-hidden="true" className="size-[18px]" /><span className="max-w-full truncate">{mobileLabel}</span>{active && <span className="absolute top-1 size-1 rounded-full bg-[#d8ff45]" />}</Link> })}<button type="button" aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)} className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2.5 text-[10px] transition hover:text-white ${menuOpen ? 'text-[#d8ff45]' : 'text-white/50'}`}><span className="grid size-[18px] place-items-center">{menuOpen ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}</span><span>Plus</span></button></nav>
  </>
}
