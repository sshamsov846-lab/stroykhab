import {
  getItem,
  getJSON,
  getPersistedState,
  setJSON,
  STORAGE_KEYS,
} from '@services/storage'
import type { SavedAccount, AppRole } from '@store/userStore'
import type { PersonProfile } from '@/types/person'
import { buildUserKey } from '@utils/notificationFilter'

/** Убираем тяжёлые поля — иначе localStorage переполняется и молча не сохраняет */
export function compactAccountForDisk(account: SavedAccount): SavedAccount {
  let facePhoto = account.facePhoto ?? ''
  if (facePhoto.startsWith('data:') && facePhoto.length > 300) {
    facePhoto = ''
  }
  return { ...account, facePhoto }
}

function compactAll(accounts: SavedAccount[]): SavedAccount[] {
  return accounts.map(compactAccountForDisk)
}

/** Прямой ключ stroyhub-accounts */
export function loadAccountsFromDisk(): SavedAccount[] {
  const raw = getJSON<unknown>(STORAGE_KEYS.ACCOUNTS)
  if (Array.isArray(raw)) return raw as SavedAccount[]
  return []
}

function parseUserPersistRaw(): Record<string, unknown> | null {
  const raw = getJSON<unknown>(STORAGE_KEYS.USER)
  if (!raw || typeof raw !== 'object') return null
  if ('state' in raw && raw.state && typeof raw.state === 'object') {
    return raw.state as Record<string, unknown>
  }
  return raw as Record<string, unknown>
}

function legacyAccountFromUserState(state: Record<string, unknown>): SavedAccount | null {
  if (!state.phone || !state.fullName) return null
  const role = (state.role as AppRole) ?? 'foreman'
  const fullName = String(state.fullName)
  const phone = String(state.phone)
  const contractorId = String(state.contractorId ?? '')
  const userKey =
    (state.sessionUserKey as string) ||
    buildUserKey(phone, role, contractorId, fullName)

  return {
    userKey,
    login: String(state.login ?? '').trim().toLowerCase() || phone.replace(/\D/g, ''),
    password: String(state.password ?? ''),
    fullName,
    phone,
    role,
    contractorId,
    specializationIds: (state.specializationIds as SavedAccount['specializationIds']) ?? [],
    organizationId: String(state.organizationId ?? ''),
    organizationLinkStatus: (state.organizationLinkStatus as SavedAccount['organizationLinkStatus']) ?? 'none',
    organizationName: String(state.organizationName ?? ''),
    inn: String(state.inn ?? ''),
    workerMemberId: String(state.workerMemberId ?? ''),
    facePhoto: String(state.facePhoto ?? ''),
    personalCode: String(state.personalCode ?? ''),
    workerEmploymentType: (state.workerEmploymentType as SavedAccount['workerEmploymentType']) ?? '',
    workerBrigadeMode: (state.workerBrigadeMode as SavedAccount['workerBrigadeMode']) ?? '',
    brigadeId: String(state.brigadeId ?? ''),
    brigadeCode: String(state.brigadeCode ?? ''),
    foremanUserKey: String(state.foremanUserKey ?? ''),
    createdAt: String(state.createdAt ?? new Date().toISOString()),
    updatedAt: String(state.updatedAt ?? new Date().toISOString()),
  }
}

/** Аккаунты из zustand persist (stroyhub-user) */
export function loadAccountsFromUserPersist(): SavedAccount[] {
  const fromHelper = getPersistedState<{ accounts?: SavedAccount[] } & Record<string, unknown>>(
    STORAGE_KEYS.USER,
  )
  const state = fromHelper ?? parseUserPersistRaw()
  if (!state) return []

  const list: SavedAccount[] = []
  if (Array.isArray(state.accounts)) {
    list.push(...(state.accounts as SavedAccount[]))
  }
  const legacy = legacyAccountFromUserState(state)
  if (legacy) list.push(legacy)
  return list
}

