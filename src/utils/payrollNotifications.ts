import { useNotificationStore } from '@store/notificationStore'
import { FINE_REASON_LABELS, BONUS_REASON_LABELS, type FineReason, type BonusReason } from '@/types/workerPayroll'

export function notifyPayrollFine(params: {
  workerId: string
  amount: number
  reason: FineReason
  issuedBy: string
}) {
  useNotificationStore.getState().addNotification({
    type: 'payroll_fine',
    title: 'Штраф',
    message: `${FINE_REASON_LABELS[params.reason]}: −${params.amount.toLocaleString('ru-RU')} ₽ (${params.issuedBy})`,
    targetRoles: ['worker'],
    targetWorkerId: params.workerId,
  })
}

export function notifyPayrollBonus(params: {
  workerId: string
  amount: number
  reason: BonusReason
  issuedBy: string
}) {
  useNotificationStore.getState().addNotification({
    type: 'payroll_bonus',
    title: 'Премия',
    message: `${BONUS_REASON_LABELS[params.reason]}: +${params.amount.toLocaleString('ru-RU')} ₽ (${params.issuedBy})`,
    targetRoles: ['worker'],
    targetWorkerId: params.workerId,
  })
}
