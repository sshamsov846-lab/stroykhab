import type { WorkType } from '@types'
import type { VolumeUnit } from '@/types/workerPayroll'

export type RateSource = 'foreman' | 'organization'

export interface WorkRateEntry {
  workType: WorkType
  label: string
  unit: VolumeUnit | 'day' | 'hour'
  /** Входящая: заказчик/организация → прораб */
  incomingPrice: number
  /** Исходящая: прораб → мастер */
  outgoingPrice: number
  /** Расценка организация → заказчик (если отличается от incoming) */
  clientPrice?: number
  source: RateSource
  organizationId?: string
  updatedAt: string
}

export const RATE_UNIT_LABELS: Record<WorkRateEntry['unit'], string> = {
  m2: 'м²',
  pcs: 'шт',
  lm: 'м.п.',
  m3: 'м³',
  point: 'точка',
  day: 'день',
  hour: 'час',
}
