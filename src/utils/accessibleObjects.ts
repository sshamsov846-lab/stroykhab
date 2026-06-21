import type { AppRole } from '@store/userStore'
import { useObjectStore } from '@store/objectStore'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { loadMembersFromDisk, loadUserObjectsFromDisk, mergeMembers } from '@utils/objectAccessStorage'
import type { ConstructionObject } from '@types'

/** Объекты, к которым пользователь подключён через общий стор objectAccess */
export function getAccessibleObjectIds(userKey: string, role: AppRole): string[] {
  const memory = useObjectAccessStore.getState().members
  const allMembers = mergeMembers(memory, loadMembersFromDisk())
  const ids = new Set<string>()

  for (const m of allMembers) {
    if (m.revokedAt) continue
    if (m.userKey !== userKey) continue
    if (role === 'client' && m.role !== 'client') continue
    if (role === 'foreman' && m.role !== 'foreman') continue
    if (role === 'subcontractor' && m.role !== 'subcontractor') continue
    if (role === 'worker' && m.role !== 'worker') continue
    ids.add(m.objectId)
  }

  return [...ids]
}

export function getAccessibleObjects(userKey: string, role: AppRole): ConstructionObject[] {
  const ids = new Set(getAccessibleObjectIds(userKey, role))
  if (!ids.size) return []

  const byId = new Map<string, ConstructionObject>()
  for (const o of loadUserObjectsFromDisk()) {
    if (ids.has(o.id)) byId.set(o.id, o as ConstructionObject)
  }
  for (const o of useObjectStore.getState().userObjects) {
    if (ids.has(o.id)) byId.set(o.id, o)
  }

  return [...byId.values()]
}
