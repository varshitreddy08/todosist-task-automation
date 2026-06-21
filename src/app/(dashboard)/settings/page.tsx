'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  User, Bell, Shield, Palette, Zap, Globe, Mail,
  Camera, Trash2, Key, CreditCard, Building2, Check, Loader2
} from 'lucide-react'

const notifSettings = [
  { key: 'task_due', label: 'Task due reminders', desc: 'Get notified when tasks are due soon', default: true },
  { key: 'task_assigned', label: 'Task assignments', desc: 'When someone assigns you a task', default: true },
  { key: 'project_updates', label: 'Project updates', desc: 'Activity in your shared projects', default: false },
  { key: 'weekly_report', label: 'Weekly report', desc: 'Receive your weekly productivity summary', default: true },
  { key: 'daily_summary', label: 'Daily summary', desc: "Morning email with today's tasks", default: true },
  { key: 'ai_suggestions', label: 'AI suggestions', desc: 'AI-powered productivity tips', default: true },
]

const integrationList = [
  { name: 'Google Calendar', desc: 'Sync tasks with Google Calendar', icon: '📅', connected: true },
  { name: 'Google Drive', desc: 'Attach files from Drive', icon: '📁', connected: false },
  { name: 'Slack', desc: 'Get task notifications in Slack', icon: '💬', connected: false },
  { name: 'GitHub', desc: 'Link commits to tasks', icon: '🐙', connected: true },
  { name: 'Notion', desc: 'Import pages from Notion', icon: '📝', connected: false },
  { name: 'Zapier', desc: 'Connect to 5000+ apps via Zapier', icon: '⚡', connected: false },
]

export default function SettingsPage() {
  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    Object.fromEntries(notifSettings.map(n => [n.key, n.default]))
  )
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [integrations, setIntegrations] = useState<Record<string, boolean>>(
    Object.fromEntries(integrationList.map(i => [i.name, i.connected]))
  )
  const [loadingIntegration, setLoadingIntegration] = useState<string | null>(null)

  async function toggleIntegration(name: string) {
    setLoadingIntegration(name)
    await new Promise(r => setTimeout(r, 1200))
    const next = !integrations[name]
    setIntegrations(prev => ({ ...prev, [name]: next }))
    setLoadingIntegration(null)
    if (next) {
      toast.success(`${name} connected successfully`)
    } else {
      toast.success(`${name} disconnected`)
    }
  }

  function saveProfile() {
    toast.success('Profile updated successfully!')
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
              { value: 'integrations', label: 'Integrations', icon: Zap },
              { value: 'billing', label: 'Billing', icon: CreditCard },
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
                <div className="flex items-center gap-4 mb-8">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src="" />
                    <AvatarFallback className="gradient-primary text-white text-2xl font-bold">AJ</AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm" className="gap-2 mb-2">
                      <Camera className="w-3.5 h-3.5" /> Change Photo
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG, GIF or PNG. Max 5MB.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" defaultValue="Alex" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" defaultValue="Johnson" className="mt-1.5" />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="alex@example.com" className="mt-1.5" />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input id="timezone" defaultValue="America/New_York (UTC-5)" className="mt-1.5" />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input id="bio" placeholder="Tell us about yourself..." className="mt-1.5" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button className="gradient-primary text-white border-0" onClick={saveProfile}>
                    <Check className="w-4 h-4 mr-2" /> Save Changes
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
                        onCheckedChange={(v: boolean) => setNotifs(prev => ({ ...prev, [setting.key]: v }))}
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

            <TabsContent value="integrations">
              <Card className="p-6">
                <h2 className="font-semibold text-lg mb-6">Integrations</h2>
                <div className="space-y-4">
                  {integrationList.map(integration => {
                    const isConnected = integrations[integration.name]
                    const isLoading = loadingIntegration === integration.name
                    return (
                      <div key={integration.name} className="flex items-center justify-between p-4 rounded-xl border hover:bg-accent/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{integration.icon}</span>
                          <div>
                            <div className="font-medium text-sm">{integration.name}</div>
                            <div className="text-xs text-muted-foreground">{integration.desc}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isConnected && (
                            <Badge className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200">
                              Connected
                            </Badge>
                          )}
                          <Button
                            variant={isConnected ? 'outline' : 'default'}
                            size="sm"
                            disabled={isLoading}
                            className={isConnected ? '' : 'gradient-primary text-white border-0'}
                            onClick={() => toggleIntegration(integration.name)}
                          >
                            {isLoading ? (
                              <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />{isConnected ? 'Disconnecting…' : 'Connecting…'}</>
                            ) : (
                              isConnected ? 'Disconnect' : 'Connect'
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="billing">
              <Card className="p-6">
                <h2 className="font-semibold text-lg mb-2">Billing & Plan</h2>
                <div className="rounded-xl border bg-primary/5 p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">Pro Plan</span>
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Active</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">$9/month · Renews Feb 1, 2025</div>
                    </div>
                    <div className="text-2xl font-bold text-primary">$9<span className="text-sm text-muted-foreground">/mo</span></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Plan includes:</h3>
                  {['Unlimited tasks & projects', 'AI features (Gemini)', 'Advanced analytics', 'Calendar sync', 'Workflow automation', 'Priority support', '10 GB storage'].map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-6" />
                <div className="flex gap-3">
                  <Button variant="outline" size="sm">Manage Subscription</Button>
                  <Button variant="outline" size="sm">View Invoices</Button>
                </div>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
