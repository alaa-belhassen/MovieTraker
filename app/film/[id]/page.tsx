import MoviePage from '@/app/movie/[id]/page'

export default function FilmPage({ params }: { params: Promise<{ id: string }> }) {
  return <MoviePage params={params} />
}
