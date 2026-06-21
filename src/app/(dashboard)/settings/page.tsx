'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { User, Bell, Shield, Palette, Camera, Trash2, Check, Loader2 } from 'lucide-react'

const notifSettings = [
  { key: 'task_due', label: 'Task due reminders', desc: 'Get notified when tasks are due soon', default: true },
  { key: 'task_assigned', label: 'Task assignments', desc: 'When someone assigns you a task', default: true },
  { key: 'project_updates', label: 'Project updates', desc: 'Activity in your shared projects', default: false },
  { key: 'weekly_report', label: 'Weekly report', desc: 'Receive your weekly productivity summary', default: true },
  { key: 'daily_summary', label: 'Daily summary', desc: "Morning email with today's tasks", default: true },
  { key: 'ai_suggestions', label: 'AI suggestions', desc: 'AI-powered productivity tips', default: true },
]

export default function SettingsPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [initials, setInitials] = useState('U')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Notifications state
  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    Object.fromEntries(notifSettings.map(n => [n.key, n.default]))
  )

  // Appearance state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  // Load real user on mount
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const fullName: string = user.user_metadata?.full_name || ''
      const parts = fullName.split(' ')
      setFirstName(parts[0] || '')
      setLastName(parts.slice(1).join(' ') || '')
      setEmail(user.email || '')
      setAvatarUrl(user.user_metadata?.avatar_url || '')
      setInitials((user.email || 'U').slice(0, 2).toUpperCase())
    }
    loadUser()
  }, [])

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, GIF or WebP allowed')
      return
    }

    setUploadingPhoto(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      })
      if (updateError) throw updateError

      // Also update public.users table
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id)

      setAvatarUrl(publicUrl + '?t=' + Date.now())
      toast.success('Photo updated!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      if (msg.includes('Bucket not found') || msg.includes('storage')) {
        toast.error('Create an "avatars" storage bucket in Supabase first (Storage → New bucket → avatars → Public)')
      } else {
        toast.error(msg)
      }
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function saveProfile() {
    setSavingProfile(true)
    try {
      const fullName = `${firstName} ${lastName}`.trim()
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      })
      if (error) throw error
      await supabase.from('users').update({ full_name: fullName }).eq('id', (await supabase.auth.getUser()).data.user!.id)
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return
      if (key === 'daily_summary') {
        const res = await fetch('/api/email/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.email,
            summary: { name: user.user_metadata?.full_name || user.email, completed: 0, pending: 0, overdue: 0 },
          }),
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
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1">
            <TabsContent value="profile">
              <Card className="p-6">
                <h2 className="font-semibold text-lg mb-6">Profile Information</h2>

                {/* Avatar upload */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="gradient-primary text-white text-2xl font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {uploadingPhoto && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 mb-2"
                      disabled={uploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingPhoto
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                        : <><Camera className="w-3.5 h-3.5" /> Change Photo</>
                      }
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WebP. Max 5MB.</p>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      className="mt-1.5"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      className="mt-1.5"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      className="mt-1.5 bg-muted/40"
                      value={email}
                      readOnly
                      title="Email cannot be changed here"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Email is managed through your login provider.</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    className="gradient-primary text-white border-0"
                    onClick={saveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                      : <><Check className="w-4 h-4 mr-2" /> Save Changes</>
                    }
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
                      <div className="flex-1">
                        <div className="font-medium text-sm">{setting.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{setting.desc}</div>
                      </div>
                      <Switch
                        checked={notifs[setting.key]}
                        onCheckedChange={(v: boolean) => toggleNotif(setting.key, v)}
                      />
                    </div>
                  ))}
                </div>
                <Separator className="my-6" />
                <div>
                  <h3 className="font-medium mb-4">Email Digest Frequency</h3>
                  <div className="flex gap-2">
                    {['Real-time', 'Daily', 'Weekly'].map(opt => (
                      <button key={opt} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${opt === 'Daily' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                        {opt}
                      </button>
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
                    {[
                      { id: 'light', label: 'Light', preview: 'bg-white border-2' },
                      { id: 'dark', label: 'Dark', preview: 'bg-zinc-900 border-zinc-700' },
                      { id: 'system', label: 'System', preview: 'bg-gradient-to-r from-white to-zinc-900' },
                    ].map(t => (
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
                    {[
                      { label: 'Compact mode', desc: 'Reduce padding and spacing in the sidebar' },
                      { label: 'Show task counts', desc: 'Display task counts next to project names' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{s.label}</div>
                          <div className="text-xs text-muted-foreground">{s.desc}</div>
                        </div>
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
                    <div>
                      <Label htmlFor="current_pass">Current Password</Label>
                      <Input id="current_pass" type="password" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="new_pass">New Password</Label>
                      <Input id="new_pass" type="password" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="confirm_pass">Confirm New Password</Label>
                      <Input id="confirm_pass" type="password" className="mt-1.5" />
                    </div>
                    <Button className="gradient-primary text-white border-0">Update Password</Button>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-4">Once you delete your account, there is no going back.</p>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
