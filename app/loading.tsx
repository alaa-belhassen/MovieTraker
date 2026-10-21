export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground md:px-8" aria-busy="true" aria-label="Chargement">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
        <div className="max-w-2xl space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-12 w-3/4 animate-pulse rounded-xl bg-muted" />
          <div className="h-5 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-2xl bg-muted" />)}
        </div>
        <span className="sr-only">Chargement du contenu…</span>
      </div>
    </main>
  )
}
