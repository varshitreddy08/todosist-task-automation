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
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { Menu, Search, Bell, Sun, Moon, Settings, LogOut, User, HelpCircle, Plus } from 'lucide-react'
import { useTheme } from 'next-themes'

interface AppUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export function DashboardHeader({ user }: { user: AppUser }) {
  const { sidebarOpen, setSidebarOpen, setQuickAddOpen } = useAppStore()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const initials = (user.email || 'U').slice(0, 2).toUpperCase()

  async function handleSignOut() {
    await signOut({ redirect: false })
    toast.success('Signed out')
    router.push('/login')
  }

  return (
    <header className="h-14 border-b flex items-center px-4 gap-4 bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex-shrink-0">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <Menu className="w-4 h-4" />
      </Button>

      <div className="flex-1 max-w-md">
        <button
          onClick={() => (window as any).__openCommandPalette?.()}
          className="w-full flex items-center gap-2.5 h-8 px-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-left"
        >
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="flex-1 text-sm text-muted-foreground">Search tasks, projects...</span>
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground bg-background border rounded px-1.5 py-0.5 flex-shrink-0">
            ⌘K
          </kbd>
        </button>
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
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="gradient-primary text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name || 'User'}</p>
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
            <DropdownMenuItem onClick={handleSignOut} variant="destructive">
              <LogOut className="w-4 h-4 mr-2" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
