import 'server-only'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

export type TmdbWindow = 'day' | 'week'
export type TmdbList<T> = { page: number; results: T[]; total_pages: number; total_results: number }
export type Genre = { id: number; name: string }
export type Movie = { id: number; title: string; original_title?: string; overview?: string; poster_path: string | null; backdrop_path?: string | null; release_date?: string; vote_average?: number; vote_count?: number; popularity?: number; genre_ids?: number[]; media_type?: 'movie' | 'tv' }
export type CastMember = { id: number; name: string; character?: string; profile_path: string | null; order?: number }
export type CrewMember = { id: number; name: string; job?: string; department?: string; profile_path?: string | null }
export type WatchProvider = { provider_id: number; provider_name: string; logo_path: string | null; display_priority?: number }
export type Person = { id: number; name: string; profile_path: string | null; known_for_department?: string; popularity?: number }
export type MovieDetails = Movie & { tagline?: string; runtime?: number | null; genres: Genre[]; budget?: number; revenue?: number; credits?: { cast: CastMember[]; crew: CrewMember[] }; videos?: { results: { key: string; name: string; site: string; type: string }[] }; 'watch/providers'?: { results?: Record<string, { flatrate?: WatchProvider[]; rent?: WatchProvider[]; buy?: WatchProvider[] }> }; similar?: TmdbList<Movie> }
export type PersonDetails = Person & { biography?: string; birthday?: string | null; deathday?: string | null; place_of_birth?: string | null; gender?: number; homepage?: string | null; external_ids?: { imdb_id?: string | null; instagram_id?: string | null; twitter_id?: string | null; facebook_id?: string | null }; combined_credits?: { cast: (Movie & { character?: string; media_type?: string })[]; crew: (Movie & { job?: string; media_type?: string })[] }; images?: { profiles: { file_path: string; width: number; height: number }[] } }

export class TmdbError extends Error { constructor(public status: number, message: string) { super(message); this.name = 'TmdbError' } }

export async function tmdbFetch<T>(path: string, params: Record<string, string | number | undefined> = {}, revalidate = 3600): Promise<T> {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) throw new TmdbError(503, 'TMDB_API_KEY manquante')
  const searchParams = new URLSearchParams({ api_key: apiKey, language: 'fr-FR' })
  for (const [key, value] of Object.entries(params)) if (value !== undefined) searchParams.set(key, String(value))
  let response: Response
  try { response = await fetch(`${TMDB_BASE_URL}${path}?${searchParams}`, { next: { revalidate } }) } catch { throw new TmdbError(0, 'TMDB est indisponible') }
  if (!response.ok) { const message = response.status === 429 ? 'Trop de requêtes, réessayez dans un instant' : response.status === 404 ? 'Ressource TMDB introuvable' : response.status === 401 ? 'Clé TMDB invalide' : 'TMDB est indisponible'; throw new TmdbError(response.status, message) }
  return response.json() as Promise<T>
}
export const imageUrl = (path: string | null | undefined, size: 'w185'|'w342'|'w500'|'w780'|'original' = 'w342') => path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null
export const getTrendingMovies = (window: TmdbWindow = 'week') => tmdbFetch<TmdbList<Movie>>(`/trending/movie/${window}`)
export const getPopularMovies = (page = 1) => tmdbFetch<TmdbList<Movie>>('/movie/popular', { page })
export const getTopRatedMovies = (page = 1) => tmdbFetch<TmdbList<Movie>>('/movie/top_rated', { page })
export const getNowPlaying = (page = 1) => tmdbFetch<TmdbList<Movie>>('/movie/now_playing', { page })
export const searchMovies = (query: string, page = 1) => tmdbFetch<TmdbList<Movie>>('/search/movie', { query, page, include_adult: 'false' })
export const getMovieDetails = (id: number) => tmdbFetch<MovieDetails>(`/movie/${id}`, { append_to_response: 'credits,videos,watch/providers,similar' }, 86400)
export const getGenres = () => tmdbFetch<{ genres: Genre[] }>('/genre/movie/list', {}, 86400)
export const discoverByGenre = (genreId: number, sort = 'popularity.desc', page = 1) => tmdbFetch<TmdbList<Movie>>('/discover/movie', { with_genres: genreId, sort_by: sort, page })
export const getTrendingActors = () => tmdbFetch<TmdbList<Person>>('/trending/person/week')
export const getPopularActors = (page = 1) => tmdbFetch<TmdbList<Person>>('/person/popular', { page })
export const getActorDetails = (id: number, language = 'fr-FR') => tmdbFetch<PersonDetails>(`/person/${id}`, { append_to_response: 'combined_credits,images,external_ids', language }, 86400)
export const getActorBiography = (id: number) => tmdbFetch<PersonDetails>(`/person/${id}`, { append_to_response: 'combined_credits,images,external_ids', language: 'en-US' }, 86400)
export const searchActors = (query: string, page = 1) => tmdbFetch<TmdbList<Person>>('/search/person', { query, page, include_adult: 'false' })
