import { getJSON, setJSON, STORAGE_KEYS } from '@services/storage'
import type { InviteChainMode } from '@/types/objectAccess'
import { inviteCodesEqual } from '@utils/objectInviteCode'
import { compactInviteCode } from '@utils/objectAccessStorage'

export interface InviteRegistryEntry {
  objectId: string
  code: string
  objectName: string
  chainMode: InviteChainMode
  reusable: boolean
  updatedAt: string
}

type RegistryMap = Record<string, InviteRegistryEntry>

function readRegistry(): RegistryMap {
  return getJSON<RegistryMap>(STORAGE_KEYS.INVITE_REGISTRY) ?? {}
}

function writeRegistry(registry: RegistryMap): void {
  setJSON(STORAGE_KEYS.INVITE_REGISTRY, registry)
}

/** Сохранить код объекта в отдельный реестр (надёжно переживает любые вкладки) */
export function registerObjectInviteCode(entry: Omit<InviteRegistryEntry, 'updatedAt'>): void {
  const registry = readRegistry()
  const key = compactInviteCode(entry.code)
  registry[key] = { ...entry, updatedAt: new Date().toISOString() }
  writeRegistry(registry)
}

export function findInInviteRegistry(code: string): InviteRegistryEntry | null {
  const registry = readRegistry()
  const key = compactInviteCode(code)
  if (registry[key]) return registry[key]

  for (const entry of Object.values(registry)) {
    if (inviteCodesEqual(entry.code, code)) return entry
  }
  return null
}

/** Если совпадают только 4 цифры в конце — один объект = автоподбор */
export function findUniqueInviteBySuffix(code: string): InviteRegistryEntry | null {
  const suffix = compactInviteCode(code).slice(-4)
  if (suffix.length < 4) return null

  const registry = readRegistry()
  const matches = Object.values(registry).filter((e) => compactInviteCode(e.code).endsWith(suffix))
  return matches.length === 1 ? matches[0] : null
}

/** Синхронизация из zustand invites + objectMeta */
export function rebuildInviteRegistryFromStores(
  invites: Record<string, { objectId: string; code: string; chainMode: InviteChainMode; reusable: boolean }>,
  objectMeta: Record<string, { inviteCode?: string }>,
  objectNames: Map<string, string>,
): void {
  const registry = readRegistry()

  for (const inv of Object.values(invites)) {
    const key = compactInviteCode(inv.code)
    registry[key] = {
      objectId: inv.objectId,
      code: inv.code,
      objectName: objectNames.get(inv.objectId) ?? 'Объект',
      chainMode: inv.chainMode,
      reusable: inv.reusable,
      updatedAt: new Date().toISOString(),
    }
  }

  for (const [objectId, meta] of Object.entries(objectMeta)) {
    if (!meta.inviteCode) continue
    const key = compactInviteCode(meta.inviteCode)
    if (registry[key]) continue
    registry[key] = {
      objectId,
      code: meta.inviteCode,
      objectName: objectNames.get(objectId) ?? 'Объект',
      chainMode: 'organization',
      reusable: true,
      updatedAt: new Date().toISOString(),
    }
  }

  writeRegistry(registry)
}

export function listAllInviteCodes(): string[] {
  return Object.values(readRegistry()).map((e) => e.code)
}
