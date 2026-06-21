import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { AppRole } from '@store/userStore'
import type {
  InviteChainMode,
  ObjectAccessMember,
  ObjectInviteSettings,
} from '@/types/objectAccess'
import { appRoleToAccessRole } from '@/types/objectAccess'
import {
  generateObjectInviteCode,
  inviteCodesEqual,
} from '@utils/objectInviteCode'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useObjectStore } from '@store/objectStore'
import {
  notifyObjectMemberJoined,
  notifyObjectMemberRevoked,
  notifyWorkerAddedToObject,
} from '@utils/objectAccessNotifications'
import {
  notifyForemanAssignedToObject,
  notifyOrgAddedToObject,
} from '@utils/objectChainNotifications'
import { buildUserKey } from '@utils/notificationFilter'
import { useUserStore } from '@store/userStore'
import {
  buildCodeIndex,
  buildObjectNameMap,
  compactInviteCode,
  findInviteByCodeInRecords,
  findInviteByObjectMeta,
  loadInvitesFromDisk,
  loadMembersFromDisk,
  loadObjectMetaFromDisk,
  loadUserObjectsFromDisk,
  mergeInvites,
  mergeMembers,
} from '@utils/objectAccessStorage'
import {
  findInInviteRegistry,
  findUniqueInviteBySuffix,
  registerObjectInviteCode,
  rebuildInviteRegistryFromStores,
} from '@utils/inviteCodeRegistry'

export { suggestSimilarInviteCodes } from '@utils/objectAccessStorage'

export interface ConnectUserPayload {
  userKey: string
  role: AppRole
  fullName: string
  phone: string
  contractorId?: string
  workerMemberId?: string
}

interface ObjectAccessState {
  invites: Record<string, ObjectInviteSettings>
  members: ObjectAccessMember[]
  /** normalized code → objectId для быстрого поиска */
  codeIndex: Record<string, string>

  createInviteForObject: (
    objectId: string,
    objectName: string,
    chainMode: InviteChainMode,
    reusable?: boolean,
    owner?: ConnectUserPayload,
  ) => ObjectInviteSettings

  findByCode: (code: string) => {
    settings: ObjectInviteSettings
    objectId: string
    objectName: string
  } | null

  findOrgByInviteCode: (code: string) => import('@/types/projectWorkflow').Contractor | undefined

  validateCodeForRole: (code: string, role: AppRole, userKey?: string) => { ok: boolean; reason?: string }

  connectWithCode: (code: string, user: ConnectUserPayload) => {
    ok: boolean
    reason?: string
    objectId?: string
    objectName?: string
  }

  addMemberFromTeam: (params: {
    objectId: string
    workerId: string
    workerName: string
    workerPhone?: string
    addedByUserKey: string
    addedByName: string
    workerUserKey?: string
  }) => void

  revokeMember: (memberId: string, revokedByName: string) => void

  getActiveMembers: (objectId: string) => ObjectAccessMember[]
  getObjectIdsForUser: (userKey: string, role: AppRole) => string[]
  hasAccessControl: (objectId: string) => boolean
  isUserConnected: (objectId: string, userKey: string) => boolean
  getInvite: (objectId: string) => ObjectInviteSettings | undefined

  regenerateCode: (objectId: string, objectName: string) => ObjectInviteSettings | null
  setReusable: (objectId: string, reusable: boolean) => void
  getOwnerUserKey: (objectId: string) => string | undefined

  /** Заказчик добавляет организацию на объект */
  clientAddOrganization: (params: {
    objectId: string
    contractorId: string
    orgName: string
    orgUserKey: string
    orgPhone: string
    addedByName: string
  }) => { ok: boolean; reason?: string }

  /** Организация назначает прораба на объект */
  orgAddForeman: (params: {
    objectId: string
    foremanUserKey: string
    foremanName: string
    foremanPhone: string
    contractorId: string
    orgName: string
    facePhoto?: string
  }) => { ok: boolean; reason?: string }

  /** Прораб добавляет мастеров на объект */
  foremanAddWorkers: (params: {
    objectId: string
    workers: Array<{
      workerId: string
      workerName: string
      workerPhone?: string
      workerUserKey?: string
    }>
    addedByUserKey: string
    addedByName: string
  }) => number
}

function getMergedMembers(state: Pick<ObjectAccessState, 'members'>): ObjectAccessMember[] {
  return mergeMembers(state.members, loadMembersFromDisk())
}

