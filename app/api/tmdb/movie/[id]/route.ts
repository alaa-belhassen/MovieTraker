
import { NextResponse } from "next/server";
import { getMovieDetails, TmdbError } from "@/lib/tmdb";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const movieId = Number(id);

  if (!Number.isSafeInteger(movieId) || movieId <= 0) {
    return NextResponse.json(
      { error: "Identifiant de film invalide" },
      { status: 400 }
    );
  }

  try {
    const movie = await getMovieDetails(movieId);

    return NextResponse.json({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      release_date: movie.release_date,
      vote_average: movie.vote_average,
    });
  } catch (error) {
    const status =
      error instanceof TmdbError &&
      error.status >= 400 &&
      error.status <= 599
        ? error.status
        : 502;

    return NextResponse.json(
      { error: "Impossible de récupérer le film" },
      { status }
    );
  }
}
