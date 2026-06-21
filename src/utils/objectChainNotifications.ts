import { useNotificationStore } from '@store/notificationStore'

export function notifyOrgAddedToObject(params: {
  objectId: string
  objectName: string
  orgUserKey: string
  clientName: string
}): void {
  useNotificationStore.getState().addNotification({
    type: 'object_org_added',
    title: 'Новый объект',
    message: `Заказчик добавил вас на объект «${params.objectName}»`,
    objectId: params.objectId,
    targetRoles: [],
    targetUserKeys: [params.orgUserKey],
  })
}

export function notifyForemanAssignedToObject(params: {
  objectId: string
  objectName: string
  foremanUserKey: string
  orgName: string
  facePhoto?: string
}): void {
  useNotificationStore.getState().addNotification({
    type: 'object_foreman_assigned',
    title: 'Назначение на объект',
    message: `Организация «${params.orgName}» назначила вас на объект «${params.objectName}»`,
    objectId: params.objectId,
    targetRoles: [],
    targetUserKeys: [params.foremanUserKey],
    facePhoto: params.facePhoto,
  })
}

export function notifyWorkerWorkStarted(params: {
  objectId: string
  taskId: string
  workerName: string
  locationLabel: string
  foremanUserKeys: string[]
}): void {
  for (const key of params.foremanUserKeys) {
    useNotificationStore.getState().addNotification({
      type: 'task_work_started',
      title: 'Мастер начал работу',
      message: `${params.workerName} начал работу: ${params.locationLabel}`,
      objectId: params.objectId,
      taskId: params.taskId,
      targetRoles: [],
      targetUserKeys: [key],
    })
  }
}
