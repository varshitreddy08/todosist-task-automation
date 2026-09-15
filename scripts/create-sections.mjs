import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

// load .env.local
const env = readFileSync('.env.local', 'utf8')
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '')

if (!dbUrl) { console.error('DATABASE_URL not found in .env.local'); process.exit(1) }

const sql = neon(dbUrl)

await sql`
  CREATE TABLE IF NOT EXISTS sections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    position integer NOT NULL DEFAULT 0,
    is_collapsed boolean NOT NULL DEFAULT false,
    created_by text REFERENCES "user"(id),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
  )
`

await sql`CREATE INDEX IF NOT EXISTS sections_project_idx ON sections(project_id)`
await sql`CREATE INDEX IF NOT EXISTS sections_created_by_idx ON sections(created_by)`

console.log('✓ sections table created (or already exists)')
