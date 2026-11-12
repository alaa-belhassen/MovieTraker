import Link from 'next/link'
import { getPopularActors, getTrendingActors } from '@/lib/tmdb'
import { BrowseShell, PeopleGrid } from '@/components/browse-grid'

export default async function ActorsPage() {
  const [trending, popular] = await Promise.all([getTrendingActors(), getPopularActors()])
  const people = [...trending.results, ...popular.results].filter((person, index, list) => list.findIndex(item => item.id === person.id) === index)
  return (
    <BrowseShell title="Acteurs">
      <div className="mb-8 flex flex-wrap gap-3">
        <Link href="/search" className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Rechercher un acteur</Link>
        <Link href="/acteurs-favoris" className="rounded-full bg-[#d8ff45] px-4 py-2 text-sm font-semibold text-black">Acteurs suivis</Link>
      </div>
      <PeopleGrid people={people} />
    </BrowseShell>
  )
}
