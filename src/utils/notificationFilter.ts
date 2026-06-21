import type { AppNotification } from '@store/notificationStore'
import type { AppRole } from '@store/userStore'
import { useUserStore } from '@store/userStore'
import { useObjectStore } from '@store/objectStore'

/** Уникальный ключ пользователя для привязки прочитанных уведомлений */
export function buildUserKey(
  phone: string,
  role: AppRole,
  contractorId: string,
  fullName: string,
): string {
  const normalizedPhone = phone.replace(/\D/g, '')
  return `${normalizedPhone}|${role}|${contractorId}|${fullName.trim().toLowerCase()}`
}

export function getCurrentUserKey(): string {
  const { phone, role, contractorId, fullName } = useUserStore.getState()
  return buildUserKey(phone, role, contractorId, fullName)
}

export function resolveWorkerIdForUser(fullName: string): string | undefined {
  const { workerMemberId } = useUserStore.getState()
  if (workerMemberId) return workerMemberId

  if (!fullName?.trim()) return undefined
  const first = fullName.trim().split(/\s+/)[0].toLowerCase()
  const { teamMembers, contractorWorkers } = useObjectStore.getState()
  const foremanWorker = teamMembers.find((m) => m.name.toLowerCase().includes(first))
  if (foremanWorker) return foremanWorker.id
  for (const workers of Object.values(contractorWorkers)) {
    const found = workers.find((m) => m.name.toLowerCase().includes(first))
    if (found) return found.id
  }
  return undefined
}

export function notificationMatchesUser(
  n: AppNotification,
  ctx?: { role: AppRole; contractorId: string; fullName: string; userKey?: string },
): boolean {
  const state = ctx ?? useUserStore.getState()
  const { role, contractorId, fullName } = state
  const userKey = ctx?.userKey ?? getCurrentUserKey()

  if (n.targetUserKeys?.length) {
    return n.targetUserKeys.includes(userKey)
  }

  if (!n.targetRoles.includes(role)) return false
  if (n.targetContractorId && n.targetContractorId !== contractorId) return false
  if (n.targetWorkerId) {
    const workerId = resolveWorkerIdForUser(fullName)
    if (workerId !== n.targetWorkerId) return false
  }
  return true
}

export function isReadForUser(n: AppNotification, userKey?: string): boolean {
  const key = userKey ?? getCurrentUserKey()
  if (n.readByUserKeys.includes(key)) return true
  // миграция со старого поля read
  const legacy = n as AppNotification & { read?: boolean }
  return legacy.read === true
}

export function filterNotificationsForUser(notifications: AppNotification[]): AppNotification[] {
  return notifications.filter((n) => notificationMatchesUser(n))
}

export function unreadCount(notifications: AppNotification[]): number {
  const key = getCurrentUserKey()
  return filterNotificationsForUser(notifications).filter((n) => !isReadForUser(n, key)).length
}
