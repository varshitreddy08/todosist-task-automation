'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store/useAppStore'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Menu, Search, Bell, Sun, Moon, Settings, LogOut, User, HelpCircle, Plus } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export function DashboardHeader({ user }: { user: SupabaseUser }) {
  const { sidebarOpen, setSidebarOpen, setQuickAddOpen } = useAppStore()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  const initials = (user.email || 'U').slice(0, 2).toUpperCase()

  async function signOut() {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 border-b flex items-center px-4 gap-4 bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex-shrink-0">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <Menu className="w-4 h-4" />
      </Button>

      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks, projects..."
            className="pl-9 h-8 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary text-sm"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground bg-background border rounded px-1.5 py-0.5">
            <span>⌘</span><span>K</span>
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <Button variant="ghost" size="sm" className="h-8 gap-2 hidden sm:flex gradient-primary text-white border-0 px-3" onClick={() => setQuickAddOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          <span className="text-xs">Add Task</span>
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Avatar className="h-7 w-7 cursor-pointer">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="gradient-primary text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.user_metadata?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
              <User className="w-4 h-4 mr-2" />Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="w-4 h-4 mr-2" />Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/help')}>
              <HelpCircle className="w-4 h-4 mr-2" />Help
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} variant="destructive">
              <LogOut className="w-4 h-4 mr-2" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
