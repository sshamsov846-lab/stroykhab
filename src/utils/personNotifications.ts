import { useNotificationStore } from '@store/notificationStore'

export function notifyForemanJoinRequest(params: {
  contractorId: string
  foremanName: string
  facePhoto?: string
  personalCode?: string
  specialization: string
}): void {
  useNotificationStore.getState().addNotification({
    type: 'member_join_request',
    title: 'Новый прораб',
    message: `${params.foremanName} (${params.personalCode ?? '—'}) хочет присоединиться · ${params.specialization}`,
    targetRoles: ['subcontractor'],
    targetContractorId: params.contractorId,
    facePhoto: params.facePhoto,
  })
}

export function notifyWorkerJoinedForeman(params: {
  foremanUserKey: string
  workerName: string
  facePhoto?: string
  specialization: string
  workerType: string
  personalCode?: string
}): void {
  useNotificationStore.getState().addNotification({
    type: 'worker_joined',
    title: 'Новый мастер',
    message: `${params.workerName} (${params.personalCode ?? '—'}) · ${params.specialization} · ${params.workerType}`,
    targetRoles: [],
    targetUserKeys: [params.foremanUserKey],
    facePhoto: params.facePhoto,
  })
}

export function notifyJoinRequestApproved(params: {
  userKey: string
  orgName: string
}): void {
  useNotificationStore.getState().addNotification({
    type: 'member_join_approved',
    title: 'Привязка подтверждена',
    message: `Организация «${params.orgName}» подтвердила вашу привязку`,
    targetRoles: [],
    targetUserKeys: [params.userKey],
  })
}

export function notifyJoinRequestRejected(params: {
  userKey: string
  orgName: string
}): void {
  useNotificationStore.getState().addNotification({
    type: 'member_join_rejected',
    title: 'Запрос отклонён',
    message: `Организация «${params.orgName}» отклонила привязку`,
    targetRoles: [],
    targetUserKeys: [params.userKey],
  })
}
