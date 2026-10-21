import Link from 'next/link'

export const metadata = { title: 'Confidentialité — CinéTrack', description: 'Vos droits et la gestion de vos données sur CinéTrack.' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground md:px-8 md:py-16">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">← Retour à CinéTrack</Link>
        <p className="mt-12 text-sm font-medium text-primary">Vos données, vos choix</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Politique de confidentialité</h1>
        <p className="mt-5 leading-7 text-muted-foreground">CinéTrack conserve uniquement les informations nécessaires à votre espace personnel : compte, listes, notes, commentaires et préférences.</p>
        <div className="mt-10 flex flex-col gap-8">
          <section><h2 className="text-xl font-semibold">Vos droits RGPD</h2><p className="mt-3 leading-7 text-muted-foreground">Vous pouvez accéder à vos données, demander une copie dans un format portable, les corriger ou demander leur suppression. Les données publiques du forum peuvent être anonymisées lorsque cela est nécessaire à l’intégrité des discussions.</p></section>
          <section><h2 className="text-xl font-semibold">Exporter vos données</h2><p className="mt-3 leading-7 text-muted-foreground">Depuis votre profil, utilisez « Exporter mes données » pour télécharger une copie de vos informations personnelles et de votre activité CinéTrack.</p><button className="mt-4 rounded-xl border border-border px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Exporter mes données</button></section>
          <section><h2 className="text-xl font-semibold">Supprimer votre compte</h2><p className="mt-3 leading-7 text-muted-foreground">La suppression est définitive. Elle retire votre compte, vos listes privées et vos votes. Vos contributions publiques peuvent être conservées sous un pseudonyme anonymisé.</p><Link href="/profil" className="mt-4 inline-flex rounded-xl border border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Gérer mon compte</Link></section>
          <section><h2 className="text-xl font-semibold">Contact</h2><p className="mt-3 leading-7 text-muted-foreground">Pour toute demande liée à vos droits, contactez l’équipe CinéTrack depuis votre espace personnel.</p></section>
        </div>
      </article>
    </main>
  )
}
