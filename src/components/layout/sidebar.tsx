'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useQuery } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search, Inbox, CalendarCheck2, CalendarRange, LayoutGrid,
  BarChart3, Plus, ChevronDown, Hash, Settings, Bell,
  Moon, Sun, LogOut, User, BookOpen, Heart, Target,
  Clock, Plug, HelpCircle, Activity, CheckCircle2, Pencil, Trash2, X,
} from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import type { Task } from '@/types'

interface AppUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

const ACTIVE = 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-medium'
const INACTIVE = 'text-foreground/80 hover:bg-muted/60 hover:text-foreground'

export function DashboardSidebar({ user }: { user: AppUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { data: projects = [] } = useProjects()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!notifOpen) return
    function close(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [notifOpen])

  const { data: recentActivity = [] } = useQuery<{ id: string; action: string; task_title: string; project_name: string | null; created_at: string }[]>({
    queryKey: ['activity-notif'],
    queryFn: () => fetch('/api/activity?limit=8&date=today').then(r => r.ok ? r.json() : []),
    enabled: notifOpen,
    staleTime: 30000,
  })

  const { data: inboxTasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'inbox'],
    queryFn: () => fetch('/api/tasks').then(r => r.ok ? r.json() : []),
    staleTime: 60000,
  })
  const { data: todayTasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'today'],
    queryFn: () => fetch('/api/tasks?filter=today').then(r => r.ok ? r.json() : []),
    staleTime: 60000,
  })

  const inboxCount = inboxTasks.filter(t => t.status !== 'completed').length
  const todayCount = todayTasks.filter(t => t.status !== 'completed').length

  const displayName = user.name || (user.email ?? '').split('@')[0] || 'User'
  const initials = displayName.slice(0, 1).toUpperCase()

  async function handleSignOut() {
    await signOut({ redirect: false })
    toast.success('Signed out')
    router.push('/login')
  }

  const mainNav = [
    { href: '/inbox',    label: 'Inbox',           icon: Inbox,          count: inboxCount },
    { href: '/today',    label: 'Today',            icon: CalendarCheck2, count: todayCount },
    { href: '/upcoming', label: 'Upcoming',         icon: CalendarRange },
    { href: '/dashboard', label: 'Filters & Labels', icon: LayoutGrid },
    { href: '/analytics', label: 'Reporting',        icon: BarChart3 },
  ]

  const extraNav = [
    { href: '/study',  label: 'Study Hub',    icon: BookOpen },
    { href: '/habits', label: 'Habits',       icon: Heart },
    { href: '/goals',  label: 'Goals',        icon: Target },
    { href: '/focus',  label: 'Focus Mode',   icon: Clock },
    { href: '/settings/integrations', label: 'Integrations', icon: Plug },
  ]

  return (
    <aside className="w-60 flex-shrink-0 h-full flex flex-col bg-sidebar">

      {/* ── User header ── */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg hover:bg-muted/60 px-1.5 py-1 transition-colors min-w-0 flex-1 outline-none">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="bg-emerald-600 text-white text-[11px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold truncate flex-1 text-left">{displayName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
              <User className="w-4 h-4 mr-2" />Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="w-4 h-4 mr-2" />Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} variant="destructive">
              <LogOut className="w-4 h-4 mr-2" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="relative w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Bell className="w-[15px] h-[15px]" />
              {inboxCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-400 rounded-full border border-sidebar" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute left-0 top-full mt-1 w-[340px] bg-background border border-border rounded-xl shadow-xl z-[200] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {recentActivity.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                      <Bell className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No activity today</p>
                    </div>
                  ) : (
                    recentActivity.map(item => (
                      <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 border-b border-border/50 last:border-0">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-[11px] font-bold">{(user.name ?? 'U').slice(0, 1).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-foreground leading-relaxed">
                            <span className="font-medium capitalize">{item.action.replace('_', ' ')}</span>
                            {' · '}
                            <span className="text-muted-foreground truncate">{item.task_title}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.project_name ?? 'Inbox'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            title="Filters & Labels"
          >
            <LayoutGrid className="w-[15px] h-[15px]" />
          </button>
        </div>
      </div>

      {/* ── Add task + Activity ── */}
      <div className="flex items-center gap-1 px-3 py-1 mb-1">
        <button
          onClick={() => useAppStore.getState().setQuickAddOpen(true)}
          className="flex items-center gap-2 flex-1 px-2 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors group font-medium"
        >
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <Plus className="w-3.5 h-3.5 text-white" />
          </div>
          Add task
        </button>
        <button className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
          <Activity className="w-[15px] h-[15px]" />
        </button>
      </div>

      {/* ── Search ── */}
      <div className="px-3 mb-1">
        <button
          onClick={() => (window as any).__openCommandPalette?.()}
          className={cn('flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-sm transition-colors', INACTIVE)}
        >
          <Search className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left">Search</span>
        </button>
      </div>

      {/* ── Main nav ── */}
      <nav className="px-3 space-y-0.5">
        {mainNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors', isActive ? ACTIVE : INACTIVE)}
            >
              <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-red-500' : 'text-muted-foreground')} />
              <span className="flex-1">{item.label}</span>
              {'count' in item && (item.count ?? 0) > 0 && (
                <span className={cn('text-xs font-medium tabular-nums', isActive ? 'text-red-500' : 'text-muted-foreground')}>
                  {item.count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── My Projects ── */}
      <div className="px-3 mt-4 flex-1 overflow-y-auto min-h-0">
        <div className="px-2 py-1 mb-0.5 flex items-center justify-between group/proj">
          <span className="text-xs font-semibold text-muted-foreground">My Projects</span>
          <Link
            href="/projects"
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors opacity-0 group-hover/proj:opacity-100"
            title="Add project"
          >
            <Plus className="w-3.5 h-3.5" />
          </Link>
        </div>
        <nav className="space-y-0.5">
          {projects.map((project) => {
            const isActive = pathname === `/projects/${project.id}`
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors', isActive ? ACTIVE : INACTIVE)}
              >
                <Hash className={cn('w-3.5 h-3.5 flex-shrink-0', isActive ? 'text-red-500' : 'text-muted-foreground')} />
                <span className="flex-1 truncate">{project.name}</span>
                {(project.task_count ?? 0) > 0 && (
                  <span className={cn('text-xs tabular-nums flex-shrink-0', isActive ? 'text-red-500' : 'text-muted-foreground')}>
                    {project.task_count}
                  </span>
                )}
              </Link>
            )
          })}
          {projects.length === 0 && (
            <Link href="/projects" className="px-2 py-1 text-xs text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1.5">
              <Plus className="w-3 h-3" /> Add a project
            </Link>
          )}
        </nav>

        {/* Extra nav */}
        <div className="mt-4 border-t pt-3 space-y-0.5">
          {extraNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors', isActive ? ACTIVE : INACTIVE)}
              >
                <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-red-500' : 'text-muted-foreground')} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Settings ── */}
      <div className="px-3 py-2 border-t flex-shrink-0">
        <Link
          href="/settings"
          className={cn('flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors', pathname.startsWith('/settings') ? ACTIVE : INACTIVE)}
        >
          <Settings className={cn('w-4 h-4 flex-shrink-0', pathname.startsWith('/settings') ? 'text-red-500' : 'text-muted-foreground')} />
          Settings
        </Link>
      </div>
    </aside>
  )
}
