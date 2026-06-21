import type { AppRole } from '@store/userStore'

export type AuditField =
  | 'status'
  | 'blueprint'
  | 'description'
  | 'contractor'
  | 'blueprint_ack'
  | 'assignment'
  | 'created'

export interface TaskAuditEntry {
  id: string
  taskId: string
  userName: string
  userRole: AppRole
  field: AuditField
  /** Человекочитаемое название поля */
  fieldLabel: string
  oldValue: string
  newValue: string
  createdAt: string
  /** Важное событие (смена чертежа) */
  important?: boolean
}

export const AUDIT_FIELD_LABELS: Record<AuditField, string> = {
  status: 'Статус',
  blueprint: 'Чертёж',
  description: 'Описание переделки',
  contractor: 'Подрядчик',
  blueprint_ack: 'Подтверждение чертежа',
  assignment: 'Назначение мастера',
  created: 'Создание',
}

export function isAuditImportant(field: AuditField): boolean {
  return field === 'blueprint'
}
