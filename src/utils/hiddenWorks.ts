import type { WorkType } from '@types'
import type { ProjectTask } from '@/types/projectWorkflow'
import { apartmentKey } from '@/types/projectWorkflow'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import type { SubWorkState } from '@/types/subWorks'
import { resolveTaskSubWorks } from '@utils/subWorkProgress'

export const HIDDEN_WORK_WARNING = 'Сначала примите скрытые работы'

export interface HiddenWorkPrerequisite {
  sourceWorkType: WorkType
  subWorkId: string
}

/** Скрытые под-работы, которые должны быть приняты с фото до старта вида работ */
export const HIDDEN_WORK_BLOCKING: Partial<Record<WorkType, HiddenWorkPrerequisite[]>> = {
  screed: [{ sourceWorkType: 'plumbing', subWorkId: 'sewer' }],
  plaster: [
    { sourceWorkType: 'electrical', subWorkId: 'grooving' },
    { sourceWorkType: 'electrical', subWorkId: 'cabling' },
  ],
  paint: [{ sourceWorkType: 'insulation', subWorkId: 'insulation' }],
}

/** Блокировка старта конкретной под-работы */
export const HIDDEN_SUBWORK_START_BLOCKS: {
  workType: WorkType
  subWorkId: string
  requires: HiddenWorkPrerequisite[]
}[] = [
  {
    workType: 'screed',
    subWorkId: 'pour',
    requires: [
      { sourceWorkType: 'plumbing', subWorkId: 'sewer' },
      { sourceWorkType: 'screed', subWorkId: 'waterproofing' },
    ],
  },
]

export function taskScopeKey(task: ProjectTask): string {
  return apartmentKey(task.section, task.house, task.entrance, task.floor, task.apartmentNumber)
}

export function isHiddenWorkAccepted(sub: SubWorkState): boolean {
  if (!sub.isHiddenWork) return sub.status === 'done'
  return sub.status === 'done' && (sub.beforeClosePhotos?.length ?? 0) > 0
}

export function findSubWorkInScope(
  tasks: Record<string, ProjectTask>,
  scopeTask: ProjectTask,
  sourceWorkType: WorkType,
  subWorkId: string,
): { task: ProjectTask; sub: SubWorkState } | null {
  const scope = taskScopeKey(scopeTask)
  for (const task of Object.values(tasks)) {
    if (task.objectId !== scopeTask.objectId) continue
    if (taskScopeKey(task) !== scope) continue
    if (task.workType !== sourceWorkType) continue
    const sub = resolveTaskSubWorks(task).find((s) => s.id === subWorkId)
    if (sub) return { task, sub }
  }
  return null
}

function prereqLabel(prereq: HiddenWorkPrerequisite, sub?: SubWorkState): string {
  const workLabel = WORK_TYPE_LABELS[prereq.sourceWorkType] || prereq.sourceWorkType
  const subLabel = sub?.label || prereq.subWorkId
  return `${workLabel}: ${subLabel}`
}

export function getHiddenWorkBlockingReason(
  tasks: Record<string, ProjectTask>,
  task: ProjectTask,
): string | null {
  const prereqs = HIDDEN_WORK_BLOCKING[task.workType]
  if (!prereqs?.length) return null

  for (const prereq of prereqs) {
    const found = findSubWorkInScope(tasks, task, prereq.sourceWorkType, prereq.subWorkId)
    if (!found) continue
    const { sub } = found
    if (!sub.isHiddenWork) continue
    if (!isHiddenWorkAccepted(sub)) {
      if (sub.status === 'done' && !(sub.beforeClosePhotos?.length ?? 0)) {
        return `${HIDDEN_WORK_WARNING}: нет фото «до закрытия» — ${prereqLabel(prereq, sub)}`
      }
      return `${HIDDEN_WORK_WARNING}: ${prereqLabel(prereq, sub)}`
    }
  }
  return null
}

export function getHiddenSubWorkBlockingReason(
  tasks: Record<string, ProjectTask>,
  task: ProjectTask,
  subWorkId: string,
): string | null {
  const rule = HIDDEN_SUBWORK_START_BLOCKS.find(
    (r) => r.workType === task.workType && r.subWorkId === subWorkId,
  )
  if (!rule) return null

  for (const prereq of rule.requires) {
    const found = findSubWorkInScope(tasks, task, prereq.sourceWorkType, prereq.subWorkId)
    if (!found) continue
    const { sub } = found
    if (!sub.isHiddenWork) continue
    if (!isHiddenWorkAccepted(sub)) {
      if (sub.status === 'done' && !(sub.beforeClosePhotos?.length ?? 0)) {
        return `${HIDDEN_WORK_WARNING}: нет фото «до закрытия» — ${prereqLabel(prereq, sub)}`
      }
      return `${HIDDEN_WORK_WARNING}: ${prereqLabel(prereq, sub)}`
    }
  }
  return null
}

export interface HiddenWorkArchiveEntry {
  taskId: string
  subWorkId: string
  taskTitle: string
  subWorkLabel: string
  workType: WorkType
  apartmentNumber: string
  acceptedAt?: string
  beforeClosePhotos: string[]
  hiddenCoveredBy?: WorkType
}

export function collectHiddenWorksArchive(
  objectId: string,
  tasks: Record<string, ProjectTask>,
): HiddenWorkArchiveEntry[] {
  const entries: HiddenWorkArchiveEntry[] = []

  for (const task of Object.values(tasks)) {
    if (task.objectId !== objectId) continue
    for (const sub of resolveTaskSubWorks(task)) {
      if (!sub.isHiddenWork) continue
      if (!isHiddenWorkAccepted(sub)) continue
      const acceptEntry = [...sub.history].reverse().find((h) => h.action === 'accept')
      entries.push({
        taskId: task.id,
        subWorkId: sub.id,
        taskTitle: task.title,
        subWorkLabel: sub.label,
        workType: task.workType,
        apartmentNumber: task.apartmentNumber,
        acceptedAt: acceptEntry?.at,
        beforeClosePhotos: sub.beforeClosePhotos ?? [],
        hiddenCoveredBy: sub.hiddenCoveredBy,
      })
    }
  }

  return entries.sort((a, b) => (b.acceptedAt || '').localeCompare(a.acceptedAt || ''))
}

export function countPendingHiddenWorks(
  objectId: string,
  tasks: Record<string, ProjectTask>,
): number {
  let count = 0
  for (const task of Object.values(tasks)) {
    if (task.objectId !== objectId) continue
    for (const sub of resolveTaskSubWorks(task)) {
      if (!sub.isHiddenWork) continue
      if (sub.status !== 'done' || !(sub.beforeClosePhotos?.length ?? 0)) count += 1
    }
  }
  return count
}
