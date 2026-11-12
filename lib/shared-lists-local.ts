
export type SharedMovie = {
  id: number
  title: string
  year: number
  posterPath: string | null
}

export type LocalSharedList = {
  id: string
  name: string
  type: 'Amis' | 'Couple'
  description: string
  movies: SharedMovie[]
  votes: Record<string, number>
}

const STORAGE_KEY = 'movietracker_shared_lists_demo'

export function getLocalSharedLists(): LocalSharedList[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveLocalSharedLists(lists: LocalSharedList[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
}

export function createLocalSharedList(
  name: string,
  type: 'Amis' | 'Couple',
  description: string
): LocalSharedList {
  const lists = getLocalSharedLists()

  const list: LocalSharedList = {
    id: crypto.randomUUID(),
    name: name.trim(),
    type,
    description: description.trim(),
    movies: [],
    votes: {},
  }

  saveLocalSharedLists([...lists, list])
  return list
}

export function addMovieToLocalSharedList(
  listId: string,
  movie: SharedMovie
) {
  const lists = getLocalSharedLists()

  const updated = lists.map(list => {
    if (list.id !== listId) return list
    if (list.movies.some(item => item.id === movie.id)) return list

    return {
      ...list,
      movies: [...list.movies, movie],
    }
  })

  saveLocalSharedLists(updated)
}


export function voteForLocalSharedMovie(
  listId: string,
  movieId: number
): boolean {
  const lists = getLocalSharedLists()

  const list = lists.find(item => item.id === listId)

  if (!list) return false

  const movieExists = list.movies.some(
    movie => movie.id === movieId
  )

  if (!movieExists) return false

  // Un vote maximum par film dans cette démonstration locale
  if ((list.votes[movieId] ?? 0) >= 1) {
    return false
  }

  const updated = lists.map(item => {
    if (item.id !== listId) return item

    return {
      ...item,
      votes: {
        ...item.votes,
        [movieId]: 1,
      },
    }
  })

  saveLocalSharedLists(updated)

  return true
}
