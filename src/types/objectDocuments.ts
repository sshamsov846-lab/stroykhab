import type { AppRole } from '@store/userStore'

export type DocumentCategory =
  | 'project'
  | 'blueprints'
  | 'estimates'
  | 'contracts'
  | 'visualizations'
  | 'photos_other'

export type DocumentAccessScope =
  | 'all'
  | 'organization'
  | 'foreman'
  | 'roles'

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  project: 'Проект / Планировки',
  blueprints: 'Чертежи',
  estimates: 'Сметы',
  contracts: 'Договоры',
  visualizations: 'Визуализации / Рендеры',
  photos_other: 'Фото / Прочее',
}

export const DOCUMENT_ACCESS_LABELS: Record<DocumentAccessScope, string> = {
  all: 'Всем участникам объекта',
  organization: 'Только организации',
  foreman: 'Только прорабу',
  roles: 'Выбранным ролям',
}

export interface DocumentVersion {
  id: string
  versionNumber: number
  fileName: string
  fileUrl: string
  mimeType: string
  fileSize: number
  uploadedBy: string
  uploadedByRole: AppRole
  uploadedAt: string
  note?: string
}

export interface ObjectDocument {
  id: string
  objectId: string
  title: string
  category: DocumentCategory
  description?: string
  access: DocumentAccessScope
  allowedRoles?: AppRole[]
  taskId?: string
  taskTitle?: string
  versions: DocumentVersion[]
  createdAt: string
  updatedAt: string
  createdBy: string
  createdByRole: AppRole
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

export function isPreviewableMime(mime: string): boolean {
  return mime.startsWith('image/') || mime === 'application/pdf'
}
