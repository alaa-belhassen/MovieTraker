
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Film,
  Plus,
  Users,
  X,
} from 'lucide-react'

import {
  acceptSharedList,
  getCurrentUser,
} from '@/lib/cinetrack-data'

import {
  getLocalSharedLists,
  createLocalSharedList,
  addMovieToLocalSharedList,
  voteForLocalSharedMovie,
  type LocalSharedList,
  type SharedMovie,
} from '@/lib/shared-lists-local'

// Petite icône pour représenter un membre
function Avatar({ initials }: { initials: string }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
      {initials}
    </span>
  )
}

// Fenêtre de création
function Dialog({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="float-right rounded-lg p-1 text-muted-foreground hover:bg-muted"
          aria-label="Fermer"
        >
          <X className="size-5" />
        </button>

        {children}
      </div>
    </div>
  )
}

// ==========================================
// PAGE 1 : TOUTES LES LISTES PARTAGÉES
// ==========================================

export function SharedListsOverview() {
  const [lists, setLists] = useState<LocalSharedList[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)

  const [name, setName] = useState('')
  const [type, setType] = useState<'Amis' | 'Couple'>('Amis')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLists(getLocalSharedLists())
    setLoaded(true)
  }, [])

  function createList() {
    const cleanName = name.trim()

    if (cleanName.length < 3 || cleanName.length > 50) {
      setError('Le nom doit contenir entre 3 et 50 caractères.')
      return
    }

    try {
      const created = createLocalSharedList(
        cleanName,
        type,
        description
      )

      window.location.href = `/listes-partagees/${created.id}`
    } catch {
      setError('Impossible de créer la liste.')
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">

        <Link
          href="/mes-listes"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Mes listes
        </Link>

        <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-primary">
              À plusieurs, c'est mieux
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Listes partagées
            </h1>

            <p className="mt-3 text-muted-foreground">
              Organisez vos prochaines soirées cinéma.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" />
            Nouvelle liste partagée
          </button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Mode démonstration : les listes sont enregistrées
          dans ce navigateur uniquement.
        </p>

        <section className="mt-10 grid gap-4 md:grid-cols-2">

          {!loaded ? (
            <p className="text-muted-foreground">
              Chargement des listes...
            </p>
          ) : lists.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 md:col-span-2">
              <Film className="mb-4 size-9 text-primary" />

              <h2 className="text-xl font-semibold">
                Aucune liste partagée
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Crée ta première liste pour commencer à proposer des films.
              </p>

              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-5 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              >
                Créer une liste
              </button>
            </div>
          ) : (
            lists.map((list) => (
              <Link
                key={list.id}
                href={`/listes-partagees/${list.id}`}
                className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/60"
              >
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {list.type}
                </span>

                <h2 className="mt-4 text-xl font-semibold">
                  {list.name}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  {list.description || 'Aucune description'}
                </p>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar initials="MO" />

                    <span className="text-sm text-muted-foreground">
                      1 membre (démo)
                    </span>
                  </div>

                  <span className="text-sm text-muted-foreground">
                    {list.movies.length} film(s)
                  </span>
                </div>
              </Link>
            ))
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">
            Invitations reçues
          </h2>

          <p className="mt-3 text-sm text-muted-foreground">
            Les invitations réelles seront disponibles après
            la connexion du module à MongoDB.
          </p>
        </section>
      </div>

      {open && (
        <Dialog onClose={() => setOpen(false)}>
          <h2 className="text-xl font-semibold">
            Créer une liste partagée
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Donne un nom à ta liste.
          </p>

          <label className="mt-6 block text-sm font-medium">
            Nom de la liste

            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              maxLength={50}
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 outline-none focus:border-primary"
              placeholder="Ex. Films du vendredi"
            />
          </label>

          {error && (
            <p className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <fieldset className="mt-5">
            <legend className="text-sm font-medium">
              Type de liste
            </legend>

            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['Amis', 'Couple'] as const).map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setType(option)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${
                    type === option
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-5 block text-sm font-medium">
            Description (optionnelle)

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={240}
              className="mt-2 min-h-20 w-full resize-none rounded-xl border border-border bg-background px-3 py-3 outline-none focus:border-primary"
              placeholder="Ex. Films à regarder ensemble..."
            />
          </label>

          <button
            type="button"
            onClick={createList}
            className="mt-6 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
          >
            Créer la liste
          </button>
        </Dialog>
      )}
    </main>
  )
}

// ==========================================
// PAGE 2 : DÉTAIL D'UNE LISTE
// ==========================================

export function SharedListDetail({ id }: { id: string }) {
  const [list, setList] = useState<LocalSharedList | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [movieId, setMovieId] = useState('')
  const [movieSearch, setMovieSearch] = useState('')
const [searching, setSearching] = useState(false)
const [searchResults, setSearchResults] = useState<{
  id: number
  title: string
  release_date?: string
  poster_path?: string | null
}[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [adding, setAdding] = useState(false)

  function refreshList() {
    const found = getLocalSharedLists().find(
      (item) => item.id === id
    )

    setList(found ?? null)
  }

  useEffect(() => {
    const found = getLocalSharedLists().find(
      (item) => item.id === id
    )

    setList(found ?? null)
    setLoaded(true)
  }, [id])

async function searchFilms() {
  if (!movieSearch.trim()) {
    setError('Entre le titre d’un film.')
    return
  }

  setSearching(true)
  setError('')
  setSearchResults([])

  try {
    const response = await fetch(
      `/api/tmdb/search?q=${encodeURIComponent(movieSearch)}&type=movie`
    )

    if (!response.ok) {
      throw new Error('Erreur de recherche')
    }

    const data = await response.json()

    setSearchResults(
      Array.isArray(data.results) ? data.results : []
    )
  } catch {
    setError('Impossible de rechercher les films.')
  } finally {
    setSearching(false)
  }
}

  async function addMovie() {
    setError('')
    setMessage('')

    const numericId = Number(movieId.trim())

    if (!Number.isInteger(numericId) || numericId < 1) {
      setError('Entre un identifiant TMDB valide.')
      return
    }

    if (list?.movies.some((movie) => movie.id === numericId)) {
      setError('Ce film est déjà dans la liste.')
      return
    }

    setAdding(true)

    try {
      const response = await fetch(
        `/api/tmdb/movie/${numericId}`
      )

      if (!response.ok) {
        throw new Error('Film introuvable.')
      }

      const result = await response.json()
      const movie = result.movie ?? result.data ?? result

      if (!movie || !movie.title || Number(movie.id) !== numericId) {
        throw new Error('Données du film invalides.')
      }

      const newMovie: SharedMovie = {
        id: numericId,
        title: movie.title,
        year: movie.release_date
          ? Number(movie.release_date.slice(0, 4)) || 0
          : 0,
        posterPath: movie.poster_path ?? null,
      }

      addMovieToLocalSharedList(id, newMovie)

      refreshList()
      setMovieId('')
      setMessage('Film ajouté à la liste.')
    } catch {
      setError(
        "Impossible de récupérer ce film. Vérifie son identifiant TMDB."
      )
    } finally {
      setAdding(false)
    }
  }


function vote(movieIdToVote: number) {
  if (!list) return

  const success = voteForLocalSharedMovie(id, movieIdToVote)

  if (success) {
    refreshList()
    setMessage('Vote enregistré avec succès.')
  } else {
    setMessage('Tu as déjà voté pour ce film.')
  }
}


  if (!loaded) {
    return (
      <main className="min-h-screen bg-background p-8 text-foreground">
        Chargement...
      </main>
    )
  }

  if (!list) {
    return (
      <main className="min-h-screen bg-background p-8 text-foreground">
        <h1 className="text-2xl font-semibold">
          Liste introuvable
        </h1>

        <p className="mt-3 text-muted-foreground">
          Cette liste n'existe pas dans le stockage local
          de ce navigateur.
        </p>

        <Link
          href="/listes-partagees"
          className="mt-5 inline-block text-primary underline"
        >
          Retour aux listes
        </Link>
      </main>
    )
  }

  const maxVotes = Math.max(
    0,
    ...list.movies.map(
      (movie) => list.votes[movie.id] ?? 0
    )
  )

  const leaders = list.movies.filter(
    (movie) =>
      maxVotes > 0 &&
      (list.votes[movie.id] ?? 0) === maxVotes
  )

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">

        <Link
          href="/listes-partagees"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Toutes les listes partagées
        </Link>

        <div className="mt-8">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            {list.type}
          </span>

          <h1 className="mt-4 text-4xl font-semibold">
            {list.name}
          </h1>

          <p className="mt-3 text-muted-foreground">
            {list.description || 'Aucune description'}
          </p>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          Démonstration locale : les films et les votes sont
          enregistrés uniquement dans ce navigateur.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">

          <section>
            <h2 className="text-xl font-semibold">
              Films proposés
            </h2>

            <div className="mt-5 rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold">
                Proposer un film
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
  Recherchez un film par son titre et ajoutez-le à votre liste.
</p>

<div className="mt-4 flex gap-2">
  <input
    type="text"
    value={movieSearch}
    onChange={(e) => setMovieSearch(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') searchFilms()
    }}
    placeholder="Rechercher un film, ex. Titanic"
    className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-3 outline-none focus:border-primary"
  />

  <button
    type="button"
    onClick={searchFilms}
    disabled={searching}
    className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
  >
    {searching ? 'Recherche...' : 'Rechercher'}
  </button>
</div>

{searchResults.length > 0 && (
  <div className="mt-4 space-y-2">
    {searchResults.slice(0, 8).map((movie) => (
      <button
        key={movie.id}
        type="button"
      
onClick={() => {
  if (list.movies.some(item => item.id === movie.id)) {
    setError('Ce film est déjà dans la liste.')
    return
  }

  const newMovie: SharedMovie = {
    id: movie.id,
    title: movie.title,
    year: movie.release_date
      ? Number(movie.release_date.slice(0, 4)) || 0
      : 0,
    posterPath: movie.poster_path ?? null,
  }

  addMovieToLocalSharedList(id, newMovie)
  refreshList()
  setSearchResults([])
  setMovieSearch('')
  setMovieId('')
  setError('')
  setMessage('Film ajouté à la liste avec succès.')
}}

        className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:border-primary"
      >
        {movie.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
            alt={movie.title}
            className="h-16 w-11 rounded object-cover"
          />
        ) : (
          <div className="grid h-16 w-11 place-items-center rounded bg-muted">
            <Film className="size-5" />
          </div>
        )}

        <div>
          <p className="font-semibold">{movie.title}</p>
          <p className="text-xs text-muted-foreground">
            {movie.release_date?.slice(0, 4) || 'Année inconnue'}
          </p>
          <p className="mt-1 text-xs text-primary">
            Cliquer pour sélectionner
          </p>
        </div>
      </button>
    ))}
  </div>
)}

              

              {error && (
                <p className="mt-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              {message && (
                <p className="mt-3 text-sm text-primary">
                  {message}
                </p>
              )}
            </div>

            {list.movies.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-border bg-card p-8 text-center">
                <Film className="mx-auto mb-4 size-10 text-muted-foreground" />

                <p className="font-medium">
                  Aucun film proposé
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Ajoute un premier film pour commencer les votes.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {[...list.movies]
                  .sort(
                    (a, b) =>
                      (list.votes[b.id] ?? 0) -
                      (list.votes[a.id] ?? 0)
                  )
                  .map((movie) => {
                    const count = list.votes[movie.id] ?? 0

                    const isLeader =
                      maxVotes > 0 && count === maxVotes

                    return (
                      <div
                        key={movie.id}
                        className={`flex items-center gap-4 rounded-2xl border bg-card p-4 ${
                          isLeader
                            ? 'border-primary'
                            : 'border-border'
                        }`}
                      >
                        {movie.posterPath ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                            alt={`Affiche de ${movie.title}`}
                            className="h-24 w-16 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="grid h-24 w-16 shrink-0 place-items-center rounded-lg bg-muted">
                            <Film className="size-7" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          {isLeader && (
                            <span className="text-xs font-semibold text-primary">
                              {leaders.length === 1
                                ? 'EN TÊTE'
                                : 'EX ÆQUO'}
                            </span>
                          )}

                          <h3 className="font-semibold">
                            {movie.title}
                          </h3>

                          <p className="text-sm text-muted-foreground">
                            {movie.year || 'Année inconnue'}
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {count} vote(s)
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => vote(movie.id)}
                          className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary"
                        >
                          Voter
                        </button>
                      </div>
                    )
                  })}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />

              <h2 className="font-semibold">
                Membres
              </h2>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Avatar initials="MO" />

              <div>
                <p className="text-sm font-medium">
                  Moi
                </p>

                <p className="text-xs text-muted-foreground">
                  Créateur (démo)
                </p>
              </div>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              L'ajout de véritables membres et les invitations
              nécessitent la connexion à MongoDB.
            </p>

            <div className="mt-6 border-t border-border pt-5">
              <h3 className="font-semibold">
                Résultat des votes
              </h3>

              {leaders.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Aucun vote pour le moment.
                </p>
              ) : (
                <div className="mt-3">
                  {leaders.map((movie) => (
                    <p
                      key={movie.id}
                      className="mt-2 text-sm text-primary"
                    >
                      <Check className="mr-1 inline size-4" />
                      {movie.title} : {maxVotes} vote(s)
                    </p>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

// ==========================================
// PAGE 3 : REJOINDRE UNE LISTE
// ==========================================

// Cette page conserve la logique Supabase existante.
// Elle ne permet pas de rejoindre une liste de démonstration locale.

export function JoinList({ token }: { token: string }) {
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')

  async function join() {
    setError('')

    try {
      const user = await getCurrentUser()

      if (!user) {
        window.location.href =
          `/auth/login?next=/rejoindre/${encodeURIComponent(token)}`
        return
      }

      await acceptSharedList(token)
      setJoined(true)
    } catch {
      setError(
        "Impossible de rejoindre cette liste. Vérifie que l'invitation existe et que tu as accès au projet."
      )
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center">

        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Users className="size-7" />
        </div>

        <p className="mt-6 text-sm font-medium text-primary">
          Invitation MovieTraker
        </p>

        <h1 className="mt-2 text-3xl font-semibold">
          Rejoindre une liste partagée
        </h1>

        <p className="mt-3 text-muted-foreground">
          Cette invitation nécessite une connexion à la base
          de données. Les listes locales ne peuvent pas
          être partagées par ce lien.
        </p>

        {joined ? (
          <div className="mt-7 rounded-xl bg-primary/10 p-4 text-sm text-primary">
            <Check className="mx-auto mb-2 size-5" />
            Vous avez rejoint la liste.
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={join}
              className="mt-7 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
            >
              Accepter et rejoindre
            </button>

            {error && (
              <p className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </>
        )}

        <p className="mt-5 text-xs text-muted-foreground">
          Référence de l'invitation : {token.slice(0, 8)}
        </p>
      </div>
    </main>
  )
}
