import type { ProjectTask } from '@/types/projectWorkflow'
import { SPECIALIZATION_OPTIONS } from '@/constants/specializations'
import { useUserStore } from '@store/userStore'
import { useObjectStore } from '@store/objectStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { zoneWorkLabel, isZoneTask } from '@utils/zoneHelpers'
import { WORK_TYPE_LABELS } from '@api/hierarchy'

export function buildTaskZoneLabel(task?: ProjectTask): string {
  if (!task) return '—'
  if (task.isSideJob && task.title) return task.title
  if (isZoneTask(task)) {
    return `${zoneWorkLabel(task)} — ${task.apartmentNumber}`
  }
  const parts: string[] = []
  if (task.section) parts.push(task.section)
  if (task.entrance) parts.push(`Подъезд ${task.entrance}`)
  if (task.floor != null && task.floor !== '') parts.push(`Эт. ${task.floor}`)
  if (task.apartmentNumber) parts.push(`кв. ${task.apartmentNumber}`)
  if (parts.length) return parts.join(', ')
  return task.house || '—'
}

export function buildSpecializationLabel(specIds?: string[]): string {
  const ids = specIds?.length ? specIds : useUserStore.getState().specializationIds
  if (!ids.length) return '—'
  return ids
    .map((id) => SPECIALIZATION_OPTIONS.find((s) => s.id === id)?.label ?? id)
    .join(', ')
}

export function resolveWorkerUserKey(workerId: string): string | undefined {
  const member = useObjectStore.getState().teamMembers.find((m) => m.id === workerId)
  if (member?.userKey) return member.userKey
  const contractor = Object.values(useObjectStore.getState().contractorWorkers)
    .flat()
    .find((m) => m.id === workerId)
  return contractor?.userKey
}

export function resolveWorkerCode(workerId: string): string {
  const personalCode = useUserStore.getState().personalCode
  const member = useObjectStore.getState().teamMembers.find((m) => m.id === workerId)
  const contractor = Object.values(useObjectStore.getState().contractorWorkers)
    .flat()
    .find((m) => m.id === workerId)
  return member?.personalCode || contractor?.personalCode || personalCode || ''
}

export function buildCalculatorMeta(params: {
  taskId: string
  objectId: string
  workerId: string
  workerName: string
}): {
  objectName: string
  zoneLabel: string
  specializationLabel: string
  workerCode: string
} {
  const task = useProjectWorkflowStore.getState().tasks[params.taskId]
  const obj = useObjectStore.getState().userObjects.find((o) => o.id === params.objectId)
  return {
    objectName: obj?.name ?? task?.section ?? task?.house ?? 'Объект',
    zoneLabel: buildTaskZoneLabel(task),
    specializationLabel: buildSpecializationLabel(),
    workerCode: resolveWorkerCode(params.workerId),
  }
}

export function taskTitleForCalculator(task?: ProjectTask): string {
  if (!task) return 'Задача'
  if (task.isSideJob && task.title) return task.title
  if (isZoneTask(task)) return `${zoneWorkLabel(task)} — ${task.apartmentNumber}`
  return `${WORK_TYPE_LABELS[task.workType] ?? task.workType} — кв. ${task.apartmentNumber}`
}
