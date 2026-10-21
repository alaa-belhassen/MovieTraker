import { NextResponse } from 'next/server'
import { TmdbError, tmdbFetch } from '@/lib/tmdb'

export const revalidate = 86400

type TmdbPerson = { biography?: string }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'Acteur introuvable' }, { status: 404 })

  try {
    const person = await tmdbFetch<TmdbPerson>(`/person/${id}`, { append_to_response: 'combined_credits,external_ids,images' })
    let biographyLanguage = 'fr-FR'
    if (!person.biography?.trim()) {
      const fallback = await tmdbFetch<TmdbPerson>(`/person/${id}`, { language: 'en-US' })
      person.biography = fallback.biography || ''
      biographyLanguage = person.biography ? 'en-US' : 'fr-FR'
    }
    return NextResponse.json({ ...person, biographyLanguage }, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } })
  } catch (error) {
    const status = error instanceof TmdbError && error.status === 404 ? 404 : error instanceof TmdbError && error.status === 429 ? 429 : 503
    return NextResponse.json({ error: status === 404 ? 'Acteur introuvable' : 'TMDB indisponible' }, { status })
  }
}
