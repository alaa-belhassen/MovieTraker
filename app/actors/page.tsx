import { getPopularActors, getTrendingActors } from '@/lib/tmdb'
import { BrowseShell, PeopleGrid } from '@/components/browse-grid'
export default async function ActorsPage() { const [trending, popular] = await Promise.all([getTrendingActors(), getPopularActors()]); const people = [...trending.results, ...popular.results].filter((person, index, list) => list.findIndex(item => item.id === person.id) === index); return <BrowseShell title="Acteurs"><PeopleGrid people={people} /></BrowseShell> }
