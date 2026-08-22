import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task, Project, User } from '@/types'

interface AppState {
  user: User | null
  currentWorkspaceId: string | null
  sidebarOpen: boolean
  selectedProject: Project | null
  viewMode: 'list' | 'board' | 'calendar'
  searchQuery: string
  quickAddOpen: boolean
  pomodoroActive: boolean
  pomodoroMinutes: number

  setUser: (user: User | null) => void
  setCurrentWorkspace: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  setSelectedProject: (project: Project | null) => void
  setViewMode: (mode: 'list' | 'board' | 'calendar') => void
  setSearchQuery: (q: string) => void
  setQuickAddOpen: (open: boolean) => void
  setPomodoroActive: (active: boolean) => void
  setPomodoroMinutes: (minutes: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      currentWorkspaceId: null,
      sidebarOpen: true,
      selectedProject: null,
      viewMode: 'list',
      searchQuery: '',
      quickAddOpen: false,
      pomodoroActive: false,
      pomodoroMinutes: 25,

      setUser: (user) => set({ user }),
      setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSelectedProject: (project) => set({ selectedProject: project }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setQuickAddOpen: (open) => set({ quickAddOpen: open }),
      setPomodoroActive: (active) => set({ pomodoroActive: active }),
      setPomodoroMinutes: (minutes) => set({ pomodoroMinutes: minutes }),
    }),
    {
      name: 'taskflow-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        viewMode: state.viewMode,
        // currentWorkspaceId is intentionally NOT persisted — stale IDs break FK constraints
      }),
    }
  )
)
