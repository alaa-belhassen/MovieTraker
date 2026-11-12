
import { NextResponse } from "next/server";

type Movie = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  adult?: boolean;
};

type RecommendationRequest = {
  favoriteIds?: number[];
  watchedIds?: number[];
  excludedIds?: number[];
};

function validIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(
    value.filter(
      (id): id is number =>
        typeof id === "number" &&
        Number.isSafeInteger(id) &&
        id > 0
    )
  )].slice(0, 100);
}

export async function POST(request: Request) {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Clé TMDB non configurée" },
      { status: 500 }
    );
  }

  try {
    const body =
      (await request.json()) as RecommendationRequest;

    const favorites = validIds(body.favoriteIds);
    const watched = validIds(body.watchedIds);
    const excluded = new Set([
      ...favorites,
      ...watched,
      ...validIds(body.excludedIds),
    ]);

    // Les favoris sont prioritaires.
    const sources = [
      ...favorites.slice(0, 5),
      ...watched.filter(id => !favorites.includes(id))
        .slice(0, 3),
    ];

    if (sources.length === 0) {
      return NextResponse.json({
        movies: [],
        message: "Ajoutez des favoris ou des films déjà vus.",
      });
    }

    const scores = new Map<
      number,
      { movie: Movie; score: number }
    >();

    let successfulRequests = 0;

    await Promise.all(
      sources.map(async (movieId) => {
        const url = new URL(
          `https://api.themoviedb.org/3/movie/${movieId}/recommendations`
        );

        url.searchParams.set("api_key", apiKey);
        url.searchParams.set("language", "fr-FR");

        try {
          const response = await fetch(url, {
            next: { revalidate: 3600 },
          });

          if (!response.ok) return;

          const data = (await response.json()) as {
            results?: Movie[];
          };

          successfulRequests++;

          for (const movie of data.results ?? []) {
            if (
              excluded.has(movie.id) ||
              movie.adult ||
              !movie.poster_path
            ) {
              continue;
            }

            const existing = scores.get(movie.id);
            const weight = favorites.includes(movieId)
              ? 3
              : 1;

            const ratingBonus =
              (movie.vote_count ?? 0) >= 50
                ? (movie.vote_average ?? 0) / 10
                : 0;

            scores.set(movie.id, {
              movie,
              score:
                (existing?.score ?? 0) +
                weight +
                ratingBonus,
            });
          }
        } catch {
          // Une source indisponible ne bloque pas
          // les autres recommandations.
        }
      })
    );

    if (successfulRequests === 0) {
      return NextResponse.json(
        { error: "TMDB est momentanément indisponible." },
        { status: 502 }
      );
    }

    const movies = [...scores.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(item => item.movie);

    return NextResponse.json({ movies });
  } catch {
    return NextResponse.json(
      { error: "Requête de recommandation invalide" },
      { status: 400 }
    );
  }
}
