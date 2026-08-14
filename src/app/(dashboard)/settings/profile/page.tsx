'use client'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { LogOut, Settings, User, Mail, ArrowLeft } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const { data: session } = useSession()

  async function handleSignOut() {
    await signOut({ redirect: false })
    toast.success('Signed out successfully')
    router.push('/login')
  }

  const initials = (session?.user?.email || 'U').slice(0, 2).toUpperCase()
  const fullName = session?.user?.name || 'User'
  const email = session?.user?.email || ''

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
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback className="gradient-primary text-white text-2xl font-bold">{initials}</AvatarFallback>
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
            <Settings className="w-4 h-4" />Account Settings
          </Button>
          <Button variant="destructive" className="justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />Sign Out
          </Button>
        </div>
      </Card>
    </div>
  )
}
