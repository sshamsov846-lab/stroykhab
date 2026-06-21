import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { SpecializationId } from '@/constants/specializations'
import type { OrganizationLinkStatus } from '@store/organizationStore'
import { buildUserKey } from '@utils/notificationFilter'
import { registerOrganizationInRegistry } from '@utils/orgRegistry'
import { specialtyTextFromIds } from '@/constants/specializations'

export type AppRole = 'client' | 'foreman' | 'worker' | 'subcontractor'

export interface RegisterPayload {
  fullName: string
  phone: string
  password: string
  role: AppRole
  contractorId?: string
  specializationIds?: SpecializationId[]
  organizationId?: string
  organizationLinkStatus?: OrganizationLinkStatus
  organizationName?: string
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
  password: string
  fullName: string
  phone: string
  role: AppRole
  contractorId: string
  specializationIds: SpecializationId[]
  organizationId: string
  organizationLinkStatus: OrganizationLinkStatus
  organizationName: string
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
  /** Все зарегистрированные аккаунты — хранятся навсегда */
  accounts: SavedAccount[]
  /** Ключ активной сессии (null = не залогинен) */
  sessionUserKey: string | null
  registered: boolean
  fullName: string
  phone: string
  role: AppRole
  contractorId: string
  specializationIds: SpecializationId[]
  organizationId: string
  organizationLinkStatus: OrganizationLinkStatus
  organizationName: string
  workerMemberId: string
  facePhoto: string
  personalCode: string
  workerEmploymentType: import('@/types/person').WorkerEmploymentType | ''
  workerBrigadeMode: import('@/types/brigade').WorkerBrigadeMode | ''
  brigadeId: string
  brigadeCode: string
  foremanUserKey: string
  register: (data: RegisterPayload) => void
  login: (phone: string, password: string) => { ok: boolean; reason?: string; pickAccounts?: SavedAccount[] }
  loginAsAccount: (userKey: string) => { ok: boolean; reason?: string }
  logout: () => void
  hydrateSession: () => void
}

