import { getGenres, getNowPlaying, getPopularMovies, getTopRatedMovies, getTrendingActors, getTrendingMovies } from '@/lib/tmdb'
import TmdbHome from '@/components/tmdb-home'

export default async function Page() {
  const [trending, popular, topRated, nowPlaying, actors, genreData] = await Promise.all([
    getTrendingMovies('week'), getPopularMovies(), getTopRatedMovies(), getNowPlaying(), getTrendingActors(), getGenres(),
  ])
  const hero = trending.results[0]
  if (!hero) throw new Error('Aucun film tendance disponible')
  return <TmdbHome hero={hero} trending={trending.results} popular={popular.results} topRated={topRated.results} nowPlaying={nowPlaying.results} actors={actors.results} genres={genreData.genres} />
}
