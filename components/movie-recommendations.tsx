
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyMovies } from "@/lib/cinetrack-data";

type Movie = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
};

export default function MovieRecommendations() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      try {
        const savedMovies = await getMyMovies();

        const favoriteIds = savedMovies
          .filter((movie) => movie.status === "favorite")
          .map((movie) => movie.movie_id);

        const watchedIds = savedMovies
          .filter((movie) => movie.status === "watched")
          .map((movie) => movie.movie_id);

        const excludedIds = savedMovies.map(
          (movie) => movie.movie_id
        );

        const response = await fetch(
          "/api/module4/recommendations",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              favoriteIds,
              watchedIds,
              excludedIds,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Erreur de recommandation"
          );
        }

        if (!cancelled) {
          setMovies(data.movies ?? []);
          setMessage(data.message ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les recommandations."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="mt-10 text-muted-foreground">
        Chargement des recommandations...
      </p>
    );
  }

  if (error) {
    return (
      <p className="mt-10 text-red-400">
        {error}
      </p>
    );
  }

  if (movies.length === 0) {
    return (
      <p className="mt-10 text-muted-foreground">
        {message ||
          "Aucune recommandation disponible pour le moment."}
      </p>
    );
  }

  return (
    <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {movies.map((movie) => (
        <Link
          key={movie.id}
          href={`/movie/${movie.id}`}
          className="overflow-hidden rounded-2xl bg-card transition hover:opacity-80"
        >
          {movie.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
              alt={`Affiche de ${movie.title}`}
              className="aspect-[2/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center bg-white/10">
              Affiche indisponible
            </div>
          )}

          <div className="p-3">
            <h3 className="font-semibold">
              {movie.title}
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              {movie.release_date?.slice(0, 4) || "Année inconnue"}
            </p>

            {typeof movie.vote_average === "number" && (
              <p className="mt-1 text-sm text-yellow-400">
                ★ {movie.vote_average.toFixed(1)}/10
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
