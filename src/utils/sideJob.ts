import type { ConstructionObject } from '@types'
import type { AppRole } from '@store/userStore'
import type { ProjectTask } from '@/types/projectWorkflow'
import { getCurrentUserKey } from '@utils/notificationFilter'
import { useObjectStore } from '@store/objectStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { useBrigadeStore } from '@store/brigadeStore'

export type SideJobType = 'apartment' | 'house' | 'premises' | 'other'

export const SIDE_JOB_TYPE_LABELS: Record<SideJobType, string> = {
  apartment: 'Квартира',
  house: 'Частный дом',
  premises: 'Помещение',
  other: 'Другое',
}

export function getForemanOwnerKey(): string {
  return getCurrentUserKey()
}

export function isSideJobObject(obj: ConstructionObject): boolean {
  return !!obj.isSideJob
}

export function ownsSideJob(obj: ConstructionObject, ownerKey?: string): boolean {
  if (!obj.isSideJob) return false
  const key = ownerKey ?? getForemanOwnerKey()
  return obj.ownerForemanKey === key
}

function hasLegacyObjectAccess(objectId: string): boolean {
  return !useObjectAccessStore.getState().hasAccessControl(objectId)
}

function userHasObjectAccess(
  objectId: string,
  role: AppRole,
  userKey: string,
  workerId?: string,
): boolean {
  if (hasLegacyObjectAccess(objectId)) {
    if (role === 'worker') {
      if (!workerId) return false
      const tasks = useProjectWorkflowStore.getState().getTasksByObject(objectId)
      const { workerTaskAssignments, contractorWorkerAssignments } = useObjectStore.getState()
      return tasks.some(
        (t) => workerTaskAssignments[t.id] === workerId || contractorWorkerAssignments[t.id] === workerId,
      )
    }
    return true
  }

  const accessStore = useObjectAccessStore.getState()
  if (accessStore.isUserConnected(objectId, userKey)) return true

  if (role === 'worker' && workerId) {
    return accessStore.getActiveMembers(objectId).some(
      (m) => m.role === 'worker' && m.workerMemberId === workerId,
    )
  }

  return false
}

/** Объекты, видимые текущему пользователю */
export function filterObjectsForRole(
  objects: ConstructionObject[],
  role: AppRole,
  ctx?: { ownerKey?: string; workerId?: string; userKey?: string },
): ConstructionObject[] {
  const ownerKey = ctx?.ownerKey ?? getForemanOwnerKey()
  const workerId = ctx?.workerId
  const userKey = ctx?.userKey ?? getCurrentUserKey()

  return objects.filter((obj) => {
    if (obj.isSideJob) {
      if (role === 'client' || role === 'subcontractor') return false
      if (role === 'foreman') return ownsSideJob(obj, ownerKey)
      if (role === 'worker') {
        if (!workerId) return false
        const tasks = useProjectWorkflowStore.getState().getTasksByObject(obj.id)
        const assignments = useObjectStore.getState().workerTaskAssignments
        return tasks.some((t) => assignments[t.id] === workerId)
      }
      return false
    }

    return userHasObjectAccess(obj.id, role, userKey, workerId)
  })
}

export function canAccessObject(
  objectId: string,
  role: AppRole,
  ctx?: { ownerKey?: string; workerId?: string; userKey?: string },
): boolean {
  const userKey = ctx?.userKey ?? getCurrentUserKey()
  const fromStore = useObjectStore.getState().userObjects.find((o) => o.id === objectId)
  if (fromStore) {
    return filterObjectsForRole([fromStore], role, ctx).length > 0
  }

  if (hasLegacyObjectAccess(objectId)) {
    if (role === 'client' || role === 'subcontractor') return false
    return role === 'foreman'
  }

  return userHasObjectAccess(objectId, role, userKey, ctx?.workerId)
}

export function canAccessTask(
  task: ProjectTask,
  role: AppRole,
  ctx?: { ownerKey?: string; workerId?: string; userKey?: string },
): boolean {
  if (!canAccessObject(task.objectId, role, ctx)) return false

  if (!task.isSideJob) {
    if (role === 'worker') {
      const wid = ctx?.workerId
      const userKey = ctx?.userKey ?? getCurrentUserKey()
      if (!wid && !userKey) return false
      const { brigadeTaskAssignments, workerTaskAssignments, contractorWorkerAssignments } =
        useObjectStore.getState()
      const brigadeId = brigadeTaskAssignments[task.id]
      if (brigadeId && userKey) {
        const myBrigade = useBrigadeStore.getState().getBrigadeForUser(userKey)
        if (myBrigade?.id === brigadeId) return true
      }
      if (!wid) return false
      const a = workerTaskAssignments[task.id]
      const b = contractorWorkerAssignments[task.id]
      return a === wid || b === wid
    }
    return true
  }

  if (role === 'client' || role === 'subcontractor') return false
  if (role === 'foreman') {
    const obj = useObjectStore.getState().userObjects.find((o) => o.id === task.objectId)
    return obj ? ownsSideJob(obj, ctx?.ownerKey) : true
  }
  if (role === 'worker') {
    const wid = ctx?.workerId
    if (!wid) return false
    const a = useObjectStore.getState().workerTaskAssignments[task.id]
    const b = useObjectStore.getState().contractorWorkerAssignments[task.id]
    return a === wid || b === wid
  }
  return false
}

export function objectSourceLabel(objectId?: string): string {
  if (!objectId) return 'Объект'
  const obj = useObjectStore.getState().userObjects.find((o) => o.id === objectId)
  if (!obj) return 'Объект'
  if (obj.isSideJob) return `🔧 Подработка: ${obj.name}`
  return obj.name
}
