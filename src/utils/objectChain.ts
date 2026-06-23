import type { Contractor } from '@/types/projectWorkflow'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { usePersonProfileStore } from '@store/personProfileStore'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { useObjectStore, type TeamMember } from '@store/objectStore'
import { useOrganizationStore } from '@store/organizationStore'
import { useUserStore } from '@store/userStore'
import { useDirectoryStore } from '@store/directoryStore'
import { syncUsersFromAuth, useUsersStore } from '@store/usersStore'
import { getPersistedState, STORAGE_KEYS } from '@services/storage'
import { specialtyTextFromIds } from '@/constants/specializations'
import type { PersonProfile } from '@/types/person'
import { loadAccountsFromDisk } from '@utils/accountStorage'
import {
  getAllOrganizationsFromRegistry,
  registerOrganizationInRegistry,
  resolveUserKeyFromRegistry,
} from '@utils/orgRegistry'

function directoryOrgsToContractors(): Contractor[] {
  return useDirectoryStore.getState().getOrganizations().map((o) => ({
    id: o.contractorId,
    name: o.name,
    specialty: o.specialty,
    phone: o.phone,
    inviteCode: o.inviteCode,
    specializationIds: o.specializationIds,
    isRegisteredOrg: true,
  }))
}

/** Все организации: каталог + реестр + workflow + профили + аккаунты */
export function getAllContractorsMerged(): Contractor[] {
  const byId = new Map<string, Contractor>()

  for (const c of directoryOrgsToContractors()) {
    byId.set(c.id, c)
  }

  for (const c of getAllOrganizationsFromRegistry()) {
    const existing = byId.get(c.id)
    byId.set(c.id, existing ? { ...c, ...existing, name: existing.name || c.name } : c)
  }

  for (const c of [...loadContractorsFromDisk(), ...useProjectWorkflowStore.getState().contractors]) {
    const reg = byId.get(c.id)
    byId.set(c.id, reg ? { ...c, ...reg, isRegisteredOrg: true, name: reg.name || c.name } : c)
  }

  const profiles = { ...loadProfilesFromDisk(), ...usePersonProfileStore.getState().profiles }
  for (const p of Object.values(profiles)) {
    if (p.role !== 'subcontractor') continue
    const id = p.contractorId ?? p.organizationId
    if (!id) continue
    const existing = byId.get(id)
    if (existing) {
      if (!existing.isRegisteredOrg) {
        byId.set(id, { ...existing, isRegisteredOrg: true, inviteCode: existing.inviteCode ?? p.personalCode })
      }
      continue
    }
    byId.set(id, {
      id,
      name: p.fullName,
      specialty: specialtyTextFromIds(p.specializationIds),
      phone: p.phone,
      inviteCode: p.personalCode,
      specializationIds: p.specializationIds,
      isRegisteredOrg: true,
    })
  }

  const accounts = [...loadAccountsFromDisk(), ...useUserStore.getState().accounts]
  const seenUserKeys = new Set<string>()
  for (const a of accounts) {
    if (a.role !== 'subcontractor' || !a.contractorId) continue
    if (seenUserKeys.has(a.userKey)) continue
    seenUserKeys.add(a.userKey)

    const orgName = a.organizationName?.trim() || a.fullName
    const existing = byId.get(a.contractorId)
    if (existing) {
      byId.set(a.contractorId, {
        ...existing,
        name: orgName || existing.name,
        phone: a.phone || existing.phone,
        inviteCode: existing.inviteCode ?? a.personalCode,
        specializationIds: a.specializationIds.length ? a.specializationIds : existing.specializationIds,
        isRegisteredOrg: true,
      })
      continue
    }

    byId.set(a.contractorId, {
      id: a.contractorId,
      name: orgName,
      specialty: specialtyTextFromIds(a.specializationIds),
      phone: a.phone,
      inviteCode: a.personalCode,
      specializationIds: a.specializationIds,
      isRegisteredOrg: true,
    })
  }

  return [...byId.values()]
}

