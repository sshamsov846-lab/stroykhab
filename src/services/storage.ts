import type { StateStorage } from 'zustand/middleware'

/** Ключи хранилища — единая точка для миграции на сервер */
export const STORAGE_KEYS = {
  USER: 'stroyhub-user',
  OBJECT: 'stroy-object-store',
  WORKFLOW: 'stroyhub-workflow',
  CLIENT_PORTAL: 'stroy-client-portal',
  OFFLINE_QUEUE: 'stroyhub_offline_queue',
  CACHE: 'stroyhub_cache',
  LEGACY_TASKS: 'stroyhub-legacy-tasks',
  NOTIFICATIONS: 'stroyhub-notifications',
  AUDIT_LOG: 'stroyhub-audit-log',
  WORKER_PAYROLL: 'stroyhub-worker-payroll',
  FOREMAN_PAYROLL: 'stroyhub-foreman-payroll',
  RATE_CATALOG: 'stroyhub-rate-catalog',
  ACCEPTANCE_REPORTS: 'stroyhub-acceptance-reports',
  ORGANIZATION: 'stroyhub-organization',
  MATERIALS: 'stroyhub-materials',
  ATTENDANCE: 'stroyhub-attendance',
  QUALITY_ACCEPTANCE: 'stroyhub-quality-acceptance',
  OBJECT_ACCESS: 'stroyhub-object-access',
  PERSON_PROFILES: 'stroyhub-person-profiles',
  BRIGADES: 'stroyhub-brigades',
  PAYMENT_ACTS: 'stroyhub-payment-acts',
  PAYMENT_SETTINGS: 'stroyhub-payment-settings',
  OBJECT_DOCUMENTS: 'stroyhub-object-documents',
  WORK_CALCULATOR: 'stroyhub-work-calculator',
  /** Плоский реестр кодов объектов — не затирается сторами */
  INVITE_REGISTRY: 'stroyhub-invite-registry',
  /** Реестр зарегистрированных организаций */
  ORG_REGISTRY: 'stroyhub-org-registry',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

interface PersistEnvelope<T> {
  state: T
  version?: number
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

export function getItem(key: string): string | null {
  const storage = safeStorage()
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

export function setItem(key: string, value: string): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(key, value)
  } catch {
    /* quota / private mode */
  }
}

export function removeItem(key: string): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function getJSON<T>(key: string): T | null {
  const raw = getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function setJSON(key: string, value: unknown): void {
  setItem(key, JSON.stringify(value))
}

/** Чтение state из zustand persist */
export function getPersistedState<T>(key: StorageKey | string): T | null {
  const envelope = getJSON<PersistEnvelope<T>>(key)
  return envelope?.state ?? null
}

/** Запись state в zustand persist */
export function setPersistedState<T>(key: StorageKey | string, state: T): void {
  const existing = getJSON<PersistEnvelope<T>>(key)
  setJSON(key, { state, version: existing?.version ?? 0 })
}

/** Частичное обновление zustand persist state */
export function patchPersistedState<T extends object>(key: StorageKey | string, patch: Partial<T>): void {
  const current = getPersistedState<T>(key)
  if (!current) return
  setPersistedState(key, { ...current, ...patch })
}

/** Адаптер для zustand persist — все сторы используют один слой */
export function createZustandStorage(): StateStorage {
  return {
    getItem: (name) => getItem(name),
    setItem: (name, value) => setItem(name, value),
    removeItem: (name) => removeItem(name),
  }
}
