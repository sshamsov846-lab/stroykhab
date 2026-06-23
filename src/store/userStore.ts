import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, getJSON, setJSON, STORAGE_KEYS } from '@services/storage'
import type { SpecializationId } from '@/constants/specializations'
import type { OrganizationLinkStatus } from '@store/organizationStore'
import { buildUserKey } from '@utils/notificationFilter'
import { registerOrganizationInRegistry } from '@utils/orgRegistry'
import { specialtyTextFromIds } from '@/constants/specializations'
import { usePersonProfileStore } from '@store/personProfileStore'
import {
  compactAccountForDisk,
  loadAllAccountsEverywhere,
  mergeAccounts,
  resolveAuthAccounts,
  saveAccountsToDisk,
} from '@utils/accountStorage'
import { publishAccountToDirectory, syncDirectoryFromApp } from '@utils/directorySync'
import { syncUsersFromAuth, useUsersStore } from '@store/usersStore'

export type AppRole = 'client' | 'foreman' | 'worker' | 'subcontractor'

export interface RegisterPayload {
  fullName: string
  phone: string
  login?: string
  password: string
  role: AppRole
  contractorId?: string
  specializationIds?: SpecializationId[]
  organizationId?: string
  organizationLinkStatus?: OrganizationLinkStatus
  organizationName?: string
  inn?: string
  workerMemberId?: string
  facePhoto?: string
  personalCode?: string
  workerEmploymentType?: import('@/types/person').WorkerEmploymentType
  workerBrigadeMode?: import('@/types/brigade').WorkerBrigadeMode
  brigadeId?: string
  brigadeCode?: string
  foremanUserKey?: string
}

/** Постоянная запись аккаунта — не удаляется при выходе */
export interface SavedAccount {
  userKey: string
  login: string
  password: string
  fullName: string
  phone: string
  role: AppRole
  contractorId: string
  specializationIds: SpecializationId[]
  organizationId: string
  organizationLinkStatus: OrganizationLinkStatus
  organizationName: string
  inn: string
  workerMemberId: string
  facePhoto: string
  personalCode: string
  workerEmploymentType: import('@/types/person').WorkerEmploymentType | ''
  workerBrigadeMode: import('@/types/brigade').WorkerBrigadeMode | ''
  brigadeId: string
  brigadeCode: string
  foremanUserKey: string
  createdAt: string
  updatedAt: string
}

interface UserState {
  accounts: SavedAccount[]
  sessionUserKey: string | null
  registered: boolean
  fullName: string
  phone: string
  loginName: string
  role: AppRole
  contractorId: string
  specializationIds: SpecializationId[]
  organizationId: string
  organizationLinkStatus: OrganizationLinkStatus
  organizationName: string
  inn: string
  workerMemberId: string
  facePhoto: string
  personalCode: string
  workerEmploymentType: import('@/types/person').WorkerEmploymentType | ''
  workerBrigadeMode: import('@/types/brigade').WorkerBrigadeMode | ''
  brigadeId: string
  brigadeCode: string
  foremanUserKey: string
  register: (data: RegisterPayload) => void
  signIn: (loginOrPhone: string, password: string) => { ok: boolean; reason?: string; pickAccounts?: SavedAccount[] }
  loginAsAccount: (userKey: string, password?: string) => { ok: boolean; reason?: string }
  logout: () => void
  hydrateSession: () => void
  syncAccountsFromDisk: () => void
  recoverAccounts: () => SavedAccount[]
}

