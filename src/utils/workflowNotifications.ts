import type { TaskStatus } from '@types'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { pushNotification } from '@store/notificationStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useObjectStore } from '@store/objectStore'
import { formatSubWorkAddress, pushSubWorkNotification, parseChatTaskId } from '@utils/subWorkNotifications'
import { notifyWorkerWorkStarted } from '@utils/objectChainNotifications'
import { getForemanUserKeysForObject } from '@utils/objectChain'
import { workerNameById } from '@utils/workerPayrollCalc'

function workerIdsForTask(taskId: string): string[] {
  const { workerTaskAssignments, contractorWorkerAssignments } = useObjectStore.getState()
  const ids: string[] = []
  if (workerTaskAssignments[taskId]) ids.push(workerTaskAssignments[taskId])
  if (contractorWorkerAssignments[taskId]) ids.push(contractorWorkerAssignments[taskId])
  return ids
}

export function onTaskStatusChange(taskId: string, status: TaskStatus, prevStatus?: TaskStatus): void {
  const task = useProjectWorkflowStore.getState().tasks[taskId]
  if (!task) return
  // Под-работы уведомляются отдельно — пропускаем агрегированный статус родительской задачи
  if (task.subWorks?.length) return

  if (status === 'in_progress' && prevStatus === 'pending') {
    const workerId = useObjectStore.getState().contractorWorkerAssignments[taskId]
      || useObjectStore.getState().workerTaskAssignments[taskId]
    if (workerId) {
      const workerName = workerNameById(workerId)
      const label = formatSubWorkAddress(
        task.apartmentNumber,
        WORK_TYPE_LABELS[task.workType] || task.title,
      )
      const foremanKeys = getForemanUserKeysForObject(task.objectId)
      if (foremanKeys.length > 0) {
        notifyWorkerWorkStarted({
          objectId: task.objectId,
          taskId,
          workerName,
          locationLabel: label,
          foremanUserKeys: foremanKeys,
        })
      } else {
        pushNotification({
          type: 'task_work_started',
          title: 'Мастер начал работу',
          message: `${workerName} начал работу: ${label}`,
          taskId,
          objectId: task.objectId,
          targetRoles: ['foreman'],
        })
      }
    }
  }

  if (status === 'review' && prevStatus !== 'review') {
    pushNotification({
      type: 'task_review',
      title: 'Работа на проверке',
      message: `${task.title} — мастер отправил на приёмку.`,
      taskId,
      objectId: task.objectId,
      targetRoles: ['foreman'],
    })
    if (task.contractorId) {
      pushNotification({
        type: 'task_review',
        title: 'Работа на проверке',
        message: `${task.title} ожидает приёмки прорабом.`,
        taskId,
        objectId: task.objectId,
        targetRoles: ['subcontractor'],
        targetContractorId: task.contractorId,
      })
    }
  }

  if (status === 'done' && prevStatus !== 'done') {
    for (const workerId of workerIdsForTask(taskId)) {
      pushNotification({
        type: 'task_accepted',
        title: '✅ Работа принята',
        message: `${task.title} — прораб принял работу.`,
        taskId,
        objectId: task.objectId,
        targetRoles: ['worker'],
        targetWorkerId: workerId,
      })
    }
    if (task.contractorId) {
      pushNotification({
        type: 'task_accepted',
        title: '✅ Работа принята',
        message: `${task.title} принята прорабом.`,
        taskId,
        objectId: task.objectId,
        targetRoles: ['subcontractor'],
        targetContractorId: task.contractorId,
      })
    }
  }
}

export function onTaskRedo(taskId: string): void {
  const task = useProjectWorkflowStore.getState().tasks[taskId]
  if (!task || task.subWorks?.length) return
  for (const workerId of workerIdsForTask(taskId)) {
    pushNotification({
      type: 'task_rejected',
      title: '🔄 Нужна переделка',
      message: `${task.title} — прораб вернул на доработку.`,
      taskId,
      objectId: task.objectId,
      targetRoles: ['worker'],
      targetWorkerId: workerId,
    })
  }
  if (task.contractorId) {
    pushNotification({
      type: 'task_rejected',
      title: '🔄 Нужна переделка',
      message: `${task.title} отправлена на переделку.`,
      taskId,
      objectId: task.objectId,
      targetRoles: ['subcontractor'],
      targetContractorId: task.contractorId,
    })
  }
}

