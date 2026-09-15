import { useCallback } from 'react'
import { celebrateCompletion } from '@/lib/task-notify'
import type { Task } from '@/types'

/**
 * Wraps a task-toggle mutation function so that transitions from
 * incomplete → completed play a sound and show a Sonner toast with Undo.
 *
 * Usage:
 *   const handleToggle = useCompleteWithUndo(toggle.mutate)
 *   <TaskRow onToggle={() => handleToggle(task)} />
 */
export function useCompleteWithUndo(mutate: (task: Task) => void) {
  return useCallback((task: Task) => {
    const willComplete = task.status !== 'completed'
    mutate(task)
    if (willComplete) {
      celebrateCompletion({
        title: task.title,
        onUndo: () => mutate({ ...task, status: 'completed' }),
      })
    }
  }, [mutate])
}
