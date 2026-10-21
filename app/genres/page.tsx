import Link from 'next/link'
import { getGenres } from '@/lib/tmdb'
import { BrowseShell } from '@/components/browse-grid'
export default async function GenresPage() { const { genres } = await getGenres(); return <BrowseShell title="Genres"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{genres.map((genre, index) => <Link key={`${genre.id}-${index}`} href={`/genre/${genre.id}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-xl font-semibold transition hover:border-[#d8ff45]/50 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff45]"><span className="mr-3 text-sm text-[#d8ff45]">{String(index + 1).padStart(2, '0')}</span>{genre.name}</Link>)}</div></BrowseShell> }
