import type { AppRole } from '@store/userStore'
import type { SpecializationId } from '@/constants/specializations'

/** Бригада — объём; почасовик — день/час */
export type WorkerEmploymentType = 'brigade' | 'hourly'

export const WORKER_TYPE_LABELS: Record<WorkerEmploymentType, string> = {
  brigade: 'Бригада',
  hourly: 'Почасовик',
}

export const WORKER_TYPE_HINTS: Record<WorkerEmploymentType, string> = {
  brigade: 'Берёт объём — подъезд, этаж, оплата по м²',
  hourly: 'Почасовая/подневная оплата на отдельные задачи',
}

export interface PersonProfile {
  userKey: string
  role: AppRole
  fullName: string
  phone: string
  facePhoto: string
  personalCode: string
  specializationIds: SpecializationId[]
  contractorId?: string
  organizationId?: string
  foremanUserKey?: string
  workerMemberId?: string
  workerEmploymentType?: WorkerEmploymentType
  workerBrigadeMode?: import('@/types/brigade').WorkerBrigadeMode
  brigadeId?: string
  brigadeCode?: string
  createdAt: string
}
