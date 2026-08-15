'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  MessageSquare, Mail, Key, Plus, Trash2, Copy, CheckCircle2,
  Loader2, RefreshCw, X, ExternalLink, Wifi, WifiOff, Shield, Puzzle, Download, Chrome
} from 'lucide-react'

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

type ApiToken = { id: string; name: string; last_used: string | null; created_at: string; token_preview: string }
type WaStatus = { connected: boolean; state?: string }

export default function IntegrationsPage() {
  const { data: session, update: updateSession } = useSession()
  const [waStep, setWaStep] = useState<'idle' | 'credentials' | 'qr' | 'connected'>('idle')
  const [waInstanceId, setWaInstanceId] = useState('')
  const [waApiToken, setWaApiToken] = useState('')
  const [waStatus, setWaStatus] = useState<WaStatus | null>(null)
  const [qrData, setQrData] = useState<{ message: string; type: string } | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [newTokenName, setNewTokenName] = useState('')
  const [createdToken, setCreatedToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [creatingToken, setCreatingToken] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasGmail = (session as any)?.has_gmail

  useEffect(() => {
    loadStatus()
    loadTokens()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function loadStatus() {
    try {
      const s = await apiFetch<WaStatus>('/api/whatsapp/status')
      setWaStatus(s)
      setWaStep(s.connected ? 'connected' : 'idle')
    } catch { setWaStatus({ connected: false }) }
  }

  async function loadTokens() {
    try { setTokens(await apiFetch<ApiToken[]>('/api/api-tokens')) } catch {}
  }

  async function saveWaCredentials() {
    try {
      await apiFetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_id: waInstanceId, api_token: waApiToken }),
      })
      fetchQR()
      setWaStep('qr')
      // Poll status every 5s
      pollRef.current = setInterval(async () => {
        const s = await apiFetch<WaStatus>('/api/whatsapp/status')
        setWaStatus(s)
        if (s.connected) {
          setWaStep('connected')
          if (pollRef.current) clearInterval(pollRef.current)
          toast.success('WhatsApp connected! 🎉')
        }
      }, 5000)
    } catch { toast.error('Failed to save credentials') }
  }

  async function fetchQR() {
    setQrLoading(true)
    try {
      const data = await apiFetch<any>('/api/whatsapp/qr')
      setQrData(data)
    } catch { toast.error('Failed to get QR') }
    setQrLoading(false)
  }

  async function disconnectWa() {
    await apiFetch('/api/whatsapp/qr', { method: 'DELETE' })
    setWaStep('idle')
    setWaStatus({ connected: false })
    setQrData(null)
    toast.success('WhatsApp disconnected')
  }

  async function createToken() {
    if (!newTokenName) return
    setCreatingToken(true)
    try {
      const data = await apiFetch<{ token: string } & ApiToken>('/api/api-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName }),
      })
      setCreatedToken(data.token)
      setNewTokenName('')
      loadTokens()
    } catch { toast.error('Failed to create token') }
    setCreatingToken(false)
  }

  async function deleteToken(id: string) {
    await apiFetch('/api/api-tokens', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadTokens()
  }

  function copyToken(t: string) {
    navigator.clipboard.writeText(t)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect WhatsApp, Gmail, and manage API tokens for the Chrome extension</p>
      </div>

      {/* ── WhatsApp ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold">WhatsApp</p>
              <p className="text-xs text-muted-foreground">Send messages from your personal number</p>
            </div>
          </div>
          {waStatus && (
            <Badge className={`gap-1.5 ${waStatus.connected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-0' : 'bg-muted text-muted-foreground border-0'}`}>
              {waStatus.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {waStatus.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          )}
        </div>

        <AnimatePresence mode="wait">
          {waStep === 'connected' && (
            <motion.div key="connected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4" /> WhatsApp is connected and ready to send messages
              </div>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={disconnectWa}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Disconnect WhatsApp
              </Button>
            </motion.div>
          )}

          {waStep === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Uses <a href="https://green-api.com" target="_blank" rel="noopener" className="text-primary hover:underline">Green API</a> (free — 1,500 messages/month).
                Create a free instance, then enter your credentials below.
              </p>
              <div className="flex gap-2">
                <Button size="sm" className="gradient-primary text-white border-0" onClick={() => setWaStep('credentials')}>
                  Connect WhatsApp
                </Button>
                <a href="https://green-api.com" target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-muted transition-colors">
                  Get free API <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          )}

          {waStep === 'credentials' && (
            <motion.div key="creds" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Setup steps:</p>
                <p>1. Go to <a href="https://green-api.com" target="_blank" className="text-primary">green-api.com</a> → sign up free</p>
                <p>2. Create an instance → get Instance ID and API Token</p>
                <p>3. Paste them below → scan the QR with your WhatsApp</p>
              </div>
              <Input placeholder="Instance ID (e.g. 1101234567)" value={waInstanceId} onChange={e => setWaInstanceId(e.target.value)} />
              <Input placeholder="API Token" value={waApiToken} onChange={e => setWaApiToken(e.target.value)} type="password" />
              <div className="flex gap-2">
                <Button className="flex-1 gradient-primary text-white border-0" disabled={!waInstanceId || !waApiToken} onClick={saveWaCredentials}>
                  Save & Show QR Code
                </Button>
                <Button variant="outline" onClick={() => setWaStep('idle')}><X className="w-4 h-4" /></Button>
              </div>
            </motion.div>
          )}

          {waStep === 'qr' && (
            <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Open WhatsApp on your phone → Linked Devices → Link a Device → scan:</p>
              {qrLoading ? (
                <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
              ) : qrData?.type === 'qrCode' ? (
                <div className="flex justify-center">
                  <img src={`data:image/png;base64,${qrData.message}`} alt="WhatsApp QR" className="w-48 h-48 rounded-xl border" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{qrData?.message ?? 'Waiting for QR...'}</p>
              )}
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={fetchQR}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh QR</Button>
                <Button variant="outline" size="sm" onClick={() => { setWaStep('idle'); if (pollRef.current) clearInterval(pollRef.current) }}>Cancel</Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Waiting for you to scan...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ── Gmail ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
              <Mail className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-semibold">Gmail</p>
              <p className="text-xs text-muted-foreground">Send automated emails from your own Gmail address</p>
            </div>
          </div>
          <Badge className={`gap-1.5 ${hasGmail ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-0' : 'bg-muted text-muted-foreground border-0'}`}>
            {hasGmail ? <><CheckCircle2 className="w-3 h-3" /> Connected</> : <><WifiOff className="w-3 h-3" /> Not connected</>}
          </Badge>
        </div>

        {hasGmail ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Gmail connected as <span className="font-medium">{session?.user?.email}</span>
            </div>
            <p className="text-xs text-muted-foreground">AI-scheduled emails will send directly from your Gmail inbox.</p>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={async () => {
              await fetch('/api/integrations/gmail/disconnect', { method: 'DELETE' })
              await updateSession({ has_gmail: false })
              toast.success('Gmail disconnected')
            }}>
              <X className="w-3.5 h-3.5 mr-1.5" /> Disconnect Gmail
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Connect your Google account to send emails directly from your Gmail — no SMTP setup needed.</p>
            <Button className="gradient-primary text-white border-0 gap-2" onClick={() => signIn('google', { callbackUrl: '/settings/integrations' })}>
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Connect Gmail
            </Button>
          </div>
        )}
      </Card>

      {/* ── Chrome Extension ── */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <Puzzle className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold">Chrome Extension</p>
            <p className="text-xs text-muted-foreground">Quick access to tasks and study timer from any webpage</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground text-sm">How to install:</p>
            <p>1. Download the extension from GitHub below</p>
            <p>2. Open Chrome → go to <code className="bg-muted px-1 rounded">chrome://extensions</code></p>
            <p>3. Enable <strong>Developer mode</strong> (top-right toggle)</p>
            <p>4. Click <strong>Load unpacked</strong> → select the <code className="bg-muted px-1 rounded">extension</code> folder</p>
            <p>5. Generate an API token below → paste it into the extension</p>
          </div>
          <div className="flex gap-2">
            <a
              href={`https://github.com/varshitreddy08/userinterface/archive/refs/heads/main.zip`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" /> Download Extension (ZIP)
            </a>
            <a
              href="chrome://extensions"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              onClick={e => { e.preventDefault(); navigator.clipboard.writeText('chrome://extensions'); toast.success('Copied! Paste in Chrome address bar') }}
            >
              <ExternalLink className="w-4 h-4" /> Open Chrome Extensions
            </a>
          </div>
        </div>
      </Card>

      {/* ── API Tokens ── */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">API Tokens</p>
            <p className="text-xs text-muted-foreground">For the Chrome extension and external integrations</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Input placeholder="Token name (e.g. Chrome Extension)" value={newTokenName} onChange={e => setNewTokenName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createToken()} />
          <Button className="gradient-primary text-white border-0 flex-shrink-0 gap-1.5" onClick={createToken} disabled={!newTokenName || creatingToken}>
            {creatingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Generate
          </Button>
        </div>

        {createdToken && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
            <p className="text-xs font-semibold text-primary flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Copy this token now — it won't be shown again</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono flex-1 bg-muted rounded px-2 py-1 truncate">{createdToken}</code>
              <Button size="sm" variant="outline" onClick={() => copyToken(createdToken)} className="flex-shrink-0">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setCreatedToken('')}>Dismiss</Button>
          </motion.div>
        )}

        <div className="space-y-2">
          {tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tokens yet — generate one above</p>
          ) : tokens.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 group">
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{t.token_preview}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground hidden group-hover:block">
                  {t.last_used ? `Used ${format(new Date(t.last_used), 'MMM d')}` : 'Never used'}
                </p>
                <button onClick={() => deleteToken(t.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
