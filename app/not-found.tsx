import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-center text-foreground">
      <section className="max-w-md">
        <p className="text-7xl font-semibold tracking-[-0.08em] text-primary">404</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Cette page n’existe pas</h1>
        <p className="mt-3 text-muted-foreground">Le film ou la page recherchée est introuvable.</p>
        <Link href="/" className="mt-7 inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Retour à l’accueil</Link>
      </section>
    </main>
  )
}
