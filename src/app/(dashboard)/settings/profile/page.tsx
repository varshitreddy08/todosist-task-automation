'use client'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { LogOut, Settings, User, Mail, ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<SupabaseUser | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [supabase])

  async function signOut() {
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/login')
    router.refresh()
  }

  const initials = (user?.email || 'U').slice(0, 2).toUpperCase()
  const fullName = user?.user_metadata?.full_name || 'User'
  const email = user?.email || ''

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-sm">Your account details</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-5 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="gradient-primary text-white text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{fullName}</h2>
            <p className="text-muted-foreground text-sm">{email}</p>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground w-24">Name</span>
            <span className="font-medium">{fullName}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground w-24">Email</span>
            <span className="font-medium">{email}</span>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="flex flex-col gap-3">
          <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/settings')}>
            <Settings className="w-4 h-4" />
            Account Settings
          </Button>
          <Button
            variant="destructive"
            className="justify-start gap-2"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  )
}
