import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MovieAiSummary } from '@/components/movie-ai-summary'
import { getMovieDetails, imageUrl } from '@/lib/tmdb'

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const movieId = Number(id)
  if (!Number.isInteger(movieId)) notFound()
  let movie
  try { movie = await getMovieDetails(movieId) } catch (error) { if (error instanceof Error && 'status' in error && (error as { status?: number }).status === 404) notFound(); throw error }
  const poster = imageUrl(movie.poster_path, 'w500')
  const backdrop = imageUrl(movie.backdrop_path, 'w780')
  const trailer = movie.videos?.results.find(video => video.site === 'YouTube' && video.type === 'Trailer')
  const director = movie.credits?.crew.find(member => member.job === 'Director')
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}min` : null
  const providers = movie['watch/providers']?.results?.FR ?? movie['watch/providers']?.results?.US
  const streamingProviders = providers ? Array.from(new Map([...(providers.flatrate ?? []), ...(providers.rent ?? []), ...(providers.buy ?? [])].map(provider => [provider.provider_id, provider])).values()) : []
  return <main className="min-h-screen bg-[#080909] pb-20 text-[#f4f5f2]">
    <section className="relative isolate overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 -z-10 bg-cover bg-center opacity-35" style={backdrop ? { backgroundImage: `linear-gradient(90deg,#080909 12%,rgba(8,9,9,.75),#080909),url(${backdrop})` } : undefined} aria-hidden="true" />
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[260px_1fr] lg:py-20">
        <div className="relative aspect-[2/3] overflow-hidden rounded-3xl bg-white/10">{poster ? <Image src={poster} alt={`Affiche de ${movie.title}`} fill sizes="260px" className="object-cover" priority /> : <span className="flex size-full items-center justify-center p-5 text-center text-white/50">Affiche indisponible</span>}</div>
        <div className="self-end"><p className="text-sm uppercase tracking-[.2em] text-[#d8ff45]">Film</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">{movie.title}</h1>{movie.tagline && <p className="mt-3 italic text-white/60">{movie.tagline}</p>}<div className="mt-5 flex flex-wrap gap-2 text-sm text-white/65"><span>{movie.release_date?.slice(0,4) || 'Date inconnue'}</span>{runtime && <span>· {runtime}</span>}<span>· {movie.vote_average?.toFixed(1) ?? '—'}/10</span></div><div className="mt-5 flex flex-wrap gap-2">{movie.genres.map(genre => <Link key={genre.id} href={`/genre/${genre.id}`} className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">{genre.name}</Link>)}</div>{director && <p className="mt-6 text-sm text-white/65">Réalisation : <Link className="text-white hover:text-[#d8ff45]" href={`/acteur/${director.id}`}>{director.name}</Link></p>}<p className="mt-6 max-w-3xl leading-7 text-white/75">{movie.overview || 'Synopsis indisponible.'}</p></div>
      </div>
    </section>
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 py-10 sm:px-8">
      <MovieAiSummary title={movie.title} overview={movie.overview ?? ''} />
      {trailer && <section><h2 className="mb-4 text-2xl font-semibold">Bande-annonce</h2><div className="aspect-video overflow-hidden rounded-3xl bg-black"><iframe className="size-full" src={`https://www.youtube-nocookie.com/embed/${trailer.key}`} title={trailer.name} allowFullScreen /></div></section>}
      <section><h2 className="mb-4 text-2xl font-semibold">Où regarder</h2>{streamingProviders.length ? <div className="flex flex-wrap gap-3">{streamingProviders.map(provider => <div key={provider.provider_id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">{provider.provider_name}</div>)}</div> : <p className="rounded-2xl border border-dashed border-white/15 p-6 text-white/55">Aucune disponibilité indiquée pour votre pays.</p>}<p className="mt-3 text-xs text-white/40">Données fournies par JustWatch via TMDB.</p></section>
      <section><h2 className="mb-4 text-2xl font-semibold">Casting</h2><div className="grid grid-flow-col auto-cols-[145px] gap-4 overflow-x-auto pb-3">{(movie.credits?.cast ?? []).slice(0,20).map(member => <Link key={member.id} href={`/acteur/${member.id}`} className="group"><div className="aspect-[2/3] overflow-hidden rounded-2xl bg-white/10">{imageUrl(member.profile_path,'w342') ? <Image src={imageUrl(member.profile_path,'w342')!} alt={member.name} width={145} height={218} className="size-full object-cover transition group-hover:scale-105" /> : <span className="flex size-full items-center justify-center p-3 text-center text-xs text-white/45">Photo indisponible</span>}</div><p className="mt-2 text-sm font-medium">{member.name}</p><p className="text-xs text-white/45">{member.character || 'Rôle inconnu'}</p></Link>)}</div></section>
      {movie.similar?.results?.length ? <section><h2 className="mb-4 text-2xl font-semibold">Films similaires</h2><div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{movie.similar.results.slice(0,6).map(similar => <Link key={similar.id} href={`/movie/${similar.id}`} className="text-sm"><div className="aspect-[2/3] overflow-hidden rounded-2xl bg-white/10">{imageUrl(similar.poster_path) ? <Image src={imageUrl(similar.poster_path)!} alt={similar.title} width={180} height={270} className="size-full object-cover" /> : null}</div><p className="mt-2">{similar.title}</p></Link>)}</div></section> : null}
    </div>
  </main>
}
