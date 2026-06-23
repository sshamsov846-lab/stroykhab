import { resolveAuthAccounts } from '@utils/accountStorage'
import { useUserStore } from '@store/userStore'
import { usePersonProfileStore } from '@store/personProfileStore'
import { useOrganizationStore } from '@store/organizationStore'
import { useDirectoryStore } from '@store/directoryStore'
import { useUsersStore } from '@store/usersStore'
import { registerOrganizationInRegistry } from '@utils/orgRegistry'
import { specialtyTextFromIds } from '@/constants/specializations'
import type { SavedAccount } from '@store/userStore'

/** Синхронизировать единый каталог из всех сторов */
export function syncDirectoryFromApp(): void {
  useDirectoryStore.getState().syncFromStores(
    resolveAuthAccounts(useUserStore.getState().accounts),
    usePersonProfileStore.getState().profiles,
    useOrganizationStore.getState().members,
  )
}

/** После регистрации — обновить каталог и реестр организаций */
export function publishAccountToDirectory(account: SavedAccount): void {
  useUsersStore.getState().upsertFromAccount(account)

  const dir = useDirectoryStore.getState()
  dir.upsertPerson({
    userKey: account.userKey,
    role: account.role,
    fullName: account.fullName,
    phone: account.phone,
    login: account.login || account.phone,
    personalCode: account.personalCode,
    contractorId: account.contractorId,
    organizationId: account.organizationId,
    organizationName: account.organizationName,
    foremanUserKey: account.foremanUserKey,
    specialty: specialtyTextFromIds(account.specializationIds),
    specializationIds: account.specializationIds,
    facePhoto: account.facePhoto,
    inn: account.inn ?? '',
    workerMemberId: account.workerMemberId,
    status: account.organizationLinkStatus === 'pending' ? 'pending' : 'active',
    updatedAt: account.updatedAt,
  })

  if (account.role === 'subcontractor' && account.contractorId) {
    const org = {
      contractorId: account.contractorId,
      name: (account.organizationName || account.fullName).trim(),
      phone: account.phone,
      inn: account.inn ?? '',
      inviteCode: account.personalCode,
      userKey: account.userKey,
      specialty: specialtyTextFromIds(account.specializationIds),
      specializationIds: account.specializationIds,
      updatedAt: account.updatedAt,
    }
    dir.upsertOrg(org)
    registerOrganizationInRegistry({
      id: org.contractorId,
      name: org.name,
      specialty: org.specialty,
      phone: org.phone,
      inviteCode: org.inviteCode,
      specializationIds: org.specializationIds,
      userKey: org.userKey,
    })
  }

  if (account.role === 'foreman' && account.organizationId) {
    dir.addLink({
      contractorId: account.organizationId,
      childUserKey: account.userKey,
      parentUserKey: null,
      memberRole: 'foreman',
      status: account.organizationLinkStatus === 'pending' ? 'pending' : 'active',
    })
  }

  if (account.role === 'worker' && account.foremanUserKey) {
    dir.addLink({
      contractorId: account.organizationId || account.contractorId,
      childUserKey: account.userKey,
      parentUserKey: account.foremanUserKey,
      memberRole: 'worker',
      status: 'active',
    })
  }

  syncDirectoryFromApp()
}
