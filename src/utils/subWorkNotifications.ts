import type { AppRole } from '@store/userStore'
import type { NotificationType } from '@store/notificationStore'
import { pushNotification } from '@store/notificationStore'

/** «Кв.7, Отопление» */
export function formatSubWorkAddress(apartmentNumber: string, subWorkLabel: string): string {
  return `Кв.${apartmentNumber}, ${subWorkLabel}`
}

export function pushSubWorkNotification(params: {
  type: NotificationType
  title: string
  message: string
  taskId: string
  subWorkId: string
  objectId: string
  targetRoles: AppRole[]
  targetContractorId?: string
  targetWorkerId?: string
}): void {
  pushNotification({
    type: params.type,
    title: params.title,
    message: params.message,
    taskId: params.taskId,
    subWorkId: params.subWorkId,
    objectId: params.objectId,
    targetRoles: params.targetRoles,
    targetContractorId: params.targetContractorId,
    targetWorkerId: params.targetWorkerId,
  })
}

/** Разбор chat taskId вида parentId__sub__subWorkId */
export function parseChatTaskId(chatTaskId: string): { taskId: string; subWorkId?: string } {
  const marker = '__sub__'
  const idx = chatTaskId.indexOf(marker)
  if (idx === -1) return { taskId: chatTaskId }
  return {
    taskId: chatTaskId.slice(0, idx),
    subWorkId: chatTaskId.slice(idx + marker.length),
  }
}
