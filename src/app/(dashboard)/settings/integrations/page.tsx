'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Key, Plus, Trash2, Copy, CheckCircle2,
  Loader2, ExternalLink, Shield, Puzzle, Download
} from 'lucide-react'

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

type ApiToken = { id: string; name: string; last_used: string | null; created_at: string; token_preview: string }

export default function IntegrationsPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [newTokenName, setNewTokenName] = useState('')
  const [createdToken, setCreatedToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [creatingToken, setCreatingToken] = useState(false)

  useEffect(() => {
    loadTokens()
  }, [])

  async function loadTokens() {
    try { setTokens(await apiFetch<ApiToken[]>('/api/api-tokens')) } catch {}
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
    try {
      await apiFetch('/api/api-tokens', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      loadTokens()
    } catch { toast.error('Failed to delete token') }
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
        <p className="text-muted-foreground text-sm mt-1">Manage API tokens for the Chrome extension</p>
      </div>

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
