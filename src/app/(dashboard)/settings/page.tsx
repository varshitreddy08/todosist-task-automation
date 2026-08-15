'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { User, Bell, Shield, Palette, Check, Loader2, Trash2, Plug } from 'lucide-react'
import Link from 'next/link'

const notifSettings = [
  { key: 'task_due', label: 'Task due reminders', desc: 'Get notified when tasks are due soon', default: true },
  { key: 'task_assigned', label: 'Task assignments', desc: 'When someone assigns you a task', default: true },
  { key: 'project_updates', label: 'Project updates', desc: 'Activity in your shared projects', default: false },
  { key: 'weekly_report', label: 'Weekly report', desc: 'Receive your weekly productivity summary', default: true },
  { key: 'daily_summary', label: 'Daily summary', desc: "Morning email with today's tasks", default: true },
  { key: 'ai_suggestions', label: 'AI suggestions', desc: 'AI-powered productivity tips', default: true },
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [initials, setInitials] = useState('U')
  const [savingProfile, setSavingProfile] = useState(false)
  const [notifs, setNotifs] = useState<Record<string, boolean>>(Object.fromEntries(notifSettings.map(n => [n.key, n.default])))
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    if (!session?.user) return
    const fullName: string = session.user.name || ''
    const parts = fullName.split(' ')
    setFirstName(parts[0] || '')
    setLastName(parts.slice(1).join(' ') || '')
    setEmail(session.user.email || '')
    setInitials((session.user.email || 'U').slice(0, 2).toUpperCase())
  }, [session])

  async function saveProfile() {
    setSavingProfile(true)
    try {
      const fullName = `${firstName} ${lastName}`.trim()
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName }),
      })
      if (!res.ok) throw new Error()
      toast.success('Profile saved!')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  async function toggleNotif(key: string, value: boolean) {
    setNotifs(prev => ({ ...prev, [key]: value }))
    if (value && (key === 'daily_summary' || key === 'weekly_report')) {
      if (!session?.user?.email) return
      if (key === 'daily_summary') {
        const res = await fetch('/api/email/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: session.user.email, summary: { name: session.user.name || session.user.email, completed: 0, pending: 0, overdue: 0 } }),
        })
        if (res.ok) toast.success('Daily summary enabled — test email sent!')
        else toast.success('Daily summary enabled')
      } else {
        toast.success("Weekly report enabled — you'll receive it every Monday")
      }
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" orientation="vertical">
        <div className="flex gap-6">
          <TabsList className="flex flex-col h-auto w-48 bg-muted/30 p-1 rounded-xl flex-shrink-0">
            {[
              { value: 'profile', label: 'Profile', icon: User },
              { value: 'notifications', label: 'Notifications', icon: Bell },
              { value: 'appearance', label: 'Appearance', icon: Palette },
              { value: 'security', label: 'Security', icon: Shield },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="justify-start gap-2 w-full data-active:bg-background data-active:shadow-sm">
                <tab.icon className="w-4 h-4" />{tab.label}
              </TabsTrigger>
            ))}
            <Link href="/settings/integrations" className="flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-foreground">
              <Plug className="w-4 h-4" /> Integrations
            </Link>
          </TabsList>

          <div className="flex-1">
            <TabsContent value="profile">
              <Card className="p-6">
                <h2 className="font-semibold text-lg mb-6">Profile Information</h2>
                <div className="flex items-center gap-4 mb-8">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={session?.user?.image ?? undefined} />
                    <AvatarFallback className="gradient-primary text-white text-2xl font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{session?.user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Profile photo is managed by your sign-in provider.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" className="mt-1.5" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" className="mt-1.5" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" className="mt-1.5 bg-muted/40" value={email} readOnly title="Email is managed by your sign-in provider" />
                    <p className="text-xs text-muted-foreground mt-1">Email is managed through your login provider.</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button className="gradient-primary text-white border-0" onClick={saveProfile} disabled={savingProfile}>
                    {savingProfile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : <><Check className="w-4 h-4 mr-2" /> Save Changes</>}
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card className="p-6">
                <h2 className="font-semibold text-lg mb-6">Notification Preferences</h2>
                <div className="space-y-6">
                  {notifSettings.map(setting => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div className="flex-1"><div className="font-medium text-sm">{setting.label}</div><div className="text-xs text-muted-foreground mt-0.5">{setting.desc}</div></div>
                      <Switch checked={notifs[setting.key]} onCheckedChange={(v: boolean) => toggleNotif(setting.key, v)} />
                    </div>
                  ))}
                </div>
                <Separator className="my-6" />
                <div>
                  <h3 className="font-medium mb-4">Email Digest Frequency</h3>
                  <div className="flex gap-2">
                    {['Real-time', 'Daily', 'Weekly'].map(opt => (
                      <button key={opt} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${opt === 'Daily' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>{opt}</button>
                    ))}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="appearance">
              <Card className="p-6">
                <h2 className="font-semibold text-lg mb-6">Appearance</h2>
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Theme</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ id: 'light', label: 'Light', preview: 'bg-white border-2' }, { id: 'dark', label: 'Dark', preview: 'bg-zinc-900 border-zinc-700' }, { id: 'system', label: 'System', preview: 'bg-gradient-to-r from-white to-zinc-900' }].map(t => (
                      <button key={t.id} onClick={() => setTheme(t.id as typeof theme)} className={`p-3 rounded-xl border-2 text-center transition-all ${theme === t.id ? 'border-primary' : 'border-border'}`}>
                        <div className={`h-12 rounded-lg mb-2 ${t.preview} border`} />
                        <div className="text-sm font-medium">{t.label}</div>
                        {theme === t.id && <div className="text-[10px] text-primary mt-0.5">Active</div>}
                      </button>
                    ))}
                  </div>
                </div>
                <Separator className="my-6" />
                <div>
                  <h3 className="font-medium mb-3">Sidebar</h3>
                  <div className="space-y-3">
                    {[{ label: 'Compact mode', desc: 'Reduce padding and spacing in the sidebar' }, { label: 'Show task counts', desc: 'Display task counts next to project names' }].map(s => (
                      <div key={s.label} className="flex items-center justify-between">
                        <div><div className="text-sm font-medium">{s.label}</div><div className="text-xs text-muted-foreground">{s.desc}</div></div>
                        <Switch />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card className="p-6 space-y-6">
                <div>
                  <h2 className="font-semibold text-lg mb-4">Security</h2>
                  <div className="space-y-4">
                    <div><Label htmlFor="current_pass">Current Password</Label><Input id="current_pass" type="password" className="mt-1.5" /></div>
                    <div><Label htmlFor="new_pass">New Password</Label><Input id="new_pass" type="password" className="mt-1.5" /></div>
                    <div><Label htmlFor="confirm_pass">Confirm New Password</Label><Input id="confirm_pass" type="password" className="mt-1.5" /></div>
                    <Button className="gradient-primary text-white border-0">Update Password</Button>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-4">Once you delete your account, there is no going back.</p>
                  <Button variant="destructive" size="sm" className="gap-2"><Trash2 className="w-4 h-4" /> Delete Account</Button>
                </div>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
