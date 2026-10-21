'use client'

import Link from 'next/link'
import { Film, Home, List, RefreshCw, Search, Users, Video } from 'lucide-react'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16 text-center">
      <div className="flex max-w-md flex-col items-center gap-6">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-[#d8ff45]/10 text-[#d8ff45]"><Film aria-hidden="true" /></div>
        <div><p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#d8ff45]">CinéTrack</p><h1 className="text-3xl font-bold">Vous êtes hors ligne</h1><p className="mt-3 leading-7 text-muted-foreground">Certaines fonctions ont besoin d&apos;une connexion. Vos pages déjà consultées restent disponibles.</p></div>
        <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-full bg-[#d8ff45] px-5 py-3 font-semibold text-black"><RefreshCw aria-hidden="true" /> Réessayer</button>
        <nav aria-label="Navigation disponible hors ligne" className="grid w-full grid-cols-2 gap-2 border-t border-border pt-5 sm:grid-cols-4">
          <Link href="/" className="flex flex-col items-center gap-2 rounded-xl border border-border px-3 py-3 text-xs font-semibold transition-colors hover:bg-muted focus-visible:bg-muted"><Home aria-hidden="true" className="size-4 text-[#d8ff45]" />Accueil</Link>
          <Link href="/recherche" className="flex flex-col items-center gap-2 rounded-xl border border-border px-3 py-3 text-xs font-semibold transition-colors hover:bg-muted focus-visible:bg-muted"><Search aria-hidden="true" className="size-4 text-[#d8ff45]" />Recherche</Link>
          <Link href="/mes-listes" className="flex flex-col items-center gap-2 rounded-xl border border-border px-3 py-3 text-xs font-semibold transition-colors hover:bg-muted focus-visible:bg-muted"><List aria-hidden="true" className="size-4 text-[#d8ff45]" />Mes listes</Link>
          <Link href="/watch" className="flex flex-col items-center gap-2 rounded-xl border border-border px-3 py-3 text-xs font-semibold transition-colors hover:bg-muted focus-visible:bg-muted"><Video aria-hidden="true" className="size-4 text-[#d8ff45]" />Watch Together</Link>
        </nav>
        <p className="text-xs text-muted-foreground">Ces pages sont accessibles si elles ont déjà été ouvertes sur cet appareil.</p>
      </div>
    </main>
  )
}
