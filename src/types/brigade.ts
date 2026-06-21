import type { SpecializationId } from '@/constants/specializations'

export type WorkerBrigadeMode = 'solo' | 'brigadier' | 'member'

export interface Brigade {
  id: string
  leaderUserKey: string
  leaderWorkerMemberId?: string
  leaderName: string
  name: string
  brigadeCode: string
  specializationIds: SpecializationId[]
  memberUserKeys: string[]
  createdAt: string
}

export interface BrigadeContribution {
  id: string
  brigadeId: string
  taskId: string
  workerUserKey: string
  workerName: string
  workerMemberId?: string
  apartmentLabel: string
  photoUrl?: string
  chatMessageId?: string
  reportedAt: string
}

export const BRIGADE_MODE_LABELS: Record<WorkerBrigadeMode, string> = {
  solo: 'Одиночка',
  brigadier: 'Бригадир',
  member: 'В бригаде',
}
