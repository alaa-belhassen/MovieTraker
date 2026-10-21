'use client'

import { useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the fallback quiet for users while preserving the browser's native error tooling.
  }, [])
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-center text-foreground">
      <section className="max-w-md">
        <p className="text-sm font-medium text-primary">CinéTrack</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Une erreur est survenue</h1>
        <p className="mt-3 text-muted-foreground">Le contenu n’a pas pu être chargé. Réessayez ou revenez à l’accueil.</p>
        <button onClick={() => reset()} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <RefreshCw className="size-4" aria-hidden="true" /> Réessayer
        </button>
      </section>
    </main>
  )
}
