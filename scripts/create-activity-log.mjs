import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

// load .env.local
const env = readFileSync('.env.local', 'utf8')
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '')

if (!dbUrl) { console.error('DATABASE_URL not found in .env.local'); process.exit(1) }

const sql = neon(dbUrl)

await sql`
  CREATE TABLE IF NOT EXISTS activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    task_id uuid,
    project_id uuid,
    action text NOT NULL,
    task_title text NOT NULL,
    project_name text,
    old_value text,
    new_value text,
    created_at timestamp DEFAULT now()
  )
`

console.log('✓ activity_log table created (or already exists)')
