import { NextRequest, NextResponse } from 'next/server'
import { searchActors, searchMovies } from '@/lib/tmdb'
export async function GET(request: NextRequest) { const q = request.nextUrl.searchParams.get('q')?.trim(); const type = request.nextUrl.searchParams.get('type') === 'person' ? 'person' : 'movie'; const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1)); if (!q) return NextResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 }); return NextResponse.json(type === 'person' ? await searchActors(q, page) : await searchMovies(q, page)) }
