import type { WorkType } from '@types'
import type { ProjectTask } from '@/types/projectWorkflow'
import { createSubWorksForZoneCategory } from '@/types/buildingZones'
import {
  createSubWorksForType,
  hasSubWorks,
  calcSubWorkProgress,
  aggregateSubWorkStatus,
  type SubWorkState,
} from '@/types/subWorks'

export function resolveTaskSubWorks(task: ProjectTask): SubWorkState[] {
  if (task.subWorks?.length) return task.subWorks
  if (task.zoneType && task.categoryId) {
    return createSubWorksForZoneCategory(task.zoneType, task.categoryId)
  }
  if (hasSubWorks(task.workType)) return createSubWorksForType(task.workType)
  return []
}

export function taskHasSubWorksList(task: ProjectTask): boolean {
  return resolveTaskSubWorks(task).length > 0
}

export function taskHasSubWorks(task: ProjectTask): boolean {
  return hasSubWorks(task.workType)
}

export function calcTaskProgressWithSubWorks(taskList: ProjectTask[]): {
  total: number
  done: number
  percent: number
} {
  let total = 0
  let done = 0
  for (const task of taskList) {
    const subs = resolveTaskSubWorks(task)
    if (subs.length > 0) {
      const p = calcSubWorkProgress(subs)
      total += p.total
      done += p.done
    } else {
      total += 1
      if (task.status === 'done') done += 1
    }
  }
  if (total === 0) return { total: 0, done: 0, percent: 0 }
  return { total, done, percent: Math.round((done / total) * 100) }
}

export function displayTaskStatus(task: ProjectTask): import('@types').TaskStatus {
  const subs = resolveTaskSubWorks(task)
  if (subs.length > 0) return aggregateSubWorkStatus(subs)
  return task.status
}

export function subWorkProgressLabel(task: ProjectTask): string | null {
  const subs = resolveTaskSubWorks(task)
  if (!subs.length) return null
  const p = calcSubWorkProgress(subs)
  return `${p.done}/${p.total} принято`
}

export function formatAcceptanceReportLine(
  apartmentNumber: string,
  subWorkLabel: string,
  action: 'accepted' | 'redo',
  reason?: string,
): string {
  if (action === 'accepted') {
    return `Кв.${apartmentNumber} → ${subWorkLabel} → ПРИНЯТО`
  }
  return `Кв.${apartmentNumber} → ${subWorkLabel} → ПЕРЕДЕЛКА: ${reason || '—'}`
}

export type { WorkType }
