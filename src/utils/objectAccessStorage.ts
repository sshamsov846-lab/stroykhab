import { getPersistedState, getJSON, STORAGE_KEYS } from '@services/storage'
import type { ObjectInviteSettings, ObjectAccessMember } from '@/types/objectAccess'
import type { ObjectMeta } from '@store/objectStore'
import { inviteCodesEqual, normalizeInviteCode } from '@utils/objectInviteCode'

interface ObjectAccessPersisted {
  invites: Record<string, ObjectInviteSettings>
  members: unknown[]
  codeIndex?: Record<string, string>
}

interface PersistEnvelope<T> {
  state?: T
  version?: number
}

interface ObjectStorePersisted {
  userObjects: Array<{ id: string; name: string }>
  objectMeta: Record<string, ObjectMeta>
}

export function compactInviteCode(code: string): string {
  return normalizeInviteCode(code).replace(/-/g, '')
}

/** Всегда читаем invites из localStorage — актуально для другой вкладки / после перезагрузки */
export function loadInvitesFromDisk(): Record<string, ObjectInviteSettings> {
  const raw = getJSON<PersistEnvelope<ObjectAccessPersisted> & Partial<ObjectAccessPersisted>>(
    STORAGE_KEYS.OBJECT_ACCESS,
  )
  if (!raw) return {}
  if (raw.state?.invites) return raw.state.invites
  if (raw.invites) return raw.invites
  return getPersistedState<ObjectAccessPersisted>(STORAGE_KEYS.OBJECT_ACCESS)?.invites ?? {}
}

export function loadObjectMetaFromDisk(): Record<string, ObjectMeta> {
  const disk = getPersistedState<ObjectStorePersisted>(STORAGE_KEYS.OBJECT)
  return disk?.objectMeta ?? {}
}

export function loadUserObjectsFromDisk(): Array<{ id: string; name: string }> {
  const disk = getPersistedState<ObjectStorePersisted>(STORAGE_KEYS.OBJECT)
  return disk?.userObjects ?? []
}

export function loadMembersFromDisk(): ObjectAccessMember[] {
  const raw = getJSON<PersistEnvelope<ObjectAccessPersisted> & Partial<ObjectAccessPersisted>>(
    STORAGE_KEYS.OBJECT_ACCESS,
  )
  if (!raw) return []
  const members = raw.state?.members ?? raw.members
  if (Array.isArray(members)) return members as ObjectAccessMember[]
  return getPersistedState<ObjectAccessPersisted>(STORAGE_KEYS.OBJECT_ACCESS)?.members as ObjectAccessMember[] ?? []
}

export function mergeMembers(memory: ObjectAccessMember[], disk: ObjectAccessMember[]): ObjectAccessMember[] {
  const byId = new Map<string, ObjectAccessMember>()
  for (const m of disk) byId.set(m.id, m)
  for (const m of memory) byId.set(m.id, m)
  return [...byId.values()]
}

export function mergeInvites(
  memory: Record<string, ObjectInviteSettings>,
  disk: Record<string, ObjectInviteSettings>,
): Record<string, ObjectInviteSettings> {
  return { ...disk, ...memory }
}

export function buildCodeIndex(invites: Record<string, ObjectInviteSettings>): Record<string, string> {
  const index: Record<string, string> = {}
  for (const inv of Object.values(invites)) {
    index[compactInviteCode(inv.code)] = inv.objectId
    for (const old of inv.revokedCodes ?? []) {
      index[compactInviteCode(old)] = inv.objectId
    }
  }
  return index
}

export function findInviteByCodeInRecords(
  code: string,
  invites: Record<string, ObjectInviteSettings>,
  objectNames: Map<string, string>,
): { settings: ObjectInviteSettings; objectId: string; objectName: string } | null {
  for (const inv of Object.values(invites)) {
    if (inviteCodesEqual(inv.code, code)) {
      return {
        settings: inv,
        objectId: inv.objectId,
        objectName: objectNames.get(inv.objectId) ?? 'Объект',
      }
    }
  }
  return null
}

/** Поиск по резервному inviteCode в objectMeta */
export function findInviteByObjectMeta(
  code: string,
  objectMeta: Record<string, ObjectMeta>,
  objectNames: Map<string, string>,
): { objectId: string; objectName: string; code: string } | null {
  for (const [objectId, meta] of Object.entries(objectMeta)) {
    if (meta.inviteCode && inviteCodesEqual(meta.inviteCode, code)) {
      return {
        objectId,
        objectName: objectNames.get(objectId) ?? 'Объект',
        code: meta.inviteCode,
      }
    }
  }
  return null
}

/** Подсказка: тот же суффикс цифр (9301), другой префикс */
export function suggestSimilarInviteCodes(
  code: string,
  invites: Record<string, ObjectInviteSettings>,
): string[] {
  const compact = compactInviteCode(code)
  const suffix = compact.slice(-4)
  if (suffix.length < 4) return []

  return Object.values(invites)
    .filter((inv) => compactInviteCode(inv.code).endsWith(suffix) && !inviteCodesEqual(inv.code, code))
    .map((inv) => inv.code)
    .slice(0, 3)
}

export function buildObjectNameMap(
  memoryObjects: Array<{ id: string; name: string }>,
  diskObjects: Array<{ id: string; name: string }>,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const o of [...diskObjects, ...memoryObjects]) {
    map.set(o.id, o.name)
  }
  return map
}
