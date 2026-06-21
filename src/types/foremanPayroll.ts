import type { WorkType } from '@types'
import type {
  AdvanceEntry,
  BonusEntry,
  FineEntry,
  PayType,
  VolumeUnit,
} from '@/types/workerPayroll'

/** Начисление прорабу от организации за принятую работу */
export interface ForemanAccrualEntry {
  id: string
  taskId: string
  taskTitle: string
  objectId?: string
  objectName?: string
  workType: WorkType
  payType: PayType
  /** Объём принятой работы (для отчёта) */
  completedVolume?: number
  volumeUnit?: VolumeUnit
  /** Расценка орг → прораб */
  unitPrice?: number
  amount: number
  acceptedAt: string
}

/** Счёт прораба на уровне организации (входящие деньги) */
export interface ForemanAccount {
  foremanId: string
  foremanName: string
  accruals: ForemanAccrualEntry[]
  advances: AdvanceEntry[]
  fines: FineEntry[]
  bonuses: BonusEntry[]
  updatedAt: string
}
