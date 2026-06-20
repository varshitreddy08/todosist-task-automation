'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import {
  Plus, FolderOpen, MoreHorizontal, Users, CheckSquare,
  Calendar, Star, Search, Grid3X3, List
} from 'lucide-react'

const projects = [
  { id: '1', name: 'Design Sprint', color: '#6366f1', icon: '🎨', description: 'UI/UX redesign for the main product', progress: 65, tasks: 24, completed: 16, members: 4, due: '2025-02-15', favorite: true, status: 'active' },
  { id: '2', name: 'Q4 Planning', color: '#22c55e', icon: '📊', description: 'Quarterly planning and OKR alignment', progress: 30, tasks: 18, completed: 5, members: 7, due: '2025-01-31', favorite: false, status: 'active' },
  { id: '3', name: 'Research Project', color: '#f59e0b', icon: '🔬', description: 'User research and competitive analysis', progress: 80, tasks: 12, completed: 10, members: 3, due: '2025-02-28', favorite: true, status: 'active' },
  { id: '4', name: 'Personal', color: '#ec4899', icon: '🌟', description: 'Personal tasks and goals', progress: 45, tasks: 30, completed: 14, members: 1, due: null, favorite: false, status: 'active' },
  { id: '5', name: 'Website Redesign', color: '#06b6d4', icon: '💻', description: 'Complete overhaul of company website', progress: 15, tasks: 40, completed: 6, members: 5, due: '2025-03-31', favorite: false, status: 'active' },
  { id: '6', name: 'Mobile App', color: '#8b5cf6', icon: '📱', description: 'iOS and Android app development', progress: 95, tasks: 56, completed: 53, members: 8, due: '2025-01-20', favorite: false, status: 'completed' },
]

export default function ProjectsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const router = useRouter()

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">{projects.filter(p => p.status === 'active').length} active projects</p>
        </div>
        <Button className="gradient-primary text-white border-0 gap-2">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center border rounded-lg overflow-hidden">
          <button onClick={() => setView('grid')} className={`px-3 py-2 transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')} className={`px-3 py-2 transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card
                className="p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer group"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: project.color + '20' }}>
                      {project.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{project.name}</h3>
                      <p className="text-xs text-muted-foreground">{project.completed}/{project.tasks} tasks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {project.favorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}>
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-medium text-foreground">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{project.members}</span>
                    {project.due && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(project.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                  </div>
                  <Badge variant="secondary" className={`text-[10px] ${project.status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-primary/10 text-primary'}`}>
                    {project.status === 'completed' ? 'Done' : 'Active'}
                  </Badge>
                </div>
              </Card>
            </motion.div>
          ))}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: filtered.length * 0.05 }}>
            <button className="w-full h-full min-h-52 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary hover:border-primary transition-colors group">
              <div className="w-12 h-12 rounded-xl border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">New Project</span>
            </button>
          </motion.div>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-4 py-2.5 border-b bg-muted/30 grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-4">Project</div>
            <div className="col-span-2">Progress</div>
            <div className="col-span-2">Tasks</div>
            <div className="col-span-2">Members</div>
            <div className="col-span-2">Due Date</div>
          </div>
          {filtered.map(project => (
            <div key={project.id} className="grid grid-cols-12 gap-3 items-center px-4 py-3 hover:bg-accent/20 transition-colors border-b last:border-0 cursor-pointer" onClick={() => router.push(`/projects/${project.id}`)}>
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: project.color + '20' }}>{project.icon}</div>
                <div>
                  <p className="text-sm font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{project.description}</p>
                </div>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <Progress value={project.progress} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium w-8">{project.progress}%</span>
                </div>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">{project.completed}/{project.tasks}</div>
              <div className="col-span-2 text-sm text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" />{project.members}</div>
              <div className="col-span-2 text-sm text-muted-foreground">{project.due ? new Date(project.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