export function onBlueprintChanged(taskIds: string[], objectId: string, workTypeLabel: string): void {
  for (const taskId of taskIds) {
    const task = useProjectWorkflowStore.getState().tasks[taskId]
    if (!task) continue
    const addr = `Кв.${task.apartmentNumber}, ${workTypeLabel}`
    const workerId = useObjectStore.getState().contractorWorkerAssignments[taskId]
      || useObjectStore.getState().workerTaskAssignments[taskId]
    if (workerId) {
      pushNotification({
        type: 'blueprint_changed',
        title: 'ВАЖНО: изменён чертёж',
        message: `ВАЖНО: изменён чертёж по ${addr}`,
        taskId,
        objectId,
        targetRoles: ['worker'],
        targetWorkerId: workerId,
      })
    }
    if (task.contractorId) {
      pushNotification({
        type: 'blueprint_changed',
        title: 'ВАЖНО: изменён чертёж',
        message: `Изменён чертёж по ${addr}`,
        taskId,
        objectId,
        targetRoles: ['subcontractor'],
        targetContractorId: task.contractorId,
      })
    }
  }
  pushNotification({
    type: 'blueprint_changed',
    title: 'ВАЖНО: Обновлён чертёж',
    message: `${workTypeLabel} — проверьте задачи объекта.`,
    objectId,
    targetRoles: ['foreman'],
  })
}

export function onChatMessage(
  chatTaskId: string,
  authorRole: 'foreman' | 'worker' | 'client' | 'subcontractor',
  authorName: string,
  text: string,
): void {
  const { taskId, subWorkId } = parseChatTaskId(chatTaskId)
  const task = useProjectWorkflowStore.getState().tasks[taskId]
  if (!task) return

  const subWork = subWorkId
    ? useProjectWorkflowStore.getState().getTaskSubWorks(taskId).find((s) => s.id === subWorkId)
    : undefined
  const addr = subWork
    ? formatSubWorkAddress(task.apartmentNumber, subWork.label)
    : task.title
  const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text
  const message = `${addr}: ${preview}`

  const targets: Array<{ roles: import('@store/userStore').AppRole[]; contractorId?: string; workerId?: string }> = []

  if (authorRole !== 'foreman') targets.push({ roles: ['foreman'] })
  if (authorRole !== 'client') targets.push({ roles: ['client'] })
  if (authorRole !== 'worker') {
    for (const workerId of workerIdsForTask(taskId)) {
      targets.push({ roles: ['worker'], workerId })
    }
  }
  if (task.contractorId && authorRole !== 'subcontractor') {
    targets.push({ roles: ['subcontractor'], contractorId: task.contractorId })
  }

  for (const t of targets) {
    pushNotification({
      type: 'chat_message',
      title: `Сообщение: ${authorName}`,
      message,
      taskId,
      subWorkId,
      objectId: task.objectId,
      targetRoles: t.roles,
      targetContractorId: t.contractorId,
      targetWorkerId: t.workerId,
    })
  }
}

export function onContractorAssigned(
  objectId: string,
  contractorId: string,
  _contractorName: string,
  workType: import('@types').WorkType,
  count: number,
): void {
  pushNotification({
    type: 'contractor_assigned',
    title: 'Назначены работы',
    message: `Прораб назначил «${WORK_TYPE_LABELS[workType]}» — ${count} задач.`,
    objectId,
    targetRoles: ['subcontractor'],
    targetContractorId: contractorId,
  })
}

/** Мастер отправил под-работу на проверку */
export function onSubWorkReview(taskId: string, subWorkId: string, subWorkLabel: string): void {
  const task = useProjectWorkflowStore.getState().tasks[taskId]
  if (!task) return
  const addr = formatSubWorkAddress(task.apartmentNumber, subWorkLabel)
  pushSubWorkNotification({
    type: 'task_review',
    title: 'Готово к проверке',
    message: `${addr} — готово к проверке, фото загружено`,
    taskId,
    subWorkId,
    objectId: task.objectId,
    targetRoles: ['foreman'],
  })
}

