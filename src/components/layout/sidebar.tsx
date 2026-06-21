'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard, CheckSquare, FolderOpen, Calendar, BarChart3,
  Settings, Bell, Users, Inbox, Star, ChevronDown, Plus,
  Target, Heart, Clock, Zap, ChevronRight, X, CheckCircle2
} from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import type { User } from '@supabase/supabase-js'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox, badge: '3' },
  { href: '/today', label: 'Today', icon: CheckSquare, badge: '5' },
  { href: '/upcoming', label: 'Upcoming', icon: Calendar },
]

const productivityItems = [
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/habits', label: 'Habits', icon: Heart },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/focus', label: 'Focus Mode', icon: Clock },
]

interface SidebarProps {
  user: User
}

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen } = useAppStore()
  const { data: projects = [] } = useProjects()

  const initials = (user.email || 'U').slice(0, 2).toUpperCase()

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'fixed lg:relative z-50 lg:z-auto h-full flex-shrink-0 overflow-hidden',
          'border-r bg-sidebar flex flex-col',
          !sidebarOpen && 'lg:hidden'
        )}
        style={{ width: sidebarOpen ? 256 : 0 }}
      >
        <div className="flex flex-col h-full w-64">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-14 border-b flex-shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-gradient">TaskFlow</span>
            </Link>
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-6">
              {/* Main nav */}
              <div>
                <Button
                  className="w-full justify-start gap-2 h-9 gradient-primary text-white border-0 mb-3"
                  size="sm"
                  onClick={() => useAppStore.getState().setQuickAddOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </Button>
                <nav className="space-y-0.5">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        pathname === item.href
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="h-5 text-[10px] px-1.5 bg-primary/10 text-primary border-0">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </nav>
              </div>

              <Separator />

              {/* Projects */}
              <div>
                <div className="flex items-center justify-between px-3 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projects</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <nav className="space-y-0.5">
                  {projects.slice(0, 6).map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group',
                        pathname === `/projects/${project.id}`
                          ? 'bg-primary/10 text-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      )}
                    >
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: project.color || '#6366f1' }} />
                      <span className="flex-1 truncate">{project.name}</span>
                      <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {project.progress ?? 0}%
                      </div>
                    </Link>
                  ))}
                  <Link href="/projects" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors">
                    <FolderOpen className="w-4 h-4" />
                    All Projects
                  </Link>
                </nav>
              </div>

              <Separator />

              {/* Productivity */}
              <div>
                <div className="px-3 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Productivity</span>
                </div>
                <nav className="space-y-0.5">
                  {productivityItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        pathname === item.href
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </ScrollArea>

          {/* Bottom user section */}
          <div className="border-t p-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="gradient-primary text-white text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user.user_metadata?.full_name || user.email}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
              <Link href="/settings">
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
