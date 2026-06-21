'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/useAppStore'

const supabase = createClient()

export function useWorkspace() {
  const { currentWorkspaceId, setCurrentWorkspace } = useAppStore()

  useEffect(() => {
    if (currentWorkspaceId) return

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (membership?.workspace_id) {
        setCurrentWorkspace(membership.workspace_id)
        return
      }

      const slug = (user.email!.split('@')[0] + '-' + Date.now())
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')

      const { data: ws } = await supabase
        .from('workspaces')
        .insert({ name: 'My Workspace', slug, owner_id: user.id })
        .select()
        .single()

      if (ws) {
        await supabase.from('workspace_members').insert({
          workspace_id: ws.id,
          user_id: user.id,
          role: 'owner',
        })
        setCurrentWorkspace(ws.id)
      }
    }

    init()
  }, [currentWorkspaceId, setCurrentWorkspace])

  return currentWorkspaceId
}
