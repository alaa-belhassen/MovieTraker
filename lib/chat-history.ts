import 'server-only'

import { randomUUID } from 'node:crypto'
import type { UIMessage } from 'ai'
import type { Document } from 'mongodb'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getMongoDatabase } from '@/lib/mongodb'

const CHAT_SESSION_COOKIE = 'cinetrack_chat_session'
const CHAT_HISTORY_TTL_SECONDS = 60 * 60 * 24 * 60

type ChatHistoryDocument = Document & {
  owner_key: string
  messages: UIMessage[]
  expires_at: Date
  updated_at: Date
}

export function isChatHistoryConfigured() {
  return Boolean(process.env.MONGODB_URI?.trim())
}

export async function getChatOwnerKey() {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (data.user) return `cinetrack:chat:user:${data.user.id}`
  } catch {
    // Anonymous sessions still get isolated conversation keys.
  }

  const cookieStore = await cookies()
  let sessionId = cookieStore.get(CHAT_SESSION_COOKIE)?.value
  if (!sessionId) {
    sessionId = randomUUID()
    cookieStore.set(CHAT_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: CHAT_HISTORY_TTL_SECONDS,
    })
  }
  return `cinetrack:chat:session:${sessionId}`
}

export async function loadChatHistory() {
  if (!isChatHistoryConfigured()) return []
  const ownerKey = await getChatOwnerKey()
  const database = await getMongoDatabase()
  const history = await database.collection<ChatHistoryDocument>('chat_history').findOne({
    owner_key: ownerKey,
    expires_at: { $gt: new Date() },
  })
  return history?.messages ?? []
}

export async function saveChatHistory(ownerKey: string, messages: UIMessage[]) {
  if (!isChatHistoryConfigured()) return
  const database = await getMongoDatabase()
  const now = new Date()
  await database.collection<ChatHistoryDocument>('chat_history').replaceOne(
    { owner_key: ownerKey },
    {
      owner_key: ownerKey,
      messages: messages.slice(-20),
      expires_at: new Date(now.getTime() + CHAT_HISTORY_TTL_SECONDS * 1000),
      updated_at: now,
    },
    { upsert: true },
  )
}