const emptySession = {
  registered: false,
  sessionUserKey: null as string | null,
  fullName: '',
  phone: '',
  loginName: '',
  role: 'foreman' as AppRole,
  contractorId: '',
  specializationIds: [] as SpecializationId[],
  organizationId: '',
  organizationLinkStatus: 'none' as OrganizationLinkStatus,
  organizationName: '',
  inn: '',
  workerMemberId: '',
  facePhoto: '',
  personalCode: '',
  workerEmploymentType: '' as const,
  workerBrigadeMode: '' as const,
  brigadeId: '',
  brigadeCode: '',
  foremanUserKey: '',
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function normalizeLogin(login: string): string {
  return login.trim().toLowerCase()
}

export function resolveLogin(login: string | undefined, phone: string): string {
  const trimmed = login?.trim()
  if (trimmed) return normalizeLogin(trimmed)
  const digits = normalizePhone(phone)
  return digits || trimmed || ''
}

function accountMatchesCredential(a: SavedAccount, loginOrPhone: string): boolean {
  const norm = normalizeLogin(loginOrPhone)
  const phoneNorm = normalizePhone(loginOrPhone)
  const accountLogin = normalizeLogin(a.login || a.phone)
  const accountPhone = normalizePhone(a.phone)
  if (norm && accountLogin === norm) return true
  if (phoneNorm.length >= 10 && accountPhone === phoneNorm) return true
  return false
}

function accountFromPayload(userKey: string, data: RegisterPayload): SavedAccount {
  const now = new Date().toISOString()
  return {
    userKey,
    login: resolveLogin(data.login, data.phone),
    password: data.password,
    fullName: data.fullName,
    phone: data.phone,
    role: data.role,
    contractorId: data.contractorId ?? '',
    specializationIds: data.specializationIds ?? [],
    organizationId: data.organizationId ?? '',
    organizationLinkStatus: data.organizationLinkStatus ?? 'none',
    organizationName: data.organizationName ?? '',
    inn: data.inn ?? '',
    workerMemberId: data.workerMemberId ?? '',
    facePhoto: data.facePhoto ?? '',
    personalCode: data.personalCode ?? '',
    workerEmploymentType: data.workerEmploymentType ?? '',
    workerBrigadeMode: data.workerBrigadeMode ?? '',
    brigadeId: data.brigadeId ?? '',
    brigadeCode: data.brigadeCode ?? '',
    foremanUserKey: data.foremanUserKey ?? '',
    createdAt: now,
    updatedAt: now,
  }
}

function enrichAccountFromProfile(account: SavedAccount): SavedAccount {
  if (account.facePhoto) return account
  const profile = usePersonProfileStore.getState().getByUserKey(account.userKey)
  if (!profile?.facePhoto) return account
  return { ...account, facePhoto: profile.facePhoto }
}

function sessionFromAccount(account: SavedAccount): Omit<
  UserState,
  'accounts' | 'register' | 'signIn' | 'loginAsAccount' | 'logout' | 'hydrateSession' | 'syncAccountsFromDisk' | 'recoverAccounts'
> {
  const enriched = enrichAccountFromProfile(account)
  return {
    sessionUserKey: enriched.userKey,
    registered: true,
    fullName: enriched.fullName,
    phone: enriched.phone,
    loginName: enriched.login || resolveLogin(undefined, enriched.phone),
    role: enriched.role,
    contractorId: enriched.contractorId,
    specializationIds: enriched.specializationIds,
    organizationId: enriched.organizationId,
    organizationLinkStatus: enriched.organizationLinkStatus,
    organizationName: enriched.organizationName,
    inn: enriched.inn ?? '',
    workerMemberId: enriched.workerMemberId,
    facePhoto: enriched.facePhoto,
    personalCode: enriched.personalCode,
    workerEmploymentType: enriched.workerEmploymentType,
    workerBrigadeMode: enriched.workerBrigadeMode,
    brigadeId: enriched.brigadeId,
    brigadeCode: enriched.brigadeCode,
    foremanUserKey: enriched.foremanUserKey,
  }
}

function commitAccounts(accounts: SavedAccount[]): void {
  saveAccountsToDisk(accounts.map(compactAccountForDisk))
  flushUserPersistAccounts(accounts)
}

function flushUserPersistAccounts(accounts: SavedAccount[]): void {
  const envelope = getJSON<{ version?: number; state?: Record<string, unknown> }>(STORAGE_KEYS.USER)
  const prev = envelope?.state ?? {}
  setJSON(STORAGE_KEYS.USER, {
    state: { ...prev, accounts: accounts.map(compactAccountForDisk) },
    version: envelope?.version ?? 5,
  })
}

function ensureLoginOnAccounts(accounts: SavedAccount[]): SavedAccount[] {
  return accounts.map((a) => ({
    ...a,
    inn: a.inn ?? '',
    login: a.login ? normalizeLogin(a.login) : resolveLogin(undefined, a.phone),
  }))
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      accounts: [],
      ...emptySession,

      recoverAccounts: () => {
        const accounts = ensureLoginOnAccounts(resolveAuthAccounts(get().accounts))
        set({ accounts })
        commitAccounts(accounts)
        syncUsersFromAuth(accounts)
        syncDirectoryFromApp()
        return accounts
      },

      syncAccountsFromDisk: () => {
        const accounts = ensureLoginOnAccounts(resolveAuthAccounts(get().accounts))
        set({ accounts })
        commitAccounts(accounts)
        syncUsersFromAuth(accounts)
        syncDirectoryFromApp()
      },

      register: (data) => {
        const userKey = buildUserKey(data.phone, data.role, data.contractorId ?? '', data.fullName)
        const allAccounts = ensureLoginOnAccounts(resolveAuthAccounts(get().accounts))
        const resolvedLogin = resolveLogin(data.login, data.phone)

        const loginTaken = allAccounts.some(
          (a) => a.userKey !== userKey && normalizeLogin(a.login || a.phone) === resolvedLogin,
        )
        if (loginTaken) {
          console.warn('[auth] login already taken:', resolvedLogin)
        }

        const existing = allAccounts.find((a) => a.userKey === userKey)
        const account = accountFromPayload(userKey, { ...data, login: resolvedLogin })
        account.createdAt = existing?.createdAt ?? account.createdAt
        account.updatedAt = new Date().toISOString()

        const accounts = existing
          ? allAccounts.map((a) => (a.userKey === userKey ? account : a))
          : [...allAccounts, account]

        set({
          accounts,
          ...sessionFromAccount(account),
        })
        commitAccounts(accounts)

        useUsersStore.getState().upsertFromAccount(account)
        syncUsersFromAuth(accounts)
        publishAccountToDirectory(account)

        if (data.role === 'subcontractor' && data.contractorId) {
          registerOrganizationInRegistry({
            id: data.contractorId,
            name: (data.organizationName ?? data.fullName).trim(),
            specialty: specialtyTextFromIds(data.specializationIds ?? []),
            phone: data.phone,
            inviteCode: data.personalCode,
            specializationIds: data.specializationIds,
            userKey,
          })
        }
      },

      signIn: (loginOrPhone, password) => {
        const trimmed = loginOrPhone.trim()
        if (!trimmed) return { ok: false, reason: 'Введите логин или телефон' }
        if (!password) return { ok: false, reason: 'Введите пароль' }
        if (password.length < 4) return { ok: false, reason: 'Пароль — минимум 4 символа' }

        let accounts = ensureLoginOnAccounts(resolveAuthAccounts(get().accounts))

        const matches = accounts.filter((a) => {
          if (!accountMatchesCredential(a, trimmed)) return false
          if (!a.password) return true
          return a.password === password
        })
        if (!matches.length) {
          return { ok: false, reason: 'Аккаунт не найден. Проверьте логин и пароль' }
        }
        if (matches.length > 1) return { ok: false, pickAccounts: matches }

        let account = matches[0]
        if (!account.password) {
          account = { ...account, password, updatedAt: new Date().toISOString() }
          accounts = accounts.map((a) => (a.userKey === account.userKey ? account : a))
        }

        set({ accounts, ...sessionFromAccount(account) })
        commitAccounts(accounts)
        syncDirectoryFromApp()
        return { ok: true }
      },

      loginAsAccount: (userKey, password) => {
        const accounts = ensureLoginOnAccounts(resolveAuthAccounts(get().accounts))
        let account = accounts.find((a) => a.userKey === userKey)
        if (!account) return { ok: false, reason: 'Аккаунт не найден' }
        if (password && account.password && account.password !== password) {
          return { ok: false, reason: 'Неверный пароль' }
        }
        if (password && !account.password) {
          account = { ...account, password, updatedAt: new Date().toISOString() }
          const next = accounts.map((a) => (a.userKey === userKey ? account! : a))
          set({ accounts: next, ...sessionFromAccount(account) })
          commitAccounts(next)
          return { ok: true }
        }
        set({ accounts, ...sessionFromAccount(account) })
        commitAccounts(accounts)
        syncDirectoryFromApp()
        return { ok: true }
      },

      logout: () => {
        const accounts = ensureLoginOnAccounts(resolveAuthAccounts(get().accounts))
        commitAccounts(accounts)
        set({
          accounts,
          ...emptySession,
        })
      },

      hydrateSession: () => {
        let accounts = ensureLoginOnAccounts(resolveAuthAccounts(get().accounts))
        let { sessionUserKey, registered } = get()

        if (!sessionUserKey) {
          set({ accounts })
          return
        }

        let account = accounts.find((a) => a.userKey === sessionUserKey)

        if (!account && registered) {
          const s = get()
          const fallbackKey = buildUserKey(s.phone, s.role, s.contractorId, s.fullName)
          account = accounts.find((a) => a.userKey === fallbackKey)
          if (account) sessionUserKey = account.userKey
        }

        if (!account) {
          set({ accounts, ...emptySession })
          return
        }

        set({ accounts, ...sessionFromAccount(account) })
      },
    }),
    {
      name: STORAGE_KEYS.USER,
      storage: createJSONStorage(() => createZustandStorage()),
      version: 5,
      skipHydration: true,
      partialize: (state) => ({
        accounts: state.accounts.map(compactAccountForDisk),
        sessionUserKey: state.sessionUserKey,
        registered: state.registered,
        fullName: state.fullName,
        phone: state.phone,
        loginName: state.loginName,
        role: state.role,
        contractorId: state.contractorId,
        specializationIds: state.specializationIds,
        organizationId: state.organizationId,
        organizationLinkStatus: state.organizationLinkStatus,
        organizationName: state.organizationName,
        inn: state.inn,
        workerMemberId: state.workerMemberId,
        facePhoto:
          state.facePhoto?.startsWith('data:') && state.facePhoto.length > 300 ? '' : state.facePhoto,
        personalCode: state.personalCode,
        workerEmploymentType: state.workerEmploymentType,
        workerBrigadeMode: state.workerBrigadeMode,
        brigadeId: state.brigadeId,
        brigadeCode: state.brigadeCode,
        foremanUserKey: state.foremanUserKey,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<UserState>
        const accounts = ensureLoginOnAccounts(mergeAccounts(p.accounts ?? [], loadAllAccountsEverywhere()))
        return {
          ...current,
          ...p,
          accounts,
          loginName: p.loginName ?? resolveLogin((p as { login?: string }).login, p.phone ?? ''),
        }
      },
      migrate: (persisted: unknown, version) => {
        const state = persisted as Record<string, unknown>
        let accounts = ensureLoginOnAccounts(
          mergeAccounts((state.accounts as SavedAccount[]) ?? [], loadAllAccountsEverywhere()),
        )

        if (!accounts.length && state.phone && state.fullName) {
          const userKey = buildUserKey(
            String(state.phone),
            state.role as AppRole,
            String(state.contractorId ?? ''),
            String(state.fullName),
          )
          accounts = [
            {
              userKey,
              login: resolveLogin(state.login as string | undefined, String(state.phone)),
              password: String(state.password ?? ''),
              fullName: String(state.fullName),
              phone: String(state.phone),
              role: (state.role as AppRole) ?? 'foreman',
              contractorId: String(state.contractorId ?? ''),
              specializationIds: (state.specializationIds as SpecializationId[]) ?? [],
              organizationId: String(state.organizationId ?? ''),
              organizationLinkStatus:
                (state.organizationLinkStatus as OrganizationLinkStatus) ?? 'none',
              organizationName: String(state.organizationName ?? ''),
              inn: String(state.inn ?? ''),
              workerMemberId: String(state.workerMemberId ?? ''),
              facePhoto: String(state.facePhoto ?? ''),
              personalCode: String(state.personalCode ?? ''),
              workerEmploymentType:
                (state.workerEmploymentType as SavedAccount['workerEmploymentType']) ?? '',
              workerBrigadeMode: (state.workerBrigadeMode as SavedAccount['workerBrigadeMode']) ?? '',
              brigadeId: String(state.brigadeId ?? ''),
              brigadeCode: String(state.brigadeCode ?? ''),
              foremanUserKey: String(state.foremanUserKey ?? ''),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]
          state.sessionUserKey = userKey
        }

        if (version < 5) {
          accounts = accounts.map((a) => ({
            ...a,
            login: a.login ? normalizeLogin(a.login) : resolveLogin(undefined, a.phone),
          }))
        }

        if (!state.sessionUserKey && state.registered && accounts.length) {
          state.sessionUserKey = accounts[0].userKey
        }

        state.accounts = accounts.map(compactAccountForDisk)
        state.loginName =
          (state.loginName as string | undefined)
          ?? (state.login as string | undefined)
          ?? resolveLogin(undefined, String(state.phone ?? ''))
        delete state.login
        saveAccountsToDisk(accounts)
        return state as unknown as UserState
      },
      onRehydrateStorage: () => (state, error) => {
        if (!state || error) return
        state.accounts = ensureLoginOnAccounts(resolveAuthAccounts(state.accounts ?? []))
        syncUsersFromAuth(state.accounts)
        syncDirectoryFromApp()
      },
    },
  ),
)

export const ROLE_LABELS: Record<AppRole, string> = {
  client: 'Заказчик',
  foreman: 'Прораб',
  worker: 'Мастер',
  subcontractor: 'Организация',
}

export function getSavedAccounts(): SavedAccount[] {
  return ensureLoginOnAccounts(resolveAuthAccounts(useUserStore.getState().accounts))
}
