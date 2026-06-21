import type {
  MaterialPaymentPayer,
  MaterialPaymentPolicy,
  ObjectMaterialPaymentSettings,
  WorkflowMaterialRequest,
} from '@/types/materials'

export const PAYMENT_POLICY_LABELS: Record<MaterialPaymentPolicy, string> = {
  client_material: 'Материал заказчика',
  turnkey: 'Под ключ (организация)',
  foreman_receipts: 'По чекам прораба',
  mixed: 'Смешанно',
}

export const PAYMENT_POLICY_HINTS: Record<MaterialPaymentPolicy, string> = {
  client_material: 'Заказчик закупает или возмещает все материалы',
  turnkey: 'Организация включает материалы в договор',
  foreman_receipts: 'Прораб покупает по чекам, ему возмещают',
  mixed: 'По каждому материалу указывается отдельно',
}

export const PAYMENT_PAYER_LABELS: Record<MaterialPaymentPayer, string> = {
  client: 'Заказчик',
  organization: 'Организация',
  foreman: 'Прораб',
}

export const DEFAULT_OBJECT_MATERIAL_SETTINGS: ObjectMaterialPaymentSettings = {
  policy: 'client_material',
  reimbursementSource: 'client',
  updatedAt: '',
}

export function defaultPayerFromPolicy(
  policy: MaterialPaymentPolicy,
): MaterialPaymentPayer | undefined {
  switch (policy) {
    case 'client_material':
      return 'client'
    case 'turnkey':
      return 'organization'
    case 'foreman_receipts':
      return 'foreman'
    case 'mixed':
      return undefined
  }
}

export function resolveRequestPaymentPayer(
  settings: ObjectMaterialPaymentSettings,
  requestPayer?: MaterialPaymentPayer,
): MaterialPaymentPayer | undefined {
  if (requestPayer) return requestPayer
  return defaultPayerFromPolicy(settings.policy)
}

export function effectivePaymentPayer(req: WorkflowMaterialRequest): MaterialPaymentPayer | undefined {
  return req.paymentPayer ?? req.paidBy
}

export function effectivePurchasedByPayer(req: WorkflowMaterialRequest): MaterialPaymentPayer | undefined {
  return req.purchasedByPayer ?? req.paidBy
}

export function needsReimbursement(
  paymentPayer: MaterialPaymentPayer,
  purchasedByPayer: MaterialPaymentPayer,
): boolean {
  return purchasedByPayer === 'foreman' && paymentPayer !== 'foreman'
}

export function reimbursementSourceFor(
  settings: ObjectMaterialPaymentSettings,
  paymentPayer: MaterialPaymentPayer,
): 'client' | 'organization' {
  if (paymentPayer === 'organization') return 'organization'
  if (settings.policy === 'foreman_receipts') {
    return settings.reimbursementSource ?? 'client'
  }
  return 'client'
}