function getMergedInvites(state: Pick<ObjectAccessState, 'invites'>): Record<string, ObjectInviteSettings> {
  return mergeInvites(state.invites, loadInvitesFromDisk())
}

function memberDisplayName(user: ConnectUserPayload): string {
  if (user.role === 'subcontractor') {
    const orgName = useUserStore.getState().organizationName?.trim()
    if (orgName) return orgName
  }
  return user.fullName
}

function allCodes(state: ObjectAccessState): Set<string> {
  const codes = new Set<string>()
  for (const inv of Object.values(state.invites)) {
    codes.add(inv.code.toUpperCase())
    for (const old of inv.revokedCodes) codes.add(old.toUpperCase())
  }
  return codes
}

function memberId(): string {
  return `oam-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function getObjectName(objectId: string): string {
  const memory = useObjectStore.getState().userObjects.find((o) => o.id === objectId)
  if (memory) return memory.name
  const disk = loadUserObjectsFromDisk().find((o) => o.id === objectId)
  return disk?.name ?? 'Объект'
}

function registryToSettings(entry: import('@utils/inviteCodeRegistry').InviteRegistryEntry): ObjectInviteSettings {
  const now = new Date().toISOString()
  return {
    objectId: entry.objectId,
    code: entry.code,
    chainMode: entry.chainMode,
    reusable: entry.reusable,
    usedCount: 0,
    revokedCodes: [],
    createdAt: now,
    updatedAt: now,
  }
}

function resolveInviteLookup(
  get: () => ObjectAccessState,
  code: string,
): {
  settings: ObjectInviteSettings
  objectId: string
  objectName: string
} | null {
  const registryHit = findInInviteRegistry(code) ?? findUniqueInviteBySuffix(code)
  if (registryHit) {
    const mergedInvites = mergeInvites(get().invites, loadInvitesFromDisk())
    const existing = mergedInvites[registryHit.objectId]
    return {
      settings: existing ?? registryToSettings(registryHit),
      objectId: registryHit.objectId,
      objectName: registryHit.objectName || getObjectName(registryHit.objectId),
    }
  }

  const memoryInvites = get().invites
  const mergedInvites = mergeInvites(memoryInvites, loadInvitesFromDisk())
  const objectNames = buildObjectNameMap(
    useObjectStore.getState().userObjects,
    loadUserObjectsFromDisk(),
  )

  const fromInvites = findInviteByCodeInRecords(code, mergedInvites, objectNames)
  if (fromInvites) return fromInvites

  const mergedMeta = {
    ...loadObjectMetaFromDisk(),
    ...useObjectStore.getState().objectMeta,
  }
  const fromMeta = findInviteByObjectMeta(code, mergedMeta, objectNames)
  if (!fromMeta) return null

  const existing = mergedInvites[fromMeta.objectId]
  if (existing) {
    return {
      settings: existing,
      objectId: fromMeta.objectId,
      objectName: fromMeta.objectName,
    }
  }

  const now = new Date().toISOString()
  const repaired: ObjectInviteSettings = {
    objectId: fromMeta.objectId,
    code: fromMeta.code,
    chainMode: 'organization',
    reusable: true,
    usedCount: 0,
    revokedCodes: [],
    createdAt: now,
    updatedAt: now,
  }
  return { settings: repaired, objectId: fromMeta.objectId, objectName: fromMeta.objectName }
}

export const useObjectAccessStore = create<ObjectAccessState>()(
  persist(
    (set, get) => ({
      invites: {},
      members: [],
      codeIndex: {},

      createInviteForObject: (objectId, objectName, chainMode, reusable = true, owner) => {
        const mergedInvites = mergeInvites(get().invites, loadInvitesFromDisk())
        const existing = mergedInvites[objectId] ?? get().invites[objectId]
        if (existing) {
          if (!get().invites[objectId]) {
            set({
              invites: { ...get().invites, [objectId]: existing },
              codeIndex: buildCodeIndex({ ...get().invites, [objectId]: existing }),
            })
          }
          return existing
        }

        const code = generateObjectInviteCode(objectName, allCodes({ ...get(), invites: mergedInvites }))
        const now = new Date().toISOString()
        const settings: ObjectInviteSettings = {
          objectId,
          code,
          chainMode,
          reusable,
          usedCount: 0,
          revokedCodes: [],
          createdAt: now,
          updatedAt: now,
        }

        const members = [...get().members]
        if (owner) {
          members.push({
            id: memberId(),
            objectId,
            userKey: owner.userKey,
            role: 'client',
            fullName: owner.fullName,
            phone: owner.phone,
            connectedAt: now,
            connectedVia: 'owner',
          })
        }

        set({
          invites: { ...get().invites, [objectId]: settings },
          members,
          codeIndex: buildCodeIndex({ ...get().invites, [objectId]: settings }),
        })

        useObjectStore.getState().setObjectInviteCode(objectId, code)

        registerObjectInviteCode({
          objectId,
          code,
          objectName,
          chainMode,
          reusable,
        })

        return settings
      },

      findByCode: (code) => {
        const compact = compactInviteCode(code)
        if (!compact) return null

        const mergedInvites = mergeInvites(get().invites, loadInvitesFromDisk())
        const indexHit = get().codeIndex[compact]
          ?? buildCodeIndex(mergedInvites)[compact]

        if (indexHit && mergedInvites[indexHit]) {
          const inv = mergedInvites[indexHit]
          if (inviteCodesEqual(inv.code, code)) {
            return {
              settings: inv,
              objectId: inv.objectId,
              objectName: getObjectName(inv.objectId),
            }
          }
        }

        const resolved = resolveInviteLookup(get, code)
        if (!resolved) return null

        if (!get().invites[resolved.objectId]) {
          set({
            invites: { ...get().invites, [resolved.objectId]: resolved.settings },
            codeIndex: buildCodeIndex({ ...get().invites, [resolved.objectId]: resolved.settings }),
          })
        }

        return resolved
      },

      /** Код организации (ОРГ-XXXX) — не код объекта */
      findOrgByInviteCode: (code: string) => {
        const contractors = useProjectWorkflowStore.getState().contractors
        return contractors.find((c) => c.inviteCode && inviteCodesEqual(c.inviteCode, code))
      },

      validateCodeForRole: (code, role, userKey) => {
        if (role === 'client') {
          return { ok: false, reason: 'Заказчик создаёт объекты сам — подключение по коду не требуется' }
        }

        const found = resolveInviteLookup(get, code)
        if (!found) return { ok: false, reason: 'Код не найден. Проверьте правильность ввода' }

        const { settings } = found

        if (!settings.reusable && settings.usedCount > 0) {
          const key = userKey ?? ''
          const already = key && getMergedMembers(get()).some(
            (m) => m.objectId === found.objectId && m.userKey === key && !m.revokedAt,
          )
          if (!already) {
            return { ok: false, reason: 'Код одноразовый и уже был использован' }
          }
        }

        if (settings.chainMode === 'foreman' && role === 'subcontractor') {
          return {
            ok: true,
            reason: 'Объект настроен для прямого подключения прораба, но вы можете подключиться по коду заказчика',
          }
        }

        if (settings.chainMode === 'organization' && role === 'foreman') {
          return {
            ok: true,
            reason: 'Рекомендуется сначала подключить организацию, но прораб тоже может войти по коду',
          }
        }

        return { ok: true }
      },

      connectWithCode: (code, user) => {
        const validation = get().validateCodeForRole(code, user.role, user.userKey)
        if (!validation.ok) return { ok: false, reason: validation.reason }

        const found = resolveInviteLookup(get, code)
        if (!found) return { ok: false, reason: 'Код не найден' }

        const accessRole = appRoleToAccessRole(user.role)
        const allMembers = getMergedMembers(get())
        const existing = allMembers.find(
          (m) => m.objectId === found.objectId && m.userKey === user.userKey && !m.revokedAt,
        )
        if (existing) {
          return { ok: true, objectId: found.objectId, objectName: found.objectName }
        }

        const now = new Date().toISOString()
        const displayName = memberDisplayName(user)
        const newMember: ObjectAccessMember = {
          id: memberId(),
          objectId: found.objectId,
          userKey: user.userKey,
          role: accessRole,
          fullName: displayName,
          phone: user.phone,
          contractorId: user.contractorId,
          workerMemberId: user.workerMemberId,
          connectedAt: now,
          connectedVia: 'invite_code',
        }

        const mergedInvites = getMergedInvites(get())
        const invite = mergedInvites[found.objectId] ?? found.settings
        const updatedInvite: ObjectInviteSettings = {
          ...invite,
          usedCount: invite.usedCount + 1,
          updatedAt: now,
        }

        set({
          members: [...get().members, newMember],
          invites: { ...getMergedInvites(get()), [found.objectId]: updatedInvite },
          codeIndex: buildCodeIndex({ ...getMergedInvites(get()), [found.objectId]: updatedInvite }),
        })

        const ownerKey = get().getOwnerUserKey(found.objectId)
        notifyObjectMemberJoined({
          objectId: found.objectId,
          objectName: found.objectName,
          memberName: displayName,
          memberRole: accessRole,
          ownerClientUserKey: ownerKey,
        })

        return { ok: true, objectId: found.objectId, objectName: found.objectName }
      },

      addMemberFromTeam: (params) => {
        const workerUserKey = params.workerUserKey
          ?? buildUserKey(params.workerPhone ?? '', 'worker', '', params.workerName)

        const existing = get().members.find(
          (m) =>
            m.objectId === params.objectId
            && (m.workerMemberId === params.workerId || m.userKey === workerUserKey)
            && !m.revokedAt,
        )
        if (existing) return

        const now = new Date().toISOString()
        const member: ObjectAccessMember = {
          id: memberId(),
          objectId: params.objectId,
          userKey: workerUserKey,
          role: 'worker',
          fullName: params.workerName,
          phone: params.workerPhone ?? '',
          workerMemberId: params.workerId,
          connectedAt: now,
          connectedVia: 'team_add',
        }

        set({ members: [...get().members, member] })

        notifyWorkerAddedToObject({
          objectId: params.objectId,
          objectName: getObjectName(params.objectId),
          workerName: params.workerName,
          workerUserKey: params.workerUserKey,
          foremanName: params.addedByName,
        })
      },

      revokeMember: (memberId, revokedByName) => {
        const member = get().members.find((m) => m.id === memberId && !m.revokedAt)
        if (!member) return

        set({
          members: get().members.map((m) =>
            m.id === memberId ? { ...m, revokedAt: new Date().toISOString() } : m,
          ),
        })

        notifyObjectMemberRevoked({
          objectId: member.objectId,
          objectName: getObjectName(member.objectId),
          memberName: member.fullName,
          memberUserKey: member.userKey,
          revokedByName,
        })
      },

      getActiveMembers: (objectId) =>
        getMergedMembers(get()).filter((m) => m.objectId === objectId && !m.revokedAt),

      getObjectIdsForUser: (userKey, role) => {
        const ids = new Set<string>()
        for (const m of getMergedMembers(get())) {
          if (m.revokedAt) continue
          if (m.userKey !== userKey) continue
          if (role === 'client' && m.role !== 'client') continue
          if (role === 'foreman' && m.role !== 'foreman') continue
          if (role === 'subcontractor' && m.role !== 'subcontractor') continue
          if (role === 'worker' && m.role !== 'worker') continue
          ids.add(m.objectId)
        }
        return [...ids]
      },

      hasAccessControl: (objectId) => !!getMergedInvites(get())[objectId],

      isUserConnected: (objectId, userKey) =>
        getMergedMembers(get()).some((m) => m.objectId === objectId && m.userKey === userKey && !m.revokedAt),

      getInvite: (objectId) => get().invites[objectId],

      regenerateCode: (objectId, objectName) => {
        const current = get().invites[objectId]
        if (!current) return null

        const newCode = generateObjectInviteCode(objectName, allCodes(get()))
        const updated: ObjectInviteSettings = {
          ...current,
          code: newCode,
          revokedCodes: [...current.revokedCodes, current.code.toUpperCase()],
          usedCount: 0,
          updatedAt: new Date().toISOString(),
        }
        set({ invites: { ...get().invites, [objectId]: updated }, codeIndex: buildCodeIndex({ ...get().invites, [objectId]: updated }) })
        useObjectStore.getState().setObjectInviteCode(objectId, newCode)
        registerObjectInviteCode({
          objectId,
          code: newCode,
          objectName,
          chainMode: current.chainMode,
          reusable: current.reusable,
        })
        return updated
      },

      setReusable: (objectId, reusable) => {
        const current = get().invites[objectId]
        if (!current) return
        set({
          invites: {
            ...get().invites,
            [objectId]: { ...current, reusable, updatedAt: new Date().toISOString() },
          },
        })
      },

      getOwnerUserKey: (objectId) => {
        const owner = getMergedMembers(get()).find(
          (m) => m.objectId === objectId && m.role === 'client' && m.connectedVia === 'owner' && !m.revokedAt,
        )
        return owner?.userKey
      },

      clientAddOrganization: (params) => {
        const objectName = getObjectName(params.objectId)
        const dup = getMergedMembers(get()).find(
          (m) =>
            m.objectId === params.objectId
            && m.role === 'subcontractor'
            && m.contractorId === params.contractorId
            && !m.revokedAt,
        )
        if (dup) return { ok: false, reason: 'Организация уже добавлена на объект' }

        if (!getMergedInvites(get())[params.objectId]) {
          get().createInviteForObject(params.objectId, objectName, 'organization', true)
        }

        const now = new Date().toISOString()
        const member: ObjectAccessMember = {
          id: memberId(),
          objectId: params.objectId,
          userKey: params.orgUserKey,
          role: 'subcontractor',
          fullName: params.orgName,
          phone: params.orgPhone,
          contractorId: params.contractorId,
          connectedAt: now,
          connectedVia: 'chain_add',
        }
        set({ members: [...get().members, member] })

        notifyOrgAddedToObject({
          objectId: params.objectId,
          objectName,
          orgUserKey: params.orgUserKey,
          clientName: params.addedByName,
        })

        const ownerKey = get().getOwnerUserKey(params.objectId)
        notifyObjectMemberJoined({
          objectId: params.objectId,
          objectName,
          memberName: params.orgName,
          memberRole: 'subcontractor',
          ownerClientUserKey: ownerKey,
        })

        return { ok: true }
      },

      orgAddForeman: (params) => {
        const objectName = getObjectName(params.objectId)
        const dup = get().members.find(
          (m) =>
            m.objectId === params.objectId
            && m.role === 'foreman'
            && m.userKey === params.foremanUserKey
            && !m.revokedAt,
        )
        if (dup) return { ok: false, reason: 'Прораб уже на объекте' }

        const now = new Date().toISOString()
        const member: ObjectAccessMember = {
          id: memberId(),
          objectId: params.objectId,
          userKey: params.foremanUserKey,
          role: 'foreman',
          fullName: params.foremanName,
          phone: params.foremanPhone,
          contractorId: params.contractorId,
          connectedAt: now,
          connectedVia: 'chain_add',
        }
        set({ members: [...get().members, member] })

        notifyForemanAssignedToObject({
          objectId: params.objectId,
          objectName,
          foremanUserKey: params.foremanUserKey,
          orgName: params.orgName,
          facePhoto: params.facePhoto,
        })

        const ownerKey = get().getOwnerUserKey(params.objectId)
        notifyObjectMemberJoined({
          objectId: params.objectId,
          objectName,
          memberName: params.foremanName,
          memberRole: 'foreman',
          ownerClientUserKey: ownerKey,
        })

        return { ok: true }
      },

      foremanAddWorkers: (params) => {
        let added = 0
        for (const w of params.workers) {
          const workerUserKey = w.workerUserKey
            ?? buildUserKey(w.workerPhone ?? '', 'worker', '', w.workerName)
          const existing = get().members.find(
            (m) =>
              m.objectId === params.objectId
              && (m.workerMemberId === w.workerId || m.userKey === workerUserKey)
              && !m.revokedAt,
          )
          if (existing) continue

          const now = new Date().toISOString()
          const member: ObjectAccessMember = {
            id: memberId(),
            objectId: params.objectId,
            userKey: workerUserKey,
            role: 'worker',
            fullName: w.workerName,
            phone: w.workerPhone ?? '',
            workerMemberId: w.workerId,
            connectedAt: now,
            connectedVia: 'chain_add',
          }
          set((s) => ({ members: [...s.members, member] }))
          added++

          notifyWorkerAddedToObject({
            objectId: params.objectId,
            objectName: getObjectName(params.objectId),
            workerName: w.workerName,
            workerUserKey,
            foremanName: params.addedByName,
          })
        }
        return added
      },
    }),
    {
      name: STORAGE_KEYS.OBJECT_ACCESS,
      storage: createJSONStorage(() => createZustandStorage()),
      version: 2,
      migrate: (persisted: unknown) => {
        const state = persisted as ObjectAccessState
        state.codeIndex = buildCodeIndex(state.invites ?? {})
        return state
      },
      onRehydrateStorage: () => (state) => {
        if (!state?.invites) return
        const objectNames = buildObjectNameMap(
          useObjectStore.getState().userObjects,
          loadUserObjectsFromDisk(),
        )
        rebuildInviteRegistryFromStores(
          state.invites,
          { ...loadObjectMetaFromDisk(), ...useObjectStore.getState().objectMeta },
          objectNames,
        )
        for (const inv of Object.values(state.invites)) {
          useObjectStore.getState().setObjectInviteCode(inv.objectId, inv.code)
        }
      },
    },
  ),
)
