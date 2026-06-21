import type { WorkType } from '@types'
import type { VolumeUnit } from '@/types/workerPayroll'

export type PaymentActStatus =
  | 'worker_submitted'
  | 'act_draft'
  | 'sent_to_org'
  | 'sent_to_client'
  | 'returned'
  | 'paid'

export const PAYMENT_ACT_STATUS_LABELS: Record<PaymentActStatus, string> = {
  worker_submitted: 'Отчёт мастера',
  act_draft: 'Черновик акта',
  sent_to_org: 'У организации',
  sent_to_client: 'У заказчика',
  returned: 'На уточнении',
  paid: 'Оплачено',
}

export interface WorkReportLineItem {
  id: string
  workType: WorkType
  label: string
  volume: number
  unit: VolumeUnit
  note?: string
}

export interface PaymentActLineItem {
  id: string
  workType: WorkType
  label: string
  volume: number
  unit: VolumeUnit
  /** прораб → мастер */
  outgoingUnitPrice: number
  /** орг → прораб */
  incomingUnitPrice: number
  /** орг → заказчик */
  clientUnitPrice: number
  workerAmount: number
  foremanAmount: number
  clientAmount: number
  note?: string
}

export interface WorkerCompletionReport {
  submittedAt: string
  submittedBy: string
  submittedByUserKey: string
  lineItems: WorkReportLineItem[]
  photos: string[]
  note?: string
}

export interface PaymentAct {
  id: string
  actNumber: string
  objectId: string
  objectName: string
  taskIds: string[]
  executorType: 'brigade' | 'solo'
  executorName: string
  workerId?: string
  brigadeId?: string
  foremanUserKey?: string
  orgId?: string
  clientUserKey?: string
  periodFrom: string
  periodTo: string
  status: PaymentActStatus
  workerReport?: WorkerCompletionReport
  lineItems: PaymentActLineItem[]
  photos: string[]
  scanAttachments: string[]
  workerTotal: number
  foremanTotal: number
  clientTotal: number
  returnReason?: string
  returnedBy?: 'client' | 'org' | 'foreman'
  formedAt?: string
  formedBy?: string
  sentToOrgAt?: string
  sentToClientAt?: string
  paidAt?: string
  isDistributed?: boolean
  createdAt: string
  updatedAt: string
}