/** Только организации, зарегистрированные пользователями в приложении */
export function getRegisteredOrganizations(): Contractor[] {
  return getAllContractorsMerged()
    .filter(
      (c) =>
        c.isRegisteredOrg
        || (c.inviteCode ?? '').toUpperCase().startsWith('ОРГ'),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export function searchRegisteredContractors(query: string): Contractor[] {
  syncUsersFromAuth(useUserStore.getState().accounts)
  return useUsersStore.getState().searchOrganizationsAsContractors(query)
}

export async function refreshOrganizationDirectory(): Promise<void> {
  syncOrganizationRegistryFromStores()
  await Promise.all([
    useUsersStore.persist.rehydrate(),
    useDirectoryStore.persist.rehydrate(),
    useProjectWorkflowStore.persist.rehydrate(),
    usePersonProfileStore.persist.rehydrate(),
    useOrganizationStore.persist.rehydrate(),
    useUserStore.persist.rehydrate(),
  ])
  useUserStore.getState().recoverAccounts()
  syncUsersFromAuth(useUserStore.getState().accounts)
  const { syncDirectoryFromApp } = await import('@utils/directorySync')
  syncDirectoryFromApp()
  syncOrganizationRegistryFromStores()
}

export function resolveOrgUserKey(contractorId: string): string | undefined {
  const fromUsers = useUsersStore.getState().findByContractorId(contractorId)?.userKey
  if (fromUsers) return fromUsers

  const fromDirectory = useDirectoryStore.getState().orgs[contractorId]?.userKey
  if (fromDirectory) return fromDirectory

  const fromRegistry = resolveUserKeyFromRegistry(contractorId)
  if (fromRegistry) return fromRegistry

  const profiles = { ...loadProfilesFromDisk(), ...usePersonProfileStore.getState().profiles }
  const fromProfile = Object.values(profiles).find(
    (p) =>
      p.role === 'subcontractor'
      && (p.contractorId === contractorId || p.organizationId === contractorId),
  )?.userKey
  if (fromProfile) return fromProfile

  const accounts = [...loadAccountsFromDisk(), ...useUserStore.getState().accounts]
  return accounts.find((a) => a.role === 'subcontractor' && a.contractorId === contractorId)?.userKey
    ?? resolveUserKeyFromRegistry(contractorId)
}

function loadContractorsFromDisk(): Contractor[] {
  return getPersistedState<{ contractors: Contractor[] }>(STORAGE_KEYS.WORKFLOW)?.contractors ?? []
}

function loadProfilesFromDisk(): Record<string, PersonProfile> {
  return getPersistedState<{ profiles: Record<string, PersonProfile> }>(STORAGE_KEYS.PERSON_PROFILES)?.profiles ?? {}
}

/** Синхронизировать реестр из существующих данных (для старых регистраций) */
export function syncOrganizationRegistryFromStores(): void {
  for (const c of [...loadContractorsFromDisk(), ...useProjectWorkflowStore.getState().contractors]) {
    const isOrgCode = (c.inviteCode ?? '').toUpperCase().startsWith('ОРГ')
    if (!c.isRegisteredOrg && !isOrgCode) continue
    registerOrganizationInRegistry({
      id: c.id,
      name: c.name,
      specialty: c.specialty,
      phone: c.phone,
      inviteCode: c.inviteCode,
      specializationIds: c.specializationIds,
    })
  }

  const profiles = { ...loadProfilesFromDisk(), ...usePersonProfileStore.getState().profiles }
  const accountsSnapshot = [...loadAccountsFromDisk(), ...useUserStore.getState().accounts]
  for (const p of Object.values(profiles)) {
    if (p.role !== 'subcontractor') continue
    const id = p.contractorId ?? p.organizationId
    if (!id) continue
    const account = accountsSnapshot.find((a) => a.userKey === p.userKey)
    const orgName = (account?.organizationName ?? account?.fullName ?? p.fullName).trim()
    registerOrganizationInRegistry({
      id,
      name: orgName,
      specialty: specialtyTextFromIds(p.specializationIds),
      phone: p.phone,
      inviteCode: p.personalCode,
      specializationIds: p.specializationIds,
      userKey: p.userKey,
    })
  }

  for (const a of accountsSnapshot) {
    if (a.role !== 'subcontractor' || !a.contractorId) continue
    registerOrganizationInRegistry({
      id: a.contractorId,
      name: (a.organizationName ?? a.fullName).trim(),
      specialty: specialtyTextFromIds(a.specializationIds),
      phone: a.phone,
      inviteCode: a.personalCode,
      specializationIds: a.specializationIds,
      userKey: a.userKey,
    })
  }
}

/** Добавить организацию на объект (заказчик) */
export function linkOrganizationToObject(params: {
  objectId: string
  contractorId: string
  addedByName: string
}): { ok: boolean; reason?: string } {
  const contractor = getAllContractorsMerged().find((c) => c.id === params.contractorId)
  if (!contractor) return { ok: false, reason: 'Организация не найдена' }

  const orgUserKey = resolveOrgUserKey(params.contractorId)
  if (!orgUserKey) return { ok: false, reason: 'Организация не зарегистрирована в системе' }

  const linked = useObjectAccessStore
    .getState()
    .getActiveMembers(params.objectId)
    .some((m) => m.role === 'subcontractor' && m.contractorId === params.contractorId)
  if (linked) return { ok: true }

  const result = useObjectAccessStore.getState().clientAddOrganization({
    objectId: params.objectId,
    contractorId: params.contractorId,
    orgName: contractor.name,
    orgUserKey,
    orgPhone: contractor.phone ?? '',
    addedByName: params.addedByName,
  })
  if (!result.ok) return result

  useObjectStore.getState().addOrganization(params.objectId, {
    name: contractor.name,
    specialty: contractor.specialty,
    phone: contractor.phone,
    contractorId: params.contractorId,
  })
  return { ok: true }
}

/** Подтянуть «Точстрой» / «Король» и аналогичные пропущенные регистрации на объекты */
export function repairRegisteredOrganizationLinks(): void {
  syncOrganizationRegistryFromStores()

  const accounts = [...loadAccountsFromDisk(), ...useUserStore.getState().accounts]
  const targets = accounts.filter(
    (a) =>
      a.role === 'subcontractor'
      && a.contractorId
      && (
        (a.organizationName ?? '').toLowerCase().includes('точстрой')
        || (a.organizationName ?? '').toLowerCase().includes('техстрой')
        || a.fullName.toLowerCase().includes('король')
      ),
  )

  const objects = useObjectStore.getState().userObjects
  for (const account of targets) {
    for (const obj of objects) {
      linkOrganizationToObject({
        objectId: obj.id,
        contractorId: account.contractorId,
        addedByName: 'Заказчик',
      })
    }
  }
}

export function getOrgProfile(contractorId: string): PersonProfile | undefined {
  const key = resolveOrgUserKey(contractorId)
  if (!key) return undefined
  return usePersonProfileStore.getState().getByUserKey(key)
}

export function getAllTeamMembers(): TeamMember[] {
  const { teamMembers, contractorWorkers } = useObjectStore.getState()
  const byId = new Map<string, TeamMember>()
  for (const m of teamMembers) byId.set(m.id, m)
  for (const list of Object.values(contractorWorkers)) {
    for (const m of list) byId.set(m.id, m)
  }
  return [...byId.values()]
}

export function getWorkersOnObject(objectId: string): TeamMember[] {
  const workerIds = new Set(
    useObjectAccessStore
      .getState()
      .getActiveMembers(objectId)
      .filter((m) => m.role === 'worker' && m.workerMemberId)
      .map((m) => m.workerMemberId!),
  )
  return getAllTeamMembers().filter((m) => workerIds.has(m.id))
}

export function getForemenOnObject(objectId: string): Array<{
  userKey: string
  fullName: string
  phone: string
  personalCode?: string
  facePhoto?: string
}> {
  const members = useObjectAccessStore
    .getState()
    .getActiveMembers(objectId)
    .filter((m) => m.role === 'foreman')

  return members.map((m) => {
    const profile = usePersonProfileStore.getState().getByUserKey(m.userKey)
    return {
      userKey: m.userKey,
      fullName: m.fullName,
      phone: m.phone,
      personalCode: profile?.personalCode,
      facePhoto: profile?.facePhoto,
    }
  })
}

export function getForemanUserKeysForObject(objectId: string): string[] {
  return useObjectAccessStore
    .getState()
    .getActiveMembers(objectId)
    .filter((m) => m.role === 'foreman')
    .map((m) => m.userKey)
}

export function getOrgForemenNotOnObject(contractorId: string, objectId: string): PersonProfile[] {
  const onObject = new Set(
    useObjectAccessStore
      .getState()
      .getActiveMembers(objectId)
      .filter((m) => m.role === 'foreman')
      .map((m) => m.userKey),
  )
  return usePersonProfileStore
    .getState()
    .getForemenProfilesForOrg(contractorId)
    .filter((p) => !onObject.has(p.userKey))
}

export function getForemanWorkersNotOnObject(
  objectId: string,
  foremanUserKey: string,
): TeamMember[] {
  const connected = new Set(
    useObjectAccessStore
      .getState()
      .getActiveMembers(objectId)
      .filter((m) => m.role === 'worker')
      .map((m) => m.workerMemberId)
      .filter(Boolean),
  )
  const { teamMembers } = useObjectStore.getState()
  return teamMembers.filter(
    (m) =>
      (m.foremanUserKey === foremanUserKey || !m.foremanUserKey)
      && !connected.has(m.id),
  )
}

export function orgMembersOnObject(objectId: string, contractorId: string) {
  const access = useObjectAccessStore.getState().getActiveMembers(objectId)
  const orgMembers = useOrganizationStore.getState().getMembersForContractor(contractorId)
  const workerKeys = new Set(
    access.filter((m) => m.role === 'worker').map((m) => m.userKey),
  )
  const foremanKeys = new Set(
    access.filter((m) => m.role === 'foreman').map((m) => m.userKey),
  )
  return {
    foremen: orgMembers.filter((m) => m.memberRole === 'foreman' && foremanKeys.has(m.userKey)),
    workers: orgMembers.filter((m) => m.memberRole === 'worker' && workerKeys.has(m.userKey)),
  }
}
