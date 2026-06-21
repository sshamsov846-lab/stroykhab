export type DowntimeReasonId =
  | 'no_material'
  | 'no_access'
  | 'no_utilities'
  | 'waiting_others'
  | 'other'

export const DOWNTIME_REASONS: Record<DowntimeReasonId, string> = {
  no_material: 'Нет материала',
  no_access: 'Нет доступа в помещение',
  no_utilities: 'Нет света/воды',
  waiting_others: 'Ждёт смежников (не закончили этап)',
  other: 'Другое',
}

export interface SiteCheckIn {
  id: string
  workerId: string
  workerName: string
  objectId: string
  objectName: string
  /** YYYY-MM-DD */
  date: string
  arrivedAt: string
  leftAt?: string
}

export interface TaskDowntime {
  id: string
  taskId: string
  objectId: string
  taskTitle: string
  workerId?: string
  workerName: string
  reason: DowntimeReasonId
  reasonText?: string
  since: string
  endedAt?: string
}

export interface TimesheetDayRow {
  date: string
  objectId: string
  objectName: string
  workerId: string
  workerName: string
  hours: number
  days: number
  sessions: { arrivedAt: string; leftAt?: string }[]
}
