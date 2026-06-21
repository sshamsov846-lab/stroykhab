import { useNotificationStore } from '@store/notificationStore'
import type { ObjectAccessRole } from '@/types/objectAccess'

const ROLE_LABELS: Record<ObjectAccessRole, string> = {
  client: 'Заказчик',
  foreman: 'Прораб',
  subcontractor: 'Организация',
  worker: 'Мастер',
}

export function notifyObjectMemberJoined(params: {
  objectId: string
  objectName: string
  memberName: string
  memberRole: ObjectAccessRole
  ownerClientUserKey?: string
}): void {
  const roleLabel = ROLE_LABELS[params.memberRole]
  useNotificationStore.getState().addNotification({
    type: 'object_member_joined',
    title: 'Подключение к объекту',
    message: `${roleLabel} ${params.memberName} подключился к объекту «${params.objectName}»`,
    objectId: params.objectId,
    targetRoles: ['client'],
    targetUserKeys: params.ownerClientUserKey ? [params.ownerClientUserKey] : undefined,
  })
}

export function notifyObjectMemberRevoked(params: {
  objectId: string
  objectName: string
  memberName: string
  memberUserKey: string
  revokedByName: string
}): void {
  useNotificationStore.getState().addNotification({
    type: 'object_member_revoked',
    title: 'Доступ отозван',
    message: `${params.revokedByName} отозвал ваш доступ к объекту «${params.objectName}»`,
    objectId: params.objectId,
    targetRoles: [],
    targetUserKeys: [params.memberUserKey],
  })
}

export function notifyWorkerAddedToObject(params: {
  objectId: string
  objectName: string
  workerName: string
  workerUserKey?: string
  foremanName: string
}): void {
  if (!params.workerUserKey) return
  useNotificationStore.getState().addNotification({
    type: 'object_member_joined',
    title: 'Доступ к объекту',
    message: `${params.foremanName} добавил вас на объект «${params.objectName}»`,
    objectId: params.objectId,
    targetRoles: [],
    targetUserKeys: [params.workerUserKey],
  })
}