/** Прораб или заказчик принял под-работу */
export function onSubWorkAccepted(
  taskId: string,
  subWorkId: string,
  subWorkLabel: string,
  author: { role: 'foreman' | 'client'; name: string },
): void {
  const task = useProjectWorkflowStore.getState().tasks[taskId]
  if (!task) return
  const addr = formatSubWorkAddress(task.apartmentNumber, subWorkLabel)

  if (author.role === 'foreman') {
    if (task.contractorId) {
      pushSubWorkNotification({
        type: 'task_accepted',
        title: 'Принято прорабом',
        message: `${addr} — принято прорабом`,
        taskId,
        subWorkId,
        objectId: task.objectId,
        targetRoles: ['subcontractor'],
        targetContractorId: task.contractorId,
      })
    }
    pushSubWorkNotification({
      type: 'task_accepted',
      title: '✅ Принято',
      message: `${addr} — принято ✅`,
      taskId,
      subWorkId,
      objectId: task.objectId,
      targetRoles: ['client'],
    })
    return
  }

  // Заказчик принял — уведомляем прораба и организацию
  pushSubWorkNotification({
    type: 'task_accepted',
    title: '✅ Принято заказчиком',
    message: `${addr} — принято заказчиком ✅`,
    taskId,
    subWorkId,
    objectId: task.objectId,
    targetRoles: ['foreman'],
  })
  if (task.contractorId) {
    pushSubWorkNotification({
      type: 'task_accepted',
      title: '✅ Принято заказчиком',
      message: `${addr} — принято заказчиком`,
      taskId,
      subWorkId,
      objectId: task.objectId,
      targetRoles: ['subcontractor'],
      targetContractorId: task.contractorId,
    })
  }
}

/** Прораб или заказчик вернул на переделку */
export function onSubWorkRedo(
  taskId: string,
  subWorkId: string,
  subWorkLabel: string,
  reason: string,
  author: { role: 'foreman' | 'client'; name: string },
): void {
  const task = useProjectWorkflowStore.getState().tasks[taskId]
  if (!task) return
  const addr = formatSubWorkAddress(task.apartmentNumber, subWorkLabel)

  if (author.role === 'foreman') {
    for (const workerId of workerIdsForTask(taskId)) {
      pushSubWorkNotification({
        type: 'task_rejected',
        title: '🔄 На переделку',
        message: `${addr} — на переделку. Причина: ${reason}`,
        taskId,
        subWorkId,
        objectId: task.objectId,
        targetRoles: ['worker'],
        targetWorkerId: workerId,
      })
    }
    if (task.contractorId) {
      pushSubWorkNotification({
        type: 'task_rejected',
        title: '🔄 На переделку',
        message: `${addr} — отправлено на переделку`,
        taskId,
        subWorkId,
        objectId: task.objectId,
        targetRoles: ['subcontractor'],
        targetContractorId: task.contractorId,
      })
    }
    return
  }

  // Заказчик вернул
  const clientMsg = `Заказчик вернул ${addr}. Причина: ${reason}`
  pushSubWorkNotification({
    type: 'task_rejected',
    title: '🔄 Возврат заказчика',
    message: clientMsg,
    taskId,
    subWorkId,
    objectId: task.objectId,
    targetRoles: ['foreman'],
  })
  if (task.contractorId) {
    pushSubWorkNotification({
      type: 'task_rejected',
      title: '🔄 Возврат заказчика',
      message: clientMsg,
      taskId,
      subWorkId,
      objectId: task.objectId,
      targetRoles: ['subcontractor'],
      targetContractorId: task.contractorId,
    })
  }
  for (const workerId of workerIdsForTask(taskId)) {
    pushSubWorkNotification({
      type: 'task_rejected',
      title: '🔄 Возврат заказчика',
      message: clientMsg,
      taskId,
      subWorkId,
      objectId: task.objectId,
      targetRoles: ['worker'],
      targetWorkerId: workerId,
    })
  }
}

/** Прораб назначил мастера на задачу (вид работ / под-работы) */
export function onWorkerAssignedToTask(
  taskId: string,
  workerId: string,
  subWorkLabel?: string,
): void {
  const task = useProjectWorkflowStore.getState().tasks[taskId]
  if (!task) return
  const label = subWorkLabel || WORK_TYPE_LABELS[task.workType] || task.workType
  const addr = formatSubWorkAddress(task.apartmentNumber, label)
  pushNotification({
    type: 'task_assigned',
    title: 'Вам назначена работа',
    message: `${addr}`,
    taskId,
    objectId: task.objectId,
    targetRoles: ['worker'],
    targetWorkerId: workerId,
  })
}
