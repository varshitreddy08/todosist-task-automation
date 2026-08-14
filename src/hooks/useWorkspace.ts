'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

export function useWorkspace() {
  const { currentWorkspaceId, setCurrentWorkspace } = useAppStore()

  useEffect(() => {
    if (currentWorkspaceId) return

    fetch('/api/workspace')
      .then(r => r.json())
      .then(data => {
        if (data?.workspace_id) setCurrentWorkspace(data.workspace_id)
      })
      .catch(console.error)
  }, [currentWorkspaceId, setCurrentWorkspace])

  return currentWorkspaceId
}