const emptySession = {
  registered: false,
  sessionUserKey: null as string | null,
  fullName: '',
  phone: '',
  role: 'foreman' as AppRole,
  contractorId: '',
  specializationIds: [] as SpecializationId[],
  organizationId: '',
  organizationLinkStatus: 'none' as OrganizationLinkStatus,
  organizationName: '',
  workerMemberId: '',
  facePhoto: '',
  personalCode: '',
  workerEmploymentType: '' as const,
  workerBrigadeMode: '' as const,
  brigadeId: '',
  brigadeCode: '',
  foremanUserKey: '',
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function accountFromPayload(userKey: string, data: RegisterPayload): SavedAccount {
  const now = new Date().toISOString()
  return {
    userKey,
    password: data.password,
    fullName: data.fullName,
    phone: data.phone,
    role: data.role,
    contractorId: data.contractorId ?? '',
    specializationIds: data.specializationIds ?? [],
    organizationId: data.organizationId ?? '',
    organizationLinkStatus: data.organizationLinkStatus ?? 'none',
    organizationName: data.organizationName ?? '',
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

function sessionFromAccount(account: SavedAccount): Omit<UserState, 'accounts' | 'register' | 'login' | 'loginAsAccount' | 'logout' | 'hydrateSession'> {
  return {
    sessionUserKey: account.userKey,
    registered: true,
    fullName: account.fullName,
    phone: account.phone,
    role: account.role,
    contractorId: account.contractorId,
    specializationIds: account.specializationIds,
    organizationId: account.organizationId,
    organizationLinkStatus: account.organizationLinkStatus,
    organizationName: account.organizationName,
    workerMemberId: account.workerMemberId,
    facePhoto: account.facePhoto,
    personalCode: account.personalCode,
    workerEmploymentType: account.workerEmploymentType,
    workerBrigadeMode: account.workerBrigadeMode,
    brigadeId: account.brigadeId,
    brigadeCode: account.brigadeCode,
    foremanUserKey: account.foremanUserKey,
  }
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      accounts: [],
      ...emptySession,

      register: (data) => {
        const userKey = buildUserKey(data.phone, data.role, data.contractorId ?? '', data.fullName)
        const existing = get().accounts.find((a) => a.userKey === userKey)
        const account = accountFromPayload(userKey, data)
        account.createdAt = existing?.createdAt ?? account.createdAt
        account.updatedAt = new Date().toISOString()

        const accounts = existing
          ? get().accounts.map((a) => (a.userKey === userKey ? account : a))
          : [...get().accounts, account]

        set({
          accounts,
          ...sessionFromAccount(account),
        })

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

      login: (phone, password) => {
        const normalized = normalizePhone(phone)
        if (normalized.length < 10) return { ok: false, reason: 'Введите корректный телефон' }
        if (!password) return { ok: false, reason: 'Введите пароль' }

        const matches = get().accounts.filter(
          (a) =>
            normalizePhone(a.phone) === normalized &&
            (a.password === password || (!a.password && password.length >= 4)),
        )
        if (!matches.length) return { ok: false, reason: 'Аккаунт не найден. Проверьте телефон и пароль' }
        if (matches.length > 1) return { ok: false, pickAccounts: matches }

        const account = matches[0]
        if (!account.password) {
          const accounts = get().accounts.map((a) =>
            a.userKey === account.userKey
              ? { ...a, password, updatedAt: new Date().toISOString() }
              : a,
          )
          const updated = { ...account, password }
          set({ accounts, ...sessionFromAccount(updated) })
          return { ok: true }
        }

        set({ ...sessionFromAccount(account) })
        return { ok: true }
      },

      loginAsAccount: (userKey) => {
        const account = get().accounts.find((a) => a.userKey === userKey)
        if (!account) return { ok: false, reason: 'Аккаунт не найден' }
        set({ ...sessionFromAccount(account) })
        return { ok: true }
      },

      logout: () => {
        set({
          accounts: get().accounts,
          ...emptySession,
        })
      },

      hydrateSession: () => {
        const { sessionUserKey, accounts, registered } = get()
        if (!sessionUserKey) return
        const account = accounts.find((a) => a.userKey === sessionUserKey)
        if (!account) {
          set({ accounts, ...emptySession })
          return
        }
        if (!registered) {
          set({ ...sessionFromAccount(account), accounts })
        }
      },
    }),
    {
      name: STORAGE_KEYS.USER,
      storage: createJSONStorage(() => createZustandStorage()),
      version: 2,
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>
        const accounts: SavedAccount[] = (state.accounts as SavedAccount[]) ?? []

        // Миграция старого формата: один пользователь без массива accounts
        if (!accounts.length && state.registered && state.phone && state.fullName) {
          const userKey = buildUserKey(
            String(state.phone),
            state.role as AppRole,
            String(state.contractorId ?? ''),
            String(state.fullName),
          )
          const legacy: SavedAccount = {
            userKey,
            password: '',
            fullName: String(state.fullName),
            phone: String(state.phone),
            role: (state.role as AppRole) ?? 'foreman',
            contractorId: String(state.contractorId ?? ''),
            specializationIds: (state.specializationIds as SpecializationId[]) ?? [],
            organizationId: String(state.organizationId ?? ''),
            organizationLinkStatus: (state.organizationLinkStatus as OrganizationLinkStatus) ?? 'none',
            organizationName: String(state.organizationName ?? ''),
            workerMemberId: String(state.workerMemberId ?? ''),
            facePhoto: String(state.facePhoto ?? ''),
            personalCode: String(state.personalCode ?? ''),
            workerEmploymentType: (state.workerEmploymentType as SavedAccount['workerEmploymentType']) ?? '',
            workerBrigadeMode: (state.workerBrigadeMode as SavedAccount['workerBrigadeMode']) ?? '',
            brigadeId: String(state.brigadeId ?? ''),
            brigadeCode: String(state.brigadeCode ?? ''),
            foremanUserKey: String(state.foremanUserKey ?? ''),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          accounts.push(legacy)
          state.sessionUserKey = userKey
        }

        if (!state.sessionUserKey && state.registered) {
          state.sessionUserKey = accounts[0]?.userKey ?? null
        }

        state.accounts = accounts
        return state as unknown as UserState
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
