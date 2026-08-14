import {
  pgTable, text, timestamp, integer, boolean, uuid, primaryKey,
} from 'drizzle-orm/pg-core'
import type { AdapterAccountType } from 'next-auth/adapters'

// ── NextAuth required tables ─────────────────────────────────────────────────
export const users = pgTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  password: text('password'),
  created_at: timestamp('created_at').defaultNow(),
})

export const accounts = pgTable(
  'account',
  {
    userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
)

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
)

// ── App tables ────────────────────────────────────────────────────────────────
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  owner_id: text('owner_id').notNull().references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
})

export const workspace_members = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').$type<'owner' | 'admin' | 'member'>().notNull().default('member'),
  joined_at: timestamp('joined_at').defaultNow(),
})

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').notNull().default('#6366f1'),
  icon: text('icon'),
  is_favorite: boolean('is_favorite').notNull().default(false),
  progress: integer('progress').notNull().default(0),
  created_by: text('created_by').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  section_id: uuid('section_id'),
  parent_id: uuid('parent_id'),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').$type<'todo' | 'in_progress' | 'completed'>().notNull().default('todo'),
  priority: text('priority').$type<'p1' | 'p2' | 'p3' | 'p4'>().notNull().default('p4'),
  due_date: text('due_date'),
  due_time: text('due_time'),
  is_recurring: boolean('is_recurring').notNull().default(false),
  recurrence_rule: text('recurrence_rule'),
  assigned_to: text('assigned_to').references(() => users.id),
  created_by: text('created_by').references(() => users.id),
  position: integer('position').notNull().default(0),
  estimated_minutes: integer('estimated_minutes'),
  actual_minutes: integer('actual_minutes'),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})

export const habits = pgTable('habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').notNull().default('#6366f1'),
  streak: integer('streak').notNull().default(0),
  created_at: timestamp('created_at').defaultNow(),
})

export const habit_completions = pgTable('habit_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  habit_id: uuid('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  completed_date: text('completed_date').notNull(),
  created_at: timestamp('created_at').defaultNow(),
})

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  target_date: text('target_date'),
  progress: integer('progress').notNull().default(0),
  status: text('status').$type<'active' | 'completed' | 'paused'>().notNull().default('active'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})
