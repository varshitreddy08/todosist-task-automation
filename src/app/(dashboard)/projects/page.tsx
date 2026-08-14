'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useProjects, useCreateProject } from '@/hooks/useProjects'
import { useWorkspace } from '@/hooks/useWorkspace'
import { toast } from 'sonner'
import { Plus, Search, Grid3X3, List, Loader2, FolderOpen, Star } from 'lucide-react'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#f97316']
const ICONS = ['📁', '🎨', '📊', '🔬', '🌟', '💻', '📱', '🚀', '📝', '🎯', '💡', '🔧']

export default function ProjectsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [icon, setIcon] = useState(ICONS[0])

  const router = useRouter()
  const workspaceId = useWorkspace()
  const { data: projects = [], isLoading } = useProjects()
  const createProject = useCreateProject()

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function resetForm() { setName(''); setDesc(''); setColor(COLORS[0]); setIcon(ICONS[0]) }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !workspaceId) return
    try {
      await createProject.mutateAsync({ name: name.trim(), description: desc.trim() || undefined, color, icon, workspace_id: workspaceId, is_favorite: false })
      toast.success('Project created!')
      setOpen(false)
      resetForm()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">{isLoading ? 'Loading…' : `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`}</p>
        </div>
        <Button className="gradient-primary text-white border-0 gap-2" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> New Project</Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search projects…" className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center border rounded-lg overflow-hidden">
          <button onClick={() => setView('grid')} className={`px-3 py-2 transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}><Grid3X3 className="w-4 h-4" /></button>
          <button onClick={() => setView('list')} className={`px-3 py-2 transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}><List className="w-4 h-4" /></button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 && !search ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
          <FolderOpen className="w-12 h-12" />
          <div className="text-center"><p className="font-medium text-foreground">No projects yet</p><p className="text-sm mt-1">Create your first project to get started</p></div>
          <Button className="gradient-primary text-white border-0 gap-2 mt-2" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Create Project</Button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer group" onClick={() => router.push(`/projects/${project.id}`)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: (project.color || '#6366f1') + '20' }}>{project.icon || '📁'}</div>
                    <div><h3 className="font-semibold">{project.name}</h3><p className="text-xs text-muted-foreground line-clamp-1">{project.description || 'No description'}</p></div>
                  </div>
                  {project.is_favorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                </div>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Progress</span><span className="font-medium text-foreground">{project.progress ?? 0}%</span></div>
                  <Progress value={project.progress ?? 0} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">Active</Badge>
                </div>
              </Card>
            </motion.div>
          ))}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: filtered.length * 0.05 }}>
            <button onClick={() => setOpen(true)} className="w-full h-full min-h-52 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary hover:border-primary transition-colors group">
              <div className="w-12 h-12 rounded-xl border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform"><Plus className="w-6 h-6" /></div>
              <span className="text-sm font-medium">New Project</span>
            </button>
          </motion.div>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-4 py-2.5 border-b bg-muted/30 grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-5">Project</div><div className="col-span-4">Progress</div><div className="col-span-3">Created</div>
          </div>
          {filtered.map(project => (
            <div key={project.id} className="grid grid-cols-12 gap-3 items-center px-4 py-3 hover:bg-accent/20 transition-colors border-b last:border-0 cursor-pointer" onClick={() => router.push(`/projects/${project.id}`)}>
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ backgroundColor: (project.color || '#6366f1') + '20' }}>{project.icon || '📁'}</div>
                <div className="min-w-0"><p className="text-sm font-medium truncate">{project.name}</p><p className="text-xs text-muted-foreground truncate">{project.description || 'No description'}</p></div>
              </div>
              <div className="col-span-4 flex items-center gap-2"><Progress value={project.progress ?? 0} className="h-1.5 flex-1" /><span className="text-xs font-medium w-8 flex-shrink-0">{project.progress ?? 0}%</span></div>
              <div className="col-span-3 text-sm text-muted-foreground">{new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm() }}>
        <DialogContent className="max-w-md">
          <DialogTitle>New Project</DialogTitle>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div><Label htmlFor="proj-name">Name</Label><Input id="proj-name" className="mt-1.5" placeholder="Project name" value={name} onChange={e => setName(e.target.value)} required /></div>
            <div><Label>Description</Label><Textarea className="mt-1.5 resize-none" placeholder="What's this project about?" value={desc} onChange={e => setDesc(e.target.value)} rows={2} /></div>
            <div>
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">{ICONS.map(ic => <button key={ic} type="button" onClick={() => setIcon(ic)} className={`w-8 h-8 rounded text-lg flex items-center justify-center transition-all ${icon === ic ? 'ring-2 ring-primary ring-offset-1 scale-110' : 'hover:bg-muted'}`}>{ic}</button>)}</div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1.5">{COLORS.map(c => <button key={c} type="button" onClick={() => setColor(c)} className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />)}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => { setOpen(false); resetForm() }}>Cancel</Button>
              <Button type="submit" className="gradient-primary text-white border-0" disabled={createProject.isPending || !name.trim()}>{createProject.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Project'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
