import type { PayType } from '@/types/workerPayroll'
import type {
  CompanyRequisites,
  PaymentCalcMode,
  PaymentDocumentMode,
  PaymentLevelSettings,
} from '@/types/paymentSettings'
import { usePaymentSettingsStore } from '@store/paymentSettingsStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { getCurrentUserKey } from '@utils/notificationFilter'

export function getForemanUserKeyForTask(taskId: string): string | undefined {
  const task = useProjectWorkflowStore.getState().tasks[taskId]
  if (!task) return undefined
  const members = useObjectAccessStore.getState().getActiveMembers(task.objectId)
  const foreman = members.find((m) => m.role === 'foreman')
  return foreman?.userKey
}

export function getForemanPaySettingsForTask(taskId: string): PaymentLevelSettings {
  const key = getForemanUserKeyForTask(taskId) ?? getCurrentUserKey()
  return usePaymentSettingsStore.getState().getForemanProfile(key).payWorkers
}

export function getOrgPayForemanSettings(contractorId: string): PaymentLevelSettings {
  return usePaymentSettingsStore.getState().getOrgProfile(contractorId).payForemen
}

export function getOrgChargeClientSettings(contractorId: string): PaymentLevelSettings {
  return usePaymentSettingsStore.getState().getOrgProfile(contractorId).chargeClient
}

export function shouldAccrueWorkerOnAccept(taskId: string): boolean {
  return getForemanPaySettingsForTask(taskId).closingTrigger === 'immediate'
}

export function shouldAccrueForemanOnAccept(taskId: string): boolean {
  const task = useProjectWorkflowStore.getState().tasks[taskId]
  if (!task?.contractorId) return false
  return getOrgPayForemanSettings(task.contractorId).closingTrigger === 'immediate'
}

export function showWorkerReportForTask(taskId: string): boolean {
  const mode = getForemanPaySettingsForTask(taskId).closingTrigger
  return mode === 'period_act'
}

export function showManualAccrualForTask(taskId: string): boolean {
  return getForemanPaySettingsForTask(taskId).closingTrigger === 'manual'
}

export function showPeriodActActions(foremanUserKey?: string): boolean {
  const key = foremanUserKey ?? getCurrentUserKey()
  return usePaymentSettingsStore.getState().getForemanProfile(key).payWorkers.closingTrigger === 'period_act'
}

export function allowedPayTypes(calcMode: PaymentCalcMode): PayType[] {
  switch (calcMode) {
    case 'volume':
      return ['volume']
    case 'time':
      return ['daily', 'hourly']
    case 'fixed':
      return ['fixed']
    case 'mixed':
      return ['volume', 'daily', 'hourly', 'fixed']
    default:
      return ['volume', 'daily', 'hourly', 'fixed']
  }
}

export function defaultPayTypeForCalc(calcMode: PaymentCalcMode): PayType {
  const types = allowedPayTypes(calcMode)
  return types[0] ?? 'volume'
}

export function resolveDocumentModeForForeman(foremanUserKey?: string): PaymentDocumentMode {
  const key = foremanUserKey ?? getCurrentUserKey()
  return usePaymentSettingsStore.getState().getForemanProfile(key).payWorkers.documentMode
}

export function resolveRequisitesForForeman(foremanUserKey?: string): CompanyRequisites | undefined {
  const key = foremanUserKey ?? getCurrentUserKey()
  const profile = usePaymentSettingsStore.getState().getForemanProfile(key)
  if (profile.payWorkers.documentMode !== 'official_pdf') return undefined
  return profile.requisites
}

export function resolveRequisitesForOrg(contractorId: string): CompanyRequisites | undefined {
  const profile = usePaymentSettingsStore.getState().getOrgProfile(contractorId)
  if (profile.chargeClient.documentMode !== 'official_pdf') return undefined
  return profile.requisites
}

export function needsRequisites(documentMode: PaymentDocumentMode): boolean {
  return documentMode === 'official_pdf'
}
