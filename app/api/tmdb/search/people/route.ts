import { NextResponse } from 'next/server'
import { searchActors, TmdbError } from '@/lib/tmdb'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')?.trim()
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  if (!query) return NextResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 })
  try { return NextResponse.json(await searchActors(query, page)) } catch (error) { const status = error instanceof TmdbError && error.status >= 400 ? error.status : 502; return NextResponse.json({ error: error instanceof Error ? error.message : 'TMDB est indisponible' }, { status }) }
}
