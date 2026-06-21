import { useNotificationStore } from '@store/notificationStore'
import type { AppRole } from '@store/userStore'
import { ROLE_LABELS } from '@store/userStore'

export function notifyDocumentUploaded(params: {
  objectId: string
  documentTitle: string
  uploaderName: string
  uploaderRole: AppRole
  isNewVersion: boolean
  taskId?: string
}) {
  const roleLabel = ROLE_LABELS[params.uploaderRole] ?? params.uploaderRole
  useNotificationStore.getState().addNotification({
    type: params.isNewVersion ? 'document_updated' : 'document_uploaded',
    title: params.isNewVersion ? 'Обновлён документ' : 'Новый документ',
    message: params.isNewVersion
      ? `${roleLabel} обновил(а): ${params.documentTitle} (новая версия)`
      : `${roleLabel} добавил(а): ${params.documentTitle}`,
    objectId: params.objectId,
    taskId: params.taskId,
    targetRoles: ['client', 'foreman', 'subcontractor'],
  })
}
