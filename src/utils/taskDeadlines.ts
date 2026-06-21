import type { ProjectTask } from '@/types/projectWorkflow'

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isTaskOverdue(task: ProjectTask): boolean {
  if (!task.dueDate || task.status === 'done') return false
  return task.dueDate < todayDateKey()
}

export function isTaskDueToday(task: ProjectTask): boolean {
  if (!task.dueDate || task.status === 'done') return false
  return task.dueDate === todayDateKey()
}

export function getOverdueTasks(tasks: Record<string, ProjectTask>, objectIds?: Set<string>): ProjectTask[] {
  return Object.values(tasks)
    .filter((t) => {
      if (objectIds && !objectIds.has(t.objectId)) return false
      return isTaskOverdue(t)
    })
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
}

export function getDueTodayTasks(tasks: Record<string, ProjectTask>, objectIds?: Set<string>): ProjectTask[] {
  return Object.values(tasks)
    .filter((t) => {
      if (objectIds && !objectIds.has(t.objectId)) return false
      return isTaskDueToday(t)
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'ru'))
}
