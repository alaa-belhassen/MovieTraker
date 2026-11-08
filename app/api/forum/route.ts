import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { createMongoForumTopic, listMongoForumTopics } from '@/lib/mongodb-data'
import { isForumCategory } from '@/lib/forum-types'

export async function GET(request: NextRequest) {
  const requestedCategory = request.nextUrl.searchParams.get('category')
  let category
  if (requestedCategory) {
    if (!isForumCategory(requestedCategory)) {
      return NextResponse.json({ error: 'Catégorie de discussion invalide.' }, { status: 400 })
    }
    category = requestedCategory
  }
  try {
    const topics = await listMongoForumTopics(category)
    return NextResponse.json({ topics }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[CinéTrack] forum topics load failed:', error)
    return NextResponse.json({ error: 'Impossible de charger les discussions.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body.title !== 'string' || typeof body.content !== 'string' || typeof body.category !== 'string') {
      return NextResponse.json({ error: 'Informations de discussion invalides.' }, { status: 400 })
    }
    const topic = await createMongoForumTopic(user, { title: body.title, content: body.content, category: body.category })
    return NextResponse.json({ topic }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const badRequest = message.startsWith('Le titre') || message.startsWith('Le message') || message.startsWith('Catégorie')
    if (!badRequest) console.error('[CinéTrack] forum topic create failed:', error)
    return NextResponse.json({ error: badRequest ? message : 'Impossible de créer la discussion.' }, { status: badRequest ? 400 : 500 })
  }
}
