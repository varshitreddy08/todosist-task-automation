'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/useAppStore'
import { useProjects } from '@/hooks/useProjects'
import { Search, CheckSquare, FolderOpen, LayoutDashboard, BarChart3, Zap, Target, Clock, Plus, BookOpen, Calendar, Heart, ArrowRight } from 'lucide-react'
import type { Task } from '@/types'

const QUICK_ACTIONS = [
  { label: 'Add new task', icon: Plus, action: 'add-task', shortcut: 'N' },
  { label: 'Dashboard',    icon: LayoutDashboard, action: 'nav:/dashboard' },
  { label: 'Today',        icon: CheckSquare, action: 'nav:/today' },
  { label: 'Calendar',     icon: Calendar, action: 'nav:/calendar' },
  { label: 'Analytics',    icon: BarChart3, action: 'nav:/analytics' },
  { label: 'Study Hub',    icon: BookOpen, action: 'nav:/study' },
  { label: 'Habits',       icon: Heart, action: 'nav:/habits' },
  { label: 'Goals',        icon: Target, action: 'nav:/goals' },
  { label: 'Focus Mode',   icon: Clock, action: 'nav:/focus' },
  { label: 'Automations',  icon: Zap, action: 'nav:/automations' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const router = useRouter()
  const { setQuickAddOpen } = useAppStore()
  const { data: projects = [] } = useProjects()

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'search', query],
    queryFn: () => fetch(`/api/tasks?q=${encodeURIComponent(query)}&limit=8`).then(r => r.ok ? r.json() : []),
    enabled: query.length > 1,
    staleTime: 5000,
  })

  // Expose open handler for external use
  useEffect(() => {
    ;(window as any).__openCommandPalette = () => setOpen(true)
  }, [])

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const filteredActions = query
    ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_ACTIONS.slice(0, 5)

  const filteredProjects = query
    ? projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : projects.slice(0, 3)

  const allItems = [
    ...tasks.map(t => ({ type: 'task' as const, id: t.id, label: t.title, sub: t.status, priority: t.priority })),
    ...filteredProjects.map(p => ({ type: 'project' as const, id: p.id, label: p.name, color: p.color })),
    ...filteredActions.map(a => ({ type: 'action' as const, ...a })),
  ]

  function execute(item: (typeof allItems)[number]) {
    setOpen(false)
    setQuery('')
    if (item.type === 'task') {
      router.push(`/inbox`)
    } else if (item.type === 'project') {
      router.push(`/projects/${item.id}`)
    } else if (item.type === 'action') {
      const a = item as typeof QUICK_ACTIONS[number]
      if (a.action === 'add-task') { setQuickAddOpen(true) }
      else if (a.action.startsWith('nav:')) router.push(a.action.slice(4))
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setQuery('') }}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
            placeholder="Search tasks, projects, actions..."
            className="border-0 bg-transparent focus-visible:ring-0 h-12 text-sm px-0"
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, allItems.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
              if (e.key === 'Enter') { e.preventDefault(); if (allItems[activeIdx]) execute(allItems[activeIdx]) }
            }}
          />
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {tasks.length > 0 && (
            <Section label="Tasks">
              {tasks.map((t, i) => {
                const idx = i
                return (
                  <Item key={t.id} active={activeIdx === idx} onClick={() => execute(allItems[idx])}>
                    <CheckSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate">{t.title}</span>
                    {t.priority && t.priority !== 'p4' && (
                      <Badge className={`text-xs border-0 ${t.priority === 'p1' ? 'bg-red-100 text-red-600' : t.priority === 'p2' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {t.priority.toUpperCase()}
                      </Badge>
                    )}
                  </Item>
                )
              })}
            </Section>
          )}

          {filteredProjects.length > 0 && (
            <Section label="Projects">
              {filteredProjects.map((p, i) => {
                const idx = tasks.length + i
                return (
                  <Item key={p.id} active={activeIdx === idx} onClick={() => execute(allItems[idx])}>
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color || '#6366f1' }} />
                    <span className="flex-1 truncate">{p.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </Item>
                )
              })}
            </Section>
          )}

          {filteredActions.length > 0 && (
            <Section label={query ? 'Actions' : 'Quick Actions'}>
              {filteredActions.map((a, i) => {
                const idx = tasks.length + filteredProjects.length + i
                return (
                  <Item key={a.action} active={activeIdx === idx} onClick={() => execute(allItems[idx])}>
                    <a.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1">{a.label}</span>
                    {'shortcut' in a && a.shortcut && (
                      <kbd className="text-[10px] text-muted-foreground bg-muted border rounded px-1.5 py-0.5">{a.shortcut}</kbd>
                    )}
                  </Item>
                )
              })}
            </Section>
          )}

          {query && allItems.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="bg-muted border rounded px-1">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="bg-muted border rounded px-1">↵</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="bg-muted border rounded px-1">Esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
      {children}
    </div>
  )
}

function Item({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'}`}
    >
      {children}
    </button>
  )
}
