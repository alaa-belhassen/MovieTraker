
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyMovies, removeMovie } from "@/lib/cinetrack-data";
const tabs = [
  "À regarder",
  "Déjà vu",
  "Favoris",
  "Acteurs suivis",
] as const;

type Tab = (typeof tabs)[number];

type SavedMovie = {
  movie_id: number;
  status: "watchlist" | "watched" | "favorite";
};

type MovieDetails = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
};

type ListItem = {
  saved: SavedMovie;
  movie: MovieDetails | null;
};

export default function MyMovieLists() {
  const [active, setActive] = useState<Tab>("À regarder");
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

async function handleRemove(
  movieId: number,
  status: "watchlist" | "watched" | "favorite"
) {
  setRemovingId(movieId);
  setError("");

  try {
    await removeMovie(movieId, status);

    setItems((previousItems) =>
      previousItems.filter(
        (item) =>
          !(
            item.saved.movie_id === movieId &&
            item.saved.status === status
          )
      )
    );
  } catch {
    setError("Impossible de retirer ce film. Réessaie.");
  } finally {
    setRemovingId(null);
  }
}

  useEffect(() => {
    let cancelled = false;

    async function loadMovies() {
      try {
        const savedMovies = await getMyMovies();

        const results = await Promise.all(
          savedMovies.map(async (saved) => {
            try {
              const response = await fetch(
                `/api/tmdb/movie/${saved.movie_id}`
              );

              if (!response.ok) {
                throw new Error("Film indisponible");
              }

              const movie =
                (await response.json()) as MovieDetails;

              return { saved, movie };
            } catch {
              return { saved, movie: null };
            }
          })
        );

        if (!cancelled) {
          setItems(results);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Impossible de charger tes listes. Vérifie ta connexion et ton compte."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMovies();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusByTab: Record<string, string> = {
    "À regarder": "watchlist",
    "Déjà vu": "watched",
    "Favoris": "favorite",
  };

  const filteredMovies = items.filter(
    (item) => item.saved.status === statusByTab[active]
  );

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      <p className="text-sm font-medium text-primary">
        Votre espace
      </p>

      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        Mes listes
      </h1>

      <div className="mt-8 flex gap-2 overflow-x-auto border-b border-border pb-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm ${
              active === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {active === "Acteurs suivis" ? (
        <p className="mt-8 text-muted-foreground">
          La liste des acteurs suivis sera ajoutée prochainement.
        </p>
      ) : loading ? (
        <p className="mt-8">Chargement des films...</p>
      ) : error ? (
        <p className="mt-8 text-red-400">{error}</p>
      ) : filteredMovies.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          Aucun film dans cette liste pour le moment.
        </p>
      ) : (
<div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
  {filteredMovies.map(({ saved, movie }) => (
    <div
      key={`${saved.movie_id}-${saved.status}`}
      className="overflow-hidden rounded-2xl bg-card"
    >
      {/* Affiche du film */}
      <Link href={`/movie/${saved.movie_id}`}>
        {movie?.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
            alt={`Affiche de ${movie.title}`}
            className="aspect-[2/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[2/3] items-center justify-center bg-white/10 p-4 text-center">
            Affiche indisponible
          </div>
        )}
      </Link>

      {/* Informations du film */}
      <div className="p-3">
        <Link href={`/movie/${saved.movie_id}`}>
          <h3 className="font-semibold hover:text-primary">
            {movie?.title ?? `Film n°${saved.movie_id}`}
          </h3>
        </Link>

        <p className="mt-1 text-sm text-muted-foreground">
          {movie?.release_date?.slice(0, 4) ?? ""}
        </p>

        {/* Bouton de suppression */}
        <button
          type="button"
          onClick={() =>
            handleRemove(saved.movie_id, saved.status)
          }
          disabled={removingId === saved.movie_id}
          className="mt-4 w-full rounded-lg border border-red-500/50 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {removingId === saved.movie_id
            ? "Suppression..."
            : "Retirer de ma liste"}
        </button>
      </div>
    </div>
  ))}
</div>
      )}
    </div>
  );
}
