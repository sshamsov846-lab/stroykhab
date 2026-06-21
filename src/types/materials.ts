export type MaterialUrgency = 'normal' | 'urgent' | 'critical'

export type MaterialRequestStatus = 'pending' | 'ordered' | 'delivered' | 'cancelled'

/** Кто оплачивает материал по договору */
export type MaterialPaymentPayer = 'client' | 'organization' | 'foreman'

/** @deprecated используйте MaterialPaymentPayer */
export type MaterialPaidBy = MaterialPaymentPayer

export type MaterialPaymentPolicy =
  | 'client_material'
  | 'turnkey'
  | 'foreman_receipts'
  | 'mixed'

export type MaterialReimbursementStatus = 'pending' | 'approved' | 'rejected'

export interface MaterialReimbursement {
  status: MaterialReimbursementStatus
  requestedAt: string
  requestedBy: string
  /** Кто должен возместить прорабу */
  reimburseFrom: 'client' | 'organization'
  amount: number
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
}

export interface ObjectMaterialPaymentSettings {
  policy: MaterialPaymentPolicy
  /** Кто возмещает прорабу при политике «по чекам» */
  reimbursementSource?: 'client' | 'organization'
  updatedAt: string
  updatedBy?: string
}

export const MATERIAL_UNITS = ['мешок', 'м', 'шт', 'кг', 'л', 'уп', 'м²', 'м³'] as const

export type MaterialUnit = (typeof MATERIAL_UNITS)[number]

export const URGENCY_LABELS: Record<MaterialUrgency, string> = {
  normal: 'Обычная',
  urgent: 'Срочно',
  critical: 'Критично',
}

export const REQUEST_STATUS_LABELS: Record<MaterialRequestStatus, string> = {
  pending: 'Новая',
  ordered: 'Заказано',
  delivered: 'Привезено',
  cancelled: 'Отменена',
}

export const PAID_BY_LABELS: Record<MaterialPaymentPayer, string> = {
  client: 'Заказчик',
  organization: 'Организация',
  foreman: 'Прораб',
}

export const REIMBURSEMENT_STATUS_LABELS: Record<MaterialReimbursementStatus, string> = {
  pending: 'Ожидает подтверждения',
  approved: 'Возмещено',
  rejected: 'Отклонено',
}

export interface WorkflowMaterialRequest {
  id: string
  objectId: string
  taskId: string
  taskTitle: string
  name: string
  quantity: number
  unit: string
  urgency: MaterialUrgency
  status: MaterialRequestStatus
  requestedBy: string
  requestedByWorkerId?: string
  createdAt: string
  orderedAt?: string
  deliveredAt?: string
  deliveredBy?: string
  deliveredQuantity?: number
  /** Сумма покупки, ₽ */
  price?: number
  /** Кто оплачивает по договору */
  paymentPayer?: MaterialPaymentPayer
  /** @deprecated — дублирует paymentPayer для старых записей */
  paidBy?: MaterialPaymentPayer
  /** Кто физически купил */
  purchasedBy?: string
  purchasedByPayer?: MaterialPaymentPayer
  purchaseDate?: string
  receiptPhotoUrl?: string
  reimbursement?: MaterialReimbursement
}

export interface StockItem {
  id: string
  objectId: string
  name: string
  unit: string
  quantity: number
  updatedAt: string
}

export interface StockWriteOff {
  id: string
  objectId: string
  stockItemId: string
  stockName: string
  taskId?: string
  quantity: number
  writtenBy: string
  createdAt: string
  note?: string
}

export interface MaterialWaitState {
  id: string
  taskId: string
  objectId: string
  taskTitle: string
  requestId?: string
  workerName: string
  since: string
  endedAt?: string
}

export interface MaterialSpendSummary {
  totalDelivered: number
  byPayer: Record<MaterialPaymentPayer, number>
  pendingReimbursement: number
  approvedReimbursement: number
  foremanPurchased: number
}
