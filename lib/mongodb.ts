import 'server-only'

import { MongoClient, type Db } from 'mongodb'

type MongoGlobals = typeof globalThis & {
  cinetrackMongoClient?: Promise<MongoClient>
  cinetrackMongoDatabase?: Promise<Db>
}

const mongoGlobals = globalThis as MongoGlobals

export async function getMongoDatabase() {
  if (!mongoGlobals.cinetrackMongoDatabase) {
    const uri = process.env.MONGODB_URI?.trim()
    if (!uri) throw new Error('MONGODB_URI must be configured to use MongoDB.')

    mongoGlobals.cinetrackMongoClient ??= new MongoClient(uri).connect()
    mongoGlobals.cinetrackMongoDatabase = mongoGlobals.cinetrackMongoClient.then(async client => {
      const database = client.db(process.env.MONGODB_DB?.trim() || 'cinetrack')
      await Promise.all([
        database.collection('profiles').createIndex({ id: 1 }, { unique: true }),
        database.collection('user_movies').createIndex({ user_id: 1, movie_id: 1, status: 1 }, { unique: true }),
        database.collection('favorite_actors').createIndex({ user_id: 1, actor_id: 1 }, { unique: true }),
        database.collection('rooms').createIndex({ id: 1 }, { unique: true }),
        database.collection('room_participants').createIndex({ room_id: 1, user_id: 1 }, { unique: true }),
        database.collection('shared_lists').createIndex({ id: 1 }, { unique: true }),
        database.collection('shared_lists').createIndex({ invite_token: 1 }, { unique: true }),
        database.collection('shared_list_members').createIndex({ list_id: 1, user_id: 1 }, { unique: true }),
        database.collection('shared_list_votes').createIndex({ list_id: 1, movie_id: 1, user_id: 1 }, { unique: true }),
        database.collection('room_playback_state').createIndex({ room_id: 1 }, { unique: true }),
        database.collection('chat_history').createIndex({ owner_key: 1 }, { unique: true }),
        database.collection('chat_history').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
      ])
      return database
    })
  }

  return mongoGlobals.cinetrackMongoDatabase
}
