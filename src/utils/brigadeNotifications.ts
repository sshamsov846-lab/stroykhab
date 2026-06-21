import { useNotificationStore } from '@store/notificationStore'
import { useBrigadeStore } from '@store/brigadeStore'
import { usePersonProfileStore } from '@store/personProfileStore'

function memberUserKeys(brigadeId: string): string[] {
  const b = useBrigadeStore.getState().getBrigade(brigadeId)
  return b?.memberUserKeys ?? []
}

export function notifyBrigadeTaskAssigned(params: {
  brigadeId: string
  taskId: string
  objectId: string
  locationLabel: string
}): void {
  const keys = memberUserKeys(params.brigadeId)
  if (keys.length === 0) return
  useNotificationStore.getState().addNotification({
    type: 'brigade_task_assigned',
    title: 'Работа для бригады',
    message: `Бригаде назначена работа: ${params.locationLabel}`,
    taskId: params.taskId,
    objectId: params.objectId,
    targetRoles: [],
    targetUserKeys: keys,
  })
}

export function notifyBrigadePayroll(params: {
  brigadeId: string
  amount: number
  kind: 'accrual' | 'advance'
  taskTitle?: string
}): void {
  const keys = memberUserKeys(params.brigadeId)
  if (keys.length === 0) return
  const sum = params.amount.toLocaleString('ru-RU')
  const msg =
    params.kind === 'accrual'
      ? `Бригада получила ЗП ${sum} ₽${params.taskTitle ? ` · ${params.taskTitle}` : ''}`
      : `Бригаде выдан аванс ${sum} ₽`
  useNotificationStore.getState().addNotification({
    type: 'brigade_payroll',
    title: params.kind === 'accrual' ? 'ЗП бригады' : 'Аванс бригады',
    message: msg,
    targetRoles: [],
    targetUserKeys: keys,
  })
}

export function notifyBrigadeMemberJoined(params: {
  brigadeId: string
  memberName: string
  leaderUserKey: string
}): void {
  useNotificationStore.getState().addNotification({
    type: 'brigade_member_joined',
    title: 'Новый в бригаде',
    message: `${params.memberName} присоединился к вашей бригаде`,
    targetRoles: [],
    targetUserKeys: [params.leaderUserKey],
  })
}

export function getBrigadeMemberProfiles(brigadeId: string) {
  const b = useBrigadeStore.getState().getBrigade(brigadeId)
  if (!b) return []
  return b.memberUserKeys
    .map((k) => usePersonProfileStore.getState().getByUserKey(k))
    .filter((p): p is NonNullable<typeof p> => !!p)
}
