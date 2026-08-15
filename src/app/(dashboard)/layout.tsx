import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DashboardSidebar } from '@/components/layout/sidebar'
import { DashboardHeader } from '@/components/layout/header'
import { CommandPalette } from '@/components/layout/command-palette'
import { QuickAddTask } from '@/components/tasks/quick-add-task'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = {
    id: session.user.id ?? '',
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader user={user} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <CommandPalette />
      <QuickAddTask />
    </div>
  )
}
