import { useNotificationStore } from '@store/notificationStore'

export function notifyMaterialRequest(params: {
  objectId: string
  taskId: string
  materialName: string
  workerName: string
  urgency: string
}) {
  useNotificationStore.getState().addNotification({
    type: 'material_request',
    title: 'Заявка на материал',
    message: `${params.workerName}: ${params.materialName} (${params.urgency})`,
    objectId: params.objectId,
    taskId: params.taskId,
    targetRoles: ['foreman'],
  })
}

export function notifyMaterialOrdered(params: {
  objectId: string
  taskId: string
  materialName: string
  targetWorkerId?: string
}) {
  if (!params.targetWorkerId) return
  useNotificationStore.getState().addNotification({
    type: 'material_ordered',
    title: 'Материал заказан',
    message: `Заказано: ${params.materialName}`,
    objectId: params.objectId,
    taskId: params.taskId,
    targetRoles: ['worker'],
    targetWorkerId: params.targetWorkerId,
  })
}

export function notifyMaterialDelivered(params: {
  objectId: string
  taskId: string
  materialName: string
  targetWorkerId?: string
}) {
  if (!params.targetWorkerId) return
  useNotificationStore.getState().addNotification({
    type: 'material_delivered',
    title: 'Материал привезён',
    message: `${params.materialName} — можно работать`,
    objectId: params.objectId,
    taskId: params.taskId,
    targetRoles: ['worker'],
    targetWorkerId: params.targetWorkerId,
  })
}

export function notifyMaterialReimbursementRequest(params: {
  objectId: string
  taskId: string
  materialName: string
  amount: number
  reimburseFrom: 'client' | 'organization'
  foremanName: string
}) {
  useNotificationStore.getState().addNotification({
    type: 'material_reimbursement',
    title: 'Запрос на возмещение',
    message: `${params.foremanName}: ${params.materialName} — ${params.amount.toLocaleString('ru-RU')} ₽`,
    objectId: params.objectId,
    taskId: params.taskId,
    targetRoles: params.reimburseFrom === 'client' ? ['client'] : ['subcontractor'],
  })
}

export function notifyMaterialReimbursementApproved(params: {
  objectId: string
  taskId: string
  materialName: string
  amount: number
  foremanName: string
}) {
  useNotificationStore.getState().addNotification({
    type: 'material_reimbursement_approved',
    title: 'Возмещение подтверждено',
    message: `${params.materialName}: ${params.amount.toLocaleString('ru-RU')} ₽`,
    objectId: params.objectId,
    taskId: params.taskId,
    targetRoles: ['foreman'],
  })
}