function pickBetterAccount(prev: SavedAccount, next: SavedAccount): SavedAccount {
  const prevTs = prev.updatedAt || prev.createdAt || ''
  const nextTs = next.updatedAt || next.createdAt || ''
  const newer = nextTs >= prevTs ? next : prev
  const older = nextTs >= prevTs ? prev : next
  const password = newer.password || older.password || ''
  const login = newer.login || older.login || ''
  return { ...newer, password, login }
}

/** Объединяет аккаунты; сохраняет пароль и более свежий updatedAt */
export function mergeAccounts(a: SavedAccount[], b: SavedAccount[]): SavedAccount[] {
  const map = new Map<string, SavedAccount>()
  for (const account of [...a, ...b]) {
    if (!account?.userKey) continue
    const prev = map.get(account.userKey)
    map.set(account.userKey, prev ? pickBetterAccount(prev, account) : account)
  }
  return Array.from(map.values())
}

function accountFromPersonProfile(profile: PersonProfile): SavedAccount {
  const phoneDigits = profile.phone.replace(/\D/g, '')
  return {
    userKey: profile.userKey,
    login: phoneDigits,
    password: '',
    fullName: profile.fullName,
    phone: profile.phone,
    role: profile.role,
    contractorId: profile.contractorId ?? '',
    specializationIds: profile.specializationIds ?? [],
    organizationId: profile.organizationId ?? '',
    organizationLinkStatus: 'none',
    organizationName: '',
    inn: '',
    workerMemberId: profile.workerMemberId ?? '',
    facePhoto: profile.facePhoto ?? '',
    personalCode: profile.personalCode ?? '',
    workerEmploymentType: profile.workerEmploymentType ?? '',
    workerBrigadeMode: profile.workerBrigadeMode ?? '',
    brigadeId: profile.brigadeId ?? '',
    brigadeCode: profile.brigadeCode ?? '',
    foremanUserKey: profile.foremanUserKey ?? '',
    createdAt: profile.createdAt,
    updatedAt: profile.createdAt,
  }
}

/** Восстановление из stroyhub-person-profiles (если реестр аккаунтов потерян) */
export function loadAccountsFromPersonProfiles(): SavedAccount[] {
  const state = getPersistedState<{ profiles?: Record<string, PersonProfile> }>(
    STORAGE_KEYS.PERSON_PROFILES,
  )
  if (!state?.profiles) return []
  return Object.values(state.profiles).map(accountFromPersonProfile)
}

export function loadAllAccountsEverywhere(): SavedAccount[] {
  return mergeAccounts(
    mergeAccounts(loadAccountsFromDisk(), loadAccountsFromUserPersist()),
    loadAccountsFromPersonProfiles(),
  )
}

/** Только реальные аккаунты с паролем — для входа */
export function resolveAuthAccounts(inMemory: SavedAccount[]): SavedAccount[] {
  return mergeAccounts(mergeAccounts(inMemory, loadAccountsFromDisk()), loadAccountsFromUserPersist())
}

export function resolveAccounts(inMemory: SavedAccount[]): SavedAccount[] {
  return mergeAccounts(inMemory, loadAllAccountsEverywhere())
}

export function saveAccountsToDisk(accounts: SavedAccount[]): boolean {
  const compact = compactAll(accounts)
  try {
    setJSON(STORAGE_KEYS.ACCOUNTS, compact)
    if (getItem(STORAGE_KEYS.ACCOUNTS)) return true
  } catch {
    /* ignore */
  }
  return false
}

/** Синхронизирует accounts в stroyhub-user — только если стор уже есть на диске */
export function patchUserPersistAccounts(accounts: SavedAccount[]): void {
  const state = getPersistedState<Record<string, unknown>>(STORAGE_KEYS.USER)
  if (!state) return
  const envelope = getJSON<{ version?: number }>(STORAGE_KEYS.USER)
  setJSON(STORAGE_KEYS.USER, {
    state: { ...state, accounts: compactAll(accounts) },
    version: envelope?.version ?? 5,
  })
}

/** Восстановить все аккаунты из localStorage (без перезаписи сессии) */
export function recoverAllAccounts(inMemory: SavedAccount[] = []): SavedAccount[] {
  return resolveAccounts(inMemory)
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return phone
  return `••• ${digits.slice(-4)}`
}
