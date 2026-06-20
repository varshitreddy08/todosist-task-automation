export type Priority = 'p1' | 'p2' | 'p3' | 'p4'
export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type ViewMode = 'list' | 'board' | 'calendar'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  timezone: string
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  owner_id: string
  created_at: string
}

export interface Project {
  id: string
  workspace_id: string
  name: string
  description: string | null
  color: string
  icon: string | null
  is_favorite: boolean
  progress: number
  created_by: string
  created_at: string
  updated_at: string
  task_count?: number
  completed_count?: number
}

export interface Section {
  id: string
  project_id: string
  name: string
  position: number
  created_at: string
}

export interface Label {
  id: string
  workspace_id: string
  name: string
  color: string
}

export interface Task {
  id: string
  workspace_id: string
  project_id: string | null
  section_id: string | null
  parent_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  due_time: string | null
  is_recurring: boolean
  recurrence_rule: string | null
  assigned_to: string | null
  created_by: string
  position: number
  estimated_minutes: number | null
  actual_minutes: number | null
  completed_at: string | null
  created_at: string
  updated_at: string
  labels?: Label[]
  subtasks?: Task[]
  assignee?: User
}

export interface Comment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  user?: User
}

export interface Attachment {
  id: string
  task_id: string
  user_id: string
  name: string
  url: string
  size: number
  type: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: string
  read: boolean
  action_url: string | null
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  description: string | null
  frequency: string
  color: string
  streak: number
  target_days: number[]
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  target_date: string | null
  progress: number
  status: string
  created_at: string
}

export interface TimeEntry {
  id: string
  task_id: string
  user_id: string
  start_time: string
  end_time: string | null
  duration: number | null
  notes: string | null
  created_at: string
}

export interface Analytics {
  total_tasks: number
  completed_tasks: number
  completion_rate: number
  productivity_score: number
  streak_days: number
  tasks_by_priority: Record<Priority, number>
  tasks_by_status: Record<TaskStatus, number>
  daily_completions: { date: string; count: number }[]
  weekly_completions: { week: string; count: number }[]
}
