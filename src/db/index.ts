import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let _db: NeonHttpDatabase<typeof schema> | undefined

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop: string | symbol) {
    if (!_db) {
      _db = drizzle(neon(process.env.DATABASE_URL!), { schema })
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop]
  },
})
