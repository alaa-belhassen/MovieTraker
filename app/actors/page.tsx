import Image from 'next/image'
import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, Search, Sparkles, UsersRound } from 'lucide-react'
import { getActorBirthplace, getPopularActors, getTrendingActors, imageUrl } from '@/lib/tmdb'
import { BrowseShell, PeopleGrid } from '@/components/browse-grid'

export default async function ActorsPage() {
  const [trending, popular] = await Promise.all([getTrendingActors(), getPopularActors()])
  const people = [...trending.results, ...popular.results]
    .filter((person, index, list) => list.findIndex(item => item.id === person.id) === index)
    .filter(person => person.adult !== true)
  const candidates = people.filter(person => person.profile_path).slice(0, 8)
  const birthplaceResults = await Promise.allSettled(candidates.map(person => getActorBirthplace(person.id)))
  const koreanBirthplace = /\b(?:south korea|republic of korea|korea|corée(?: du sud)?)\b|대한민국|한국/i
  const featuredPerson = candidates.find((person, index) => {
    const result = birthplaceResults[index]
    if (result.status === 'rejected') {
      console.warn(`[CinéTrack] Impossible de vérifier le lieu de naissance de ${person.name}`, result.reason)
      return false
    }
    return result.value.place_of_birth && !koreanBirthplace.test(result.value.place_of_birth)
  })
  const featuredImage = featuredPerson ? imageUrl(featuredPerson.profile_path) : null

  return (
    <BrowseShell title="Acteurs">
      <section className="relative isolate mb-12 overflow-hidden rounded-[2rem] border border-white/10 bg-[#111411]">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_15%,rgba(216,255,69,0.12),transparent_48%)]" />
        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_0.8fr] lg:gap-12">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d8ff45]/20 bg-[#d8ff45]/[0.07] px-3 py-1.5 text-xs font-medium text-[#d8ff45]">
              <Sparkles aria-hidden="true" className="size-3.5" />
              La sélection du moment
            </span>
            <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Les visages derrière vos films préférés.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/55 sm:text-base">
              Explorez les talents qui font vibrer le grand écran et retrouvez ceux que vous aimez.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-full bg-[#d8ff45] px-5 py-3 text-sm font-semibold text-[#111411] transition hover:bg-[#e5ff83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111411]"
              >
                <Search aria-hidden="true" className="size-4" />
                Rechercher un acteur
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/acteurs-suivis"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white/80 transition hover:border-white/30 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff45]"
              >
                <UsersRound aria-hidden="true" className="size-4" />
                Mes acteurs suivis
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5 text-sm text-white/50">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-[#d8ff45]">
                <UsersRound aria-hidden="true" className="size-4" />
              </span>
              <span><strong className="font-semibold text-white">{people.length}</strong> profils à découvrir</span>
              <ArrowDownRight aria-hidden="true" className="ml-auto size-4 text-white/30" />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div aria-hidden="true" className="absolute -inset-4 rounded-[2rem] bg-[#d8ff45]/[0.06] blur-2xl" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
              {featuredImage && featuredPerson ? (
                <Image
                  src={featuredImage}
                  alt={featuredPerson.name}
                  fill
                  sizes="(max-width: 1024px) 90vw, 40vw"
                  className="object-cover object-top transition duration-700 hover:scale-105"
                  fetchPriority="high"
                />
              ) : null}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#080909] via-[#080909]/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#d8ff45]">À découvrir</p>
                  <p className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                    {featuredPerson?.name ?? 'Les talents du cinéma'}
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    {featuredPerson?.known_for_department ?? 'Une nouvelle sélection chaque jour'}
                  </p>
                </div>
                <span aria-hidden="true" className="mb-1 flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white">
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#d8ff45]">Pour vous</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Talents à découvrir</h2>
        </div>
        <p className="text-sm text-white/45">Tendances et personnalités populaires</p>
      </div>
      {people.length > 0 ? (
        <PeopleGrid people={people} />
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
          <p className="text-lg font-medium">Aucun profil à afficher pour le moment.</p>
          <p className="mt-2 text-sm text-white/50">Essayez de rechercher directement un acteur.</p>
          <Link href="/search" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#d8ff45] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e5ff83]">
            <Search aria-hidden="true" className="size-4" />
            Lancer une recherche
          </Link>
        </div>
      )}
    </BrowseShell>
  )
}
