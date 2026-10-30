import 'server-only'

import { randomUUID } from 'node:crypto'
import { Redis } from '@upstash/redis'
import type { UIMessage } from 'ai'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const CHAT_SESSION_COOKIE = 'cinetrack_chat_session'
const CHAT_HISTORY_TTL_SECONDS = 60 * 60 * 24 * 60

let redisClient: Redis | null | undefined

function getRedisClient() {
  if (redisClient !== undefined) return redisClient
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  redisClient = url?.trim() && token?.trim() ? new Redis({ url, token }) : null
  return redisClient
}

export function isChatHistoryConfigured() {
  return getRedisClient() !== null
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
  const redis = getRedisClient()
  if (!redis) return []
  try {
    const ownerKey = await getChatOwnerKey()
    return (await redis.get<UIMessage[]>(ownerKey)) ?? []
  } catch (error) {
    console.error('Chat history could not be loaded from Redis:', error)
    return []
  }
}

export async function saveChatHistory(ownerKey: string, messages: UIMessage[]) {
  const redis = getRedisClient()
  if (!redis) return
  try {
    await redis.set(ownerKey, messages.slice(-20), { ex: CHAT_HISTORY_TTL_SECONDS })
  } catch (error) {
    console.error('Chat history could not be saved to Redis:', error)
  }
}