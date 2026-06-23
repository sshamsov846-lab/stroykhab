import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { AppRole, SavedAccount } from '@store/userStore'
import type { SpecializationId } from '@/constants/specializations'
import { specialtyTextFromIds } from '@/constants/specializations'
import { normalizePersonCode } from '@utils/personCodes'
import type { Contractor } from '@/types/projectWorkflow'
import { resolveAuthAccounts, loadAccountsFromDisk } from '@utils/accountStorage'

/** Запись в едином реестре всех зарегистрированных пользователей */
export interface RegisteredUser {
  userKey: string
  role: AppRole
  fullName: string
  phone: string
  login: string
  personalCode: string
  contractorId: string
  organizationId: string
  organizationName: string
  inn: string
  specializationIds: SpecializationId[]
  foremanUserKey: string
  updatedAt: string
}

interface UsersState {
  users: RegisteredUser[]

  upsertFromAccount: (account: SavedAccount) => void
  upsertMany: (accounts: SavedAccount[]) => void
  syncFromAuthAccounts: (inMemory?: SavedAccount[]) => void
  getOrganizations: () => RegisteredUser[]
  searchOrganizations: (query: string) => RegisteredUser[]
  searchOrganizationsAsContractors: (query: string) => Contractor[]
  findOrganizationByCode: (code: string) => RegisteredUser | undefined
  findByContractorId: (contractorId: string) => RegisteredUser | undefined
}

function userFromAccount(account: SavedAccount): RegisteredUser {
  return {
    userKey: account.userKey,
    role: account.role,
    fullName: account.fullName,
    phone: account.phone,
    login: account.login || account.phone,
    personalCode: account.personalCode ?? '',
    contractorId: account.contractorId ?? '',
    organizationId: account.organizationId ?? '',
    organizationName: account.organizationName ?? '',
    inn: account.inn ?? '',
    specializationIds: account.specializationIds ?? [],
    foremanUserKey: account.foremanUserKey ?? '',
    updatedAt: account.updatedAt,
  }
}

function pickNewer(prev: RegisteredUser, next: RegisteredUser): RegisteredUser {
  return (next.updatedAt || '') >= (prev.updatedAt || '') ? next : prev
}

function mergeUsers(list: RegisteredUser[]): RegisteredUser[] {
  const map = new Map<string, RegisteredUser>()
  for (const u of list) {
    if (!u.userKey) continue
    const prev = map.get(u.userKey)
    map.set(u.userKey, prev ? pickNewer(prev, u) : u)
  }
  return Array.from(map.values())
}

function matchesOrgSearch(org: RegisteredUser, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const name = (org.organizationName || org.fullName).toLowerCase()
  const normQ = normalizePersonCode(query)
  const normCode = normalizePersonCode(org.personalCode)
  const digitsQ = q.replace(/\D/g, '')
  const digitsCode = normCode.replace(/\D/g, '')
  return (
    name.includes(q)
    || (org.inn && org.inn.includes(digitsQ))
    || (normCode && normCode.includes(normQ))
    || (normQ && normQ.includes(normCode))
    || (digitsQ.length >= 3 && digitsCode.includes(digitsQ))
  )
}

function orgToContractor(org: RegisteredUser): Contractor {
  return {
    id: org.contractorId,
    name: (org.organizationName || org.fullName).trim(),
    specialty: specialtyTextFromIds(org.specializationIds),
    phone: org.phone,
    inviteCode: org.personalCode,
    specializationIds: org.specializationIds,
    isRegisteredOrg: true,
  }
}

export const useUsersStore = create<UsersState>()(
  persist(
    (set, get) => ({
      users: [],

      upsertFromAccount: (account) => {
        const user = userFromAccount(account)
        set((s) => ({
          users: mergeUsers([
            ...s.users.filter((u) => u.userKey !== user.userKey),
            user,
          ]),
        }))
      },

      upsertMany: (accounts) => {
        const incoming = accounts.map(userFromAccount)
        set((s) => ({
          users: mergeUsers([...s.users, ...incoming]),
        }))
      },

      syncFromAuthAccounts: (inMemory = []) => {
        const accounts = resolveAuthAccounts(inMemory)
        const fromDisk = loadAccountsFromDisk()
        const merged = mergeUsers([
          ...get().users,
          ...accounts.map(userFromAccount),
          ...fromDisk.map((a) => userFromAccount(a as SavedAccount)),
        ])
        set({ users: merged })
      },

      getOrganizations: () =>
        get()
          .users.filter((u) => u.role === 'subcontractor' && u.contractorId)
          .sort((a, b) =>
            (a.organizationName || a.fullName).localeCompare(b.organizationName || b.fullName, 'ru'),
          ),

      searchOrganizations: (query) => {
        const orgs = get().getOrganizations()
        if (!query.trim()) return orgs
        return orgs.filter((o) => matchesOrgSearch(o, query))
      },

      searchOrganizationsAsContractors: (query) =>
        get().searchOrganizations(query).map(orgToContractor),

      findOrganizationByCode: (code) => {
        const norm = normalizePersonCode(code)
        if (!norm) return undefined
        return get().getOrganizations().find(
          (o) => normalizePersonCode(o.personalCode) === norm,
        )
      },

      findByContractorId: (contractorId) =>
        get().getOrganizations().find((o) => o.contractorId === contractorId),
    }),
    {
      name: STORAGE_KEYS.USERS,
      storage: createJSONStorage(() => createZustandStorage()),
      version: 1,
    },
  ),
)

/** Синхронизировать единый реестр из всех источников аккаунтов */
export function syncUsersFromAuth(inMemory: SavedAccount[] = []): void {
  useUsersStore.getState().syncFromAuthAccounts(inMemory)
}
