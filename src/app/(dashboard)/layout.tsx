import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/layout/sidebar'
import { DashboardHeader } from '@/components/layout/header'
import type { User } from '@supabase/supabase-js'

async function getUser(): Promise<User | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || supabaseUrl === 'your_supabase_url' || !supabaseKey) return null

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  // In dev without Supabase configured, allow access with a mock user
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isConfigured = supabaseUrl && supabaseUrl !== 'your_supabase_url'

  if (isConfigured && !user) redirect('/login')

  const effectiveUser = user ?? {
    id: 'dev-user',
    email: 'dev@taskflow.app',
    user_metadata: { full_name: 'Developer' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar user={effectiveUser} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader user={effectiveUser} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
