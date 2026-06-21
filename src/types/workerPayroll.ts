import type { WorkType } from '@types'

export type PayType = 'daily' | 'hourly' | 'volume' | 'fixed' | 'redo'
export type RedoReason = 'own_fault' | 'other_fault'

export type VolumeUnit = 'm2' | 'pcs' | 'lm' | 'm3' | 'point'

/** Начисление за принятую задачу — попадает в «счёт мастера» */
export interface AccrualEntry {
  id: string
  taskId: string
  taskTitle: string
  objectId?: string
  /** Название объекта (ЖК или подработка) */
  objectName?: string
  isSideJob?: boolean
  amount: number
  payType: PayType
  workType?: WorkType
  completedVolume?: number
  volumeUnit?: VolumeUnit
  acceptedAt: string
}

/** Аванс или окончательный расчёт */
export interface AdvanceEntry {
  id: string
  date: string
  amount: number
  comment?: string
  kind: 'advance' | 'settlement'
  createdAt: string
}

export type FineReason = 'defect' | 'late' | 'absence' | 'safety'
export type BonusReason = 'fast' | 'quality'

export interface FineEntry {
  id: string
  amount: number
  reason: FineReason
  comment?: string
  objectId?: string
  taskId?: string
  issuedBy: string
  createdAt: string
}

export interface BonusEntry {
  id: string
  amount: number
  reason: BonusReason
  comment?: string
  objectId?: string
  taskId?: string
  issuedBy: string
  createdAt: string
}

/** Личный счёт мастера (копилка) */
export interface WorkerAccount {
  workerId: string
  workerName: string
  contractorId?: string
  accruals: AccrualEntry[]
  advances: AdvanceEntry[]
  fines: FineEntry[]
  bonuses: BonusEntry[]
  updatedAt: string
}

/** Настройки оплаты по конкретной задаче (до приёмки) */
export interface WorkerTaskPayroll {
  taskId: string
  workerId: string
  workerName: string
  contractorId?: string
  payType: PayType
  /** Входящая расценка (только для прораба/заказчика) */
  incomingUnitPrice?: number
  /** Исходящая расценка — видит мастер */
  outgoingUnitPrice?: number
  dailyRate?: number
  hourlyRate?: number
  hoursWorked?: number
  workDays: string[]
  volumeUnit?: VolumeUnit
  /** @deprecated используй outgoingUnitPrice */
  unitPrice?: number
  completedVolume?: number
  volumeConfirmed: boolean
  fixedAmount?: number
  redoReason?: RedoReason
  parentTaskId?: string
  isAccrued: boolean
  accruedAmount?: number
  updatedAt: string
}

export const PAY_TYPE_LABELS: Record<PayType, string> = {
  daily: 'По дням',
  hourly: 'По часам',
  volume: 'По объёму',
  fixed: 'Фиксированная',
  redo: 'Переделка',
}

export const REDO_REASON_LABELS: Record<RedoReason, string> = {
  own_fault: 'Свой брак — бесплатно',
  other_fault: 'Чужой брак — оплата по часам',
}

export const VOLUME_UNIT_LABELS: Record<VolumeUnit, string> = {
  m2: 'м²',
  pcs: 'шт',
  lm: 'м.п.',
  m3: 'м³',
  point: 'точка',
}

export const FINE_REASON_LABELS: Record<FineReason, string> = {
  defect: 'Брак',
  late: 'Опоздание',
  absence: 'Прогул',
  safety: 'Нарушение ТБ',
}

export const BONUS_REASON_LABELS: Record<BonusReason, string> = {
  fast: 'Быстрое выполнение',
  quality: 'Качество работы',
}

export function payrollKey(taskId: string, workerId: string): string {
  return `${taskId}__${workerId}`
}

export function outgoingPrice(record: WorkerTaskPayroll): number {
  return record.outgoingUnitPrice ?? record.unitPrice ?? 0
}

export function incomingPrice(record: WorkerTaskPayroll): number {
  return record.incomingUnitPrice ?? 0
}
