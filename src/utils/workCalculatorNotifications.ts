import { useNotificationStore } from '@store/notificationStore'
import { formatMoney } from '@utils/workerPayrollCalc'

export function notifyCalculatorSubmitted(params: {
  taskId: string
  objectId: string
  objectName: string
  workerName: string
  foremanUserKey: string
  grandTotal: number
  calculatorId: string
}) {
  useNotificationStore.getState().addNotification({
    type: 'work_calculator_submitted',
    title: 'Новый отчёт от мастера',
    message: `Новый отчёт от ${params.workerName}: «${params.objectName}», ${formatMoney(params.grandTotal)}`,
    taskId: params.taskId,
    objectId: params.objectId,
    targetRoles: ['foreman'],
    targetUserKeys: [params.foremanUserKey],
  })
}

export function notifyCalculatorAccepted(params: {
  taskId: string
  objectId: string
  objectName: string
  workerUserKey: string
  grandTotal: number
}) {
  useNotificationStore.getState().addNotification({
    type: 'work_calculator_accepted',
    title: 'Отчёт принят',
    message: `Прораб принял ваш отчёт по «${params.objectName}» на ${formatMoney(params.grandTotal)}`,
    taskId: params.taskId,
    objectId: params.objectId,
    targetRoles: ['worker'],
    targetUserKeys: [params.workerUserKey],
  })
}

export function notifyCalculatorReturned(params: {
  taskId: string
  objectId: string
  objectName: string
  workerUserKey: string
  reason: string
}) {
  useNotificationStore.getState().addNotification({
    type: 'work_calculator_returned',
    title: 'Отчёт возвращён',
    message: `«${params.objectName}»: ${params.reason}`,
    taskId: params.taskId,
    objectId: params.objectId,
    targetRoles: ['worker'],
    targetUserKeys: [params.workerUserKey],
  })
}
