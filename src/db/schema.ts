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

export const sections = pgTable('sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  is_collapsed: boolean('is_collapsed').notNull().default(false),
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

export const user_integrations = pgTable('user_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'whatsapp' | 'gmail'
  config: text('config').notNull().default('{}'), // JSON
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})

export const api_tokens = pgTable('api_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  token: text('token').notNull(),
  last_used: timestamp('last_used'),
  created_at: timestamp('created_at').defaultNow(),
})

export const study_sessions = pgTable('study_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  duration_minutes: integer('duration_minutes').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
})

export const flashcard_decks = pgTable('flashcard_decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  subject: text('subject'),
  created_at: timestamp('created_at').defaultNow(),
})

export const flashcards = pgTable('flashcards', {
  id: uuid('id').primaryKey().defaultRandom(),
  deck_id: uuid('deck_id').notNull().references(() => flashcard_decks.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  front: text('front').notNull(),
  back: text('back').notNull(),
  interval_days: integer('interval_days').notNull().default(1),
  ease_factor: integer('ease_factor').notNull().default(250),
  due_date: text('due_date'),
  created_at: timestamp('created_at').defaultNow(),
})

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<'deadline' | 'ai' | 'reminder' | 'achievement' | 'system'>().notNull().default('system'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  read: boolean('read').notNull().default(false),
  created_at: timestamp('created_at').defaultNow(),
})

export const whatsapp_busy_mode = pgTable('whatsapp_busy_mode', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  active: boolean('active').notNull().default(false),
  message: text('message').notNull().default(''),
  ai_mode: boolean('ai_mode').notNull().default(false),
  context: text('context').notNull().default(''), // e.g. "I am in exam"
  contacts: text('contacts').notNull().default('all'), // 'all' or JSON array of phone numbers
  expires_at: timestamp('expires_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})

export const class_schedule = pgTable('class_schedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entries: text('entries').notNull().default('[]'), // JSON: [{day,subject,start_time,end_time,type}]
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})

export const scheduled_emails = pgTable('scheduled_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  to_email: text('to_email').notNull(),
  cc_email: text('cc_email'),
  from_email: text('from_email'),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  scheduled_at: timestamp('scheduled_at').notNull(),
  sent_at: timestamp('sent_at'),
  status: text('status').$type<'pending' | 'sent' | 'failed'>().notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow(),
})

export const activity_log = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  task_id: uuid('task_id'),       // no FK — task may be deleted
  project_id: uuid('project_id'), // no FK — project may be deleted
  action: text('action').$type<
    'added' | 'completed' | 'uncompleted' |
    'changed_priority' | 'set_date' | 'changed_date' | 'deleted'
  >().notNull(),
  task_title: text('task_title').notNull(),   // snapshot at time of action
  project_name: text('project_name'),          // snapshot ('Inbox' if null)
  old_value: text('old_value'),
  new_value: text('new_value'),
  created_at: timestamp('created_at').defaultNow(),
})
