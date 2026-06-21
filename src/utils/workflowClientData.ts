import type { ProjectTask } from '@/types/projectWorkflow'
import type { PhotoReportItem, FinanceRecord } from '@/types/objectStructure'
import type { WorkerTaskPayroll, WorkerAccount } from '@/types/workerPayroll'
import { resolveTaskSubWorks } from '@utils/subWorkProgress'
import { calcClientAmount } from '@utils/workerPayrollCalc'
import { zoneWorkLabel } from '@utils/zoneHelpers'
import { isZoneTask } from '@utils/zoneHelpers'

function photoTimestamp(iso?: string): string {
  return iso || new Date().toISOString()
}

function locationLabel(task: ProjectTask): string {
  if (isZoneTask(task)) return task.apartmentNumber
  return `кв. ${task.apartmentNumber}`
}

/** Фото из задач и под-работ workflow */
export function buildPhotoReportsFromWorkflow(tasks: ProjectTask[]): PhotoReportItem[] {
  const items: PhotoReportItem[] = []

  for (const task of tasks) {
    if (task.workPhotos?.length) {
      const lastHistory = task.subWorks?.flatMap((s) => s.history).sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      )[0]
      items.push({
        id: `wf-${task.id}`,
        objectId: task.objectId,
        objectName: task.house,
        apartmentLabel: locationLabel(task),
        workTitle: isZoneTask(task) ? zoneWorkLabel(task) : task.title,
        timestamp: photoTimestamp(lastHistory?.at),
        photoUrls: task.workPhotos,
        author: task.contractorName || 'Мастер',
      })
    }

    for (const sub of resolveTaskSubWorks(task)) {
      if (!sub.workPhotos?.length) continue
      const lastHistory = sub.history[0]
      items.push({
        id: `wf-${task.id}-${sub.id}`,
        objectId: task.objectId,
        objectName: task.house,
        apartmentLabel: locationLabel(task),
        workTitle: `${isZoneTask(task) ? zoneWorkLabel(task) : task.title} → ${sub.label}`,
        timestamp: photoTimestamp(lastHistory?.at),
        photoUrls: sub.workPhotos,
        author: task.contractorName || 'Мастер',
      })
    }
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/** Операции из payroll: авансы и начисления */
export function buildFinanceRecordsFromPayroll(
  payrollRecords: Record<string, WorkerTaskPayroll>,
  accounts: Record<string, WorkerAccount>,
  tasks: Record<string, ProjectTask>,
): FinanceRecord[] {
  const items: FinanceRecord[] = []

  for (const acc of Object.values(accounts)) {
    for (const adv of acc.advances) {
      const objectId = acc.accruals.find((a) => a.objectId)?.objectId ?? ''
      items.push({
        id: `adv-${adv.id}`,
        objectId,
        objectName: acc.workerName,
        type: adv.kind === 'settlement' ? 'receipt' : 'advance',
        title: adv.comment || (adv.kind === 'settlement' ? `Расчёт: ${acc.workerName}` : `Аванс: ${acc.workerName}`),
        amount: adv.amount,
        date: adv.date,
        status: 'paid',
      })
    }
    for (const accrual of acc.accruals) {
      items.push({
        id: `accr-${accrual.id}`,
        objectId: accrual.objectId ?? '',
        objectName: accrual.taskTitle,
        type: 'receipt',
        title: `Работы: ${accrual.taskTitle}`,
        amount: accrual.amount,
        date: accrual.acceptedAt.slice(0, 10),
        status: 'paid',
      })
    }
  }

  for (const rec of Object.values(payrollRecords)) {
    if (rec.isAccrued) continue
    const amount = calcClientAmount(rec)
    if (amount <= 0) continue
    const task = tasks[rec.taskId]
    const title = task?.title ?? `Задача ${rec.workerName}`
    items.push({
      id: `pending-${rec.taskId}`,
      objectId: task?.objectId ?? '',
      objectName: task?.house ?? rec.workerName,
      type: 'upcoming',
      title: `К оплате: ${title}`,
      amount,
      date: rec.updatedAt.slice(0, 10),
      status: 'planned',
    })
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
