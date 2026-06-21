import { useObjectStore } from '@store/objectStore'
import { logTaskAudit } from '@store/auditLogStore'

function workerDisplayName(workerId: string): string {
  const { teamMembers, contractorWorkers } = useObjectStore.getState()
  const foremanWorker = teamMembers.find((m) => m.id === workerId)
  if (foremanWorker) return foremanWorker.name
  for (const workers of Object.values(contractorWorkers)) {
    const found = workers.find((m) => m.id === workerId)
    if (found) return found.name
  }
  return workerId
}

export function logAssignmentChange(
  taskId: string,
  prevWorkerId: string | undefined,
  nextWorkerId: string | null | undefined,
): void {
  const oldValue = prevWorkerId ? workerDisplayName(prevWorkerId) : '—'
  const newValue = nextWorkerId ? workerDisplayName(nextWorkerId) : '—'
  if (oldValue === newValue) return
  logTaskAudit({
    taskId,
    field: 'assignment',
    oldValue,
    newValue,
  })
}

export function logTaskCreated(taskId: string, title: string): void {
  logTaskAudit({
    taskId,
    field: 'created',
    fieldLabel: 'Создание задачи',
    oldValue: '—',
    newValue: title,
  })
}
