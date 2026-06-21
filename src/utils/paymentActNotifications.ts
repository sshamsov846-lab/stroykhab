import type { AppNotification } from '@store/notificationStore'
import { useNotificationStore } from '@store/notificationStore'
import { formatMoney } from '@utils/workerPayrollCalc'
import { useBrigadeStore } from '@store/brigadeStore'
import { usePersonProfileStore } from '@store/personProfileStore'

function push(input: Omit<AppNotification, 'id' | 'readByUserKeys' | 'createdAt'>) {
  useNotificationStore.getState().addNotification(input)
}

export function notifyWorkerReportSubmitted(params: {
  objectId: string
  objectName: string
  executorName: string
  foremanUserKey: string
  paymentActId: string
}) {
  push({
    type: 'payment_report_submitted',
    title: 'Отчёт о выполненных работах',
    message: `${params.executorName} отправил отчёт по объекту «${params.objectName}»`,
    objectId: params.objectId,
    targetRoles: ['foreman'],
    targetUserKeys: [params.foremanUserKey],
  })
}

export function notifyPaymentActToOrg(params: {
  objectId: string
  objectName: string
  amount: number
  orgId: string
  paymentActId: string
}) {
  push({
    type: 'payment_act_sent_org',
    title: 'Новый акт на оплату',
    message: `Акт на оплату ${formatMoney(params.amount)} по объекту «${params.objectName}»`,
    objectId: params.objectId,
    targetRoles: ['subcontractor'],
    targetContractorId: params.orgId,
  })
}

export function notifyPaymentActToClient(params: {
  objectId: string
  objectName: string
  amount: number
  clientUserKey: string
  paymentActId: string
}) {
  push({
    type: 'payment_act_sent_client',
    title: 'Акт на оплату',
    message: `Акт на оплату ${formatMoney(params.amount)} по объекту «${params.objectName}»`,
    objectId: params.objectId,
    targetRoles: ['client'],
    targetUserKeys: [params.clientUserKey],
  })
}

export function notifyPaymentActReturned(params: {
  objectId: string
  objectName: string
  reason: string
  targetUserKeys: string[]
  targetRoles: AppNotification['targetRoles']
}) {
  push({
    type: 'payment_act_returned',
    title: 'Акт возвращён на уточнение',
    message: `«${params.objectName}»: ${params.reason}`,
    objectId: params.objectId,
    targetRoles: params.targetRoles,
    targetUserKeys: params.targetUserKeys,
  })
}

export function notifyPaymentActPaid(params: {
  objectId: string
  objectName: string
  amount: number
  targetUserKeys: string[]
  targetRoles: AppNotification['targetRoles']
  workerId?: string
  brigadeId?: string
}) {
  push({
    type: 'payment_act_paid',
    title: 'Акт оплачен',
    message: `Оплачено ${formatMoney(params.amount)} — «${params.objectName}»`,
    objectId: params.objectId,
    targetRoles: params.targetRoles,
    targetUserKeys: params.targetUserKeys,
    targetWorkerId: params.workerId,
  })

  if (params.brigadeId) {
    const brigade = useBrigadeStore.getState().getBrigade(params.brigadeId)
    if (brigade) {
      for (const key of brigade.memberUserKeys) {
        if (params.targetUserKeys.includes(key)) continue
        const profile = usePersonProfileStore.getState().profiles[key]
        push({
          type: 'payment_act_paid',
          title: 'Бригада получила оплату',
          message: `Бригада получила ${formatMoney(params.amount)} — «${params.objectName}»`,
          objectId: params.objectId,
          targetRoles: ['worker'],
          targetUserKeys: [key],
        })
        void profile
      }
    }
  }
}
