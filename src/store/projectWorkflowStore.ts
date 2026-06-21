import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { TaskStatus, WorkType } from '@types'
import type {
  ImportRow,
  Contractor,
  ProjectTask,
  BlueprintFile,
  TaskChatMessage,
} from '@/types/projectWorkflow'
import {
  TASK_DEPENDENCIES,
  buildTaskId,
  apartmentKey,
} from '@/types/projectWorkflow'
import { createSubWorksForZoneCategory, zoneCategoryLabel, ZONE_WORK_CATALOG } from '@/types/buildingZones'
import {
  createSubWorksForType,
  hasSubWorks,
  aggregateSubWorkStatus,
  enrichSubWorkState,
  subWorkDefFromCatalog,
  type SubWorkState,
  type SubWorkHistoryEntry,
  type SubWorkDefinition,
} from '@/types/subWorks'
import { getHiddenWorkBlockingReason, getHiddenSubWorkBlockingReason } from '@utils/hiddenWorks'
import { useAcceptanceReportStore } from '@store/acceptanceReportStore'
import { useQualityAcceptanceStore } from '@store/qualityAcceptanceStore'
import type { AcceptancePayload } from '@/types/qualityChecklist'
import { validateChecklistForAcceptance } from '@/types/qualityChecklist'
import type { AcceptanceAct } from '@store/qualityAcceptanceStore'
import { onSubWorkAccepted, onSubWorkRedo, onSubWorkReview } from '@utils/workflowNotifications'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { STATUS_LABELS } from '@api/clientView'
import { WORK_TEMPLATES, basementTaskLabel } from '@/types/objectStructure'
import { onContractorAssigned, onBlueprintChanged, onTaskStatusChange, onTaskRedo, onChatMessage } from '@utils/workflowNotifications'
import { logTaskAudit } from '@store/auditLogStore'
import { logTaskCreated } from '@utils/taskAuditLog'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'
import { useObjectStore } from '@store/objectStore'
import { resolveAssignedWorkerId, workerNameById } from '@utils/workerPayrollCalc'
import { useBrigadeStore } from '@store/brigadeStore'
import type { RedoReason } from '@/types/workerPayroll'
import type { SpecializationId } from '@/constants/specializations'
import { specialtyTextFromIds, specializationsOverlap } from '@/constants/specializations'
import { generatePersonCode } from '@utils/personCodes'
import { registerOrganizationInRegistry } from '@utils/orgRegistry'

const DEFAULT_CONTRACTORS: Contractor[] = [
  {
    id: 'c1',
    name: 'ООО «БетонСтрой»',
    specialty: 'Стяжка и бетон',
    phone: '+7 (495) 100-11-11',
    inviteCode: 'СТЯЖКА-4521',
    specializationIds: ['screed'],
  },
  {
    id: 'c2',
    name: 'ООО «ЭлектроМонтаж»',
    specialty: 'Электрика',
    phone: '+7 (495) 300-55-66',
    inviteCode: 'ЭЛЕКТР-7823',
    specializationIds: ['electrical'],
  },
  {
    id: 'c3',
    name: 'ООО «АкваТех»',
    specialty: 'Сантехника',
    phone: '+7 (495) 400-77-88',
    inviteCode: 'САНТЕХ-4521',
    specializationIds: ['plumbing'],
  },
  {
    id: 'c4',
    name: 'ИП Козлов',
    specialty: 'Штукатурка и отделка',
    phone: '+7 (916) 222-33-44',
    inviteCode: 'ШТУКАТ-3310',
    specializationIds: ['plaster', 'paint'],
  },
]

interface ProjectWorkflowState {
  contractors: Contractor[]
  tasks: Record<string, ProjectTask>
  blueprints: BlueprintFile[]
  chatMessages: TaskChatMessage[]
  importedObjects: string[]

  importHierarchy: (objectId: string, rows: ImportRow[]) => number
  createSideJobTask: (
    objectId: string,
    params: { title: string; description?: string; objectName: string; workIndex: number },
  ) => string
  bulkAssignContractor: (objectId: string, workType: WorkType, contractorId: string) => number
  uploadBlueprint: (params: {
    objectId: string
    file: File
    workType?: WorkType
    apartmentKey?: string
    taskId?: string
  }) => BlueprintFile
  acknowledgeBlueprint: (taskId: string) => void
  getBlueprintForTask: (taskId: string) => BlueprintFile | undefined
  needsBlueprintAck: (taskId: string) => boolean
  getBlockingReason: (taskId: string) => string | null
  getSubWorkBlockingReason: (taskId: string, subWorkId: string) => string | null
  canStartTask: (taskId: string) => boolean
  canStartSubWork: (taskId: string, subWorkId: string) => boolean
  canCompleteTask: (taskId: string) => boolean
  updateTaskStatus: (taskId: string, status: TaskStatus) => void
  acceptTaskWithChecklist: (
    taskId: string,
    author: { role: 'foreman' | 'client'; name: string },
    payload: AcceptancePayload,
    meta?: { objectName?: string },
  ) => { ok: boolean; error?: string; act?: AcceptanceAct }
  updateTaskDetails: (
    taskId: string,
    patch: { description?: string; dueDate?: string },
  ) => void
  addWorkPhoto: (taskId: string, photoUrl: string) => void
  removeWorkPhoto: (taskId: string, photoUrl: string) => void
  submitForReview: (taskId: string) => { ok: boolean; error?: string }
  submitRedo: (
    taskId: string,
    photoUrl: string,
    comment: string,
    options: { reason: RedoReason; fixerWorkerId?: string },
  ) => void
  addChatMessage: (taskId: string, authorRole: 'foreman' | 'worker' | 'client' | 'subcontractor', authorName: string, text: string) => void
  addChatReport: (params: {
    taskId: string
    authorRole: 'foreman' | 'worker' | 'client' | 'subcontractor'
    authorName: string
    text: string
    authorUserKey?: string
    workerMemberId?: string
    photoUrl?: string
    brigadeId?: string
    apartmentLabel?: string
  }) => void
  getTasksByObject: (objectId: string) => ProjectTask[]
  getTasksByApartment: (objectId: string, aptKey: string) => ProjectTask[]
  syncContractorsFromOrgs: (orgs: { name: string; specialty: string; phone?: string }[]) => void
  registerContractor: (params: {
    name: string
    phone?: string
    specializationIds: SpecializationId[]
  }) => Contractor
  findContractorByInviteCode: (code: string) => Contractor | undefined
  getContractorsForSpecializations: (specIds: SpecializationId[]) => Contractor[]
  patchApartmentTasks: (params: {
    objectId: string
    section: string
    house: string
    entrance: string
    floor: string
    oldApartmentNumber: string
    newApartmentNumber: string
    oldWorkTemplate: import('@/types/objectStructure').WorkTemplateId
    newWorkTemplate: import('@/types/objectStructure').WorkTemplateId
  }) => void

  ensureTaskSubWorks: (taskId: string) => void
  getTaskSubWorks: (taskId: string) => SubWorkState[]
  updateSubWorkStatus: (taskId: string, subWorkId: string, status: TaskStatus) => void
  addSubWorkPhoto: (taskId: string, subWorkId: string, photoUrl: string) => void
  removeSubWorkPhoto: (taskId: string, subWorkId: string, photoUrl: string) => void
  addSubWorkBeforeClosePhoto: (taskId: string, subWorkId: string, photoUrl: string) => void
  removeSubWorkBeforeClosePhoto: (taskId: string, subWorkId: string, photoUrl: string) => void
  updateSubWorkDescription: (taskId: string, subWorkId: string, description: string) => void
  submitSubWorkForReview: (taskId: string, subWorkId: string) => { ok: boolean; error?: string }
  acceptSubWork: (
    taskId: string,
    subWorkId: string,
    author: { role: 'foreman' | 'client'; name: string },
    payload?: AcceptancePayload,
    meta?: { objectName?: string },
  ) => { ok: boolean; error?: string; act?: AcceptanceAct }
  redoSubWork: (
    taskId: string,
    subWorkId: string,
    reason: string,
    author: { role: 'foreman' | 'client'; name: string },
  ) => void
}

function titleFor(row: ImportRow): string {
  if (row.title) return row.title
  if (row.zoneType && row.categoryId) {
    const cat = zoneCategoryLabel(row.zoneType, row.categoryId)
    return `${cat} — ${row.apartmentNumber}`
  }
  if (row.floor === '-1' || row.apartmentNumber.startsWith('подвал')) {
    return `${basementTaskLabel(row.taskType)} (подъезд ${row.entrance})`
  }
  if (row.apartmentNumber.startsWith('коридор') || row.apartmentNumber.startsWith('лестница') || row.apartmentNumber.startsWith('лифт') || row.apartmentNumber.startsWith('фасад') || row.apartmentNumber.startsWith('кровля') || row.apartmentNumber.startsWith('инж') || row.house === 'Территория ЖК') {
    return `${WORK_TYPE_LABELS[row.taskType] || row.taskType} — ${row.apartmentNumber}`
  }
  return `${WORK_TYPE_LABELS[row.taskType] || row.taskType} — кв. ${row.apartmentNumber}`
}

function initSubWorksForRow(row: ImportRow): SubWorkState[] | undefined {
  if (row.zoneType && row.categoryId) {
    return createSubWorksForZoneCategory(row.zoneType, row.categoryId)
  }
  if (hasSubWorks(row.taskType)) return createSubWorksForType(row.taskType)
  return undefined
}

function subWorkDefinitionFor(task: ProjectTask, subWorkId: string): SubWorkDefinition | undefined {
  if (task.zoneType && task.categoryId) {
    const cat = ZONE_WORK_CATALOG[task.zoneType]?.find((c) => c.id === task.categoryId)
    return cat?.subWorks?.find((d) => d.id === subWorkId)
  }
  return subWorkDefFromCatalog(task.workType, subWorkId)
}

function enrichSubWorksForTask(task: ProjectTask, subs: SubWorkState[]): SubWorkState[] {
  return subs.map((s) => enrichSubWorkState(s, subWorkDefinitionFor(task, s.id)))
}

function initSubWorksForTask(task: ProjectTask): SubWorkState[] | undefined {
  if (task.zoneType && task.categoryId) {
    const fresh = createSubWorksForZoneCategory(task.zoneType, task.categoryId)
    if (task.subWorks?.length) {
      return enrichSubWorksForTask(task, task.subWorks)
    }
    return fresh
  }
  if (task.subWorks?.length) return enrichSubWorksForTask(task, task.subWorks)
  if (hasSubWorks(task.workType)) return createSubWorksForType(task.workType)
  return undefined
}

function appendSubWorkHistory(
  sub: SubWorkState,
  entry: Omit<SubWorkHistoryEntry, 'id' | 'at'>,
): SubWorkState {
  const item: SubWorkHistoryEntry = {
    ...entry,
    id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
  }
  return { ...sub, history: [item, ...sub.history] }
}

function patchSubWork(
  get: () => ProjectWorkflowState,
  set: (partial: Partial<ProjectWorkflowState> | ((s: ProjectWorkflowState) => Partial<ProjectWorkflowState>)) => void,
  taskId: string,
  subWorkId: string,
  patcher: (sub: SubWorkState) => SubWorkState,
) {
  const tasks = { ...get().tasks }
  const task = tasks[taskId]
  if (!task) return null
  const subWorks = task.subWorks?.length
    ? [...task.subWorks]
    : (initSubWorksForTask(task) ?? [])
  const idx = subWorks.findIndex((s) => s.id === subWorkId)
  if (idx < 0) return null
  subWorks[idx] = patcher(subWorks[idx])
  const prevStatus = task.status
  const newStatus = aggregateSubWorkStatus(subWorks)
  tasks[taskId] = { ...task, subWorks, status: newStatus }
  set({ tasks })
  if (newStatus === 'done' && prevStatus !== 'done') {
    useWorkerPayrollStore.getState().accrueOnTaskAccepted(taskId)
  }
  return subWorks[idx]
}

export const useProjectWorkflowStore = create<ProjectWorkflowState>()(
  persist(
    (set, get) => ({
      contractors: DEFAULT_CONTRACTORS,
      tasks: {},
      blueprints: [],
      chatMessages: [],
      importedObjects: [],

      importHierarchy: (objectId, rows) => {
        const tasks: Record<string, ProjectTask> = { ...get().tasks }
        let count = 0
        for (const row of rows) {
          const id = buildTaskId(
            objectId,
            row.section,
            row.house,
            row.entrance,
            row.floor,
            row.apartmentNumber,
            row.taskType,
            row.categoryId,
          )
          if (tasks[id]) continue
          tasks[id] = {
            id,
            objectId,
            section: row.section,
            house: row.house,
            entrance: row.entrance,
            floor: row.floor,
            apartmentNumber: row.apartmentNumber,
            workType: row.taskType,
            title: titleFor(row),
            description: row.description,
            status: 'pending',
            blueprintAcknowledged: true,
            subWorks: initSubWorksForRow(row),
            zoneType: row.zoneType,
            categoryId: row.categoryId,
            isSideJob: row.isSideJob,
          }
          logTaskCreated(id, titleFor(row))
          count++
        }
        const importedObjects = get().importedObjects.includes(objectId)
          ? get().importedObjects
          : [...get().importedObjects, objectId]
        set({ tasks, importedObjects })
        return count
      },

      createSideJobTask: (objectId, params) => {
        const row: ImportRow = {
          section: 'Подработка',
          house: params.objectName,
          entrance: '1',
          floor: '1',
          apartmentNumber: `работа-${params.workIndex}`,
          taskType: 'walls',
          title: params.title,
          description: params.description,
          isSideJob: true,
        }
        const id = buildTaskId(
          objectId,
          row.section,
          row.house,
          row.entrance,
          row.floor,
          row.apartmentNumber,
          row.taskType,
        )
        const tasks = { ...get().tasks }
        if (!tasks[id]) {
          tasks[id] = {
            id,
            objectId,
            section: row.section,
            house: row.house,
            entrance: row.entrance,
            floor: row.floor,
            apartmentNumber: row.apartmentNumber,
            workType: row.taskType,
            title: params.title,
            description: params.description,
            status: 'pending',
            blueprintAcknowledged: true,
            isSideJob: true,
          }
          logTaskCreated(id, params.title)
        }
        const importedObjects = get().importedObjects.includes(objectId)
          ? get().importedObjects
          : [...get().importedObjects, objectId]
        set({ tasks, importedObjects })
        return id
      },

      bulkAssignContractor: (objectId, workType, contractorId) => {
        const contractor = get().contractors.find((c) => c.id === contractorId)
        if (!contractor) return 0
        const tasks = { ...get().tasks }
        let count = 0
        for (const [id, task] of Object.entries(tasks)) {
          if (task.objectId === objectId && task.workType === workType) {
            const prevName = task.contractorName || '—'
            tasks[id] = { ...task, contractorId, contractorName: contractor.name }
            logTaskAudit({
              taskId: id,
              field: 'contractor',
              oldValue: prevName,
              newValue: contractor.name,
            })
            count++
          }
        }
        set({ tasks })
        onContractorAssigned(objectId, contractorId, contractor.name, workType, count)
        return count
      },

      uploadBlueprint: ({ objectId, file, workType, apartmentKey: aptKey, taskId }) => {
        const fileUrl = URL.createObjectURL(file)
        const existing = get().blueprints.filter(
          (b) =>
            b.objectId === objectId &&
            (taskId ? b.taskId === taskId : b.workType === workType && b.apartmentKey === aptKey),
        )
        const prev = existing.sort((a, b) => b.version - a.version)[0]
        const version = prev ? prev.version + 1 : 1
        const bp: BlueprintFile = {
          id: `bp-${Date.now()}`,
          objectId,
          workType,
          apartmentKey: aptKey,
          taskId,
          fileName: file.name,
          fileUrl,
          mimeType: file.type,
          version,
          uploadedAt: new Date().toISOString(),
          pendingAcknowledgment: version > 1,
        }
        const blueprints = [...get().blueprints, bp]
        const tasks = { ...get().tasks }
        const affected = taskId
          ? [taskId]
          : Object.values(tasks)
              .filter((t) => {
                if (t.objectId !== objectId) return false
                if (workType && t.workType !== workType) return false
                if (aptKey) {
                  const key = apartmentKey(t.section, t.house, t.entrance, t.floor, t.apartmentNumber)
                  return key === aptKey
                }
                return true
              })
              .map((t) => t.id)

        if (version > 1) {
          for (const tid of affected) {
            if (tasks[tid]) tasks[tid] = { ...tasks[tid], blueprintAcknowledged: false }
          }
          const label = workType ? WORK_TYPE_LABELS[workType] : 'Чертёж'
          onBlueprintChanged(affected, objectId, label)
        }
        for (const tid of affected) {
          logTaskAudit({
            taskId: tid,
            field: 'blueprint',
            oldValue: prev ? `${prev.fileName} (v${prev.version})` : '—',
            newValue: `${file.name} (v${version})`,
          })
        }
        set({ blueprints, tasks })
        return bp
      },

      acknowledgeBlueprint: (taskId) => {
        const tasks = { ...get().tasks }
        if (tasks[taskId]) {
          tasks[taskId] = { ...tasks[taskId], blueprintAcknowledged: true }
          set({ tasks })
          logTaskAudit({
            taskId,
            field: 'blueprint_ack',
            oldValue: 'Не подтверждён',
            newValue: 'Подтверждён',
          })
        }
      },

      getBlueprintForTask: (taskId) => {
        const task = get().tasks[taskId]
        if (!task) return undefined
        const aptKey = apartmentKey(task.section, task.house, task.entrance, task.floor, task.apartmentNumber)
        const matches = get().blueprints.filter(
          (b) =>
            b.objectId === task.objectId &&
            (b.taskId === taskId ||
              (b.workType === task.workType && (!b.apartmentKey || b.apartmentKey === aptKey))),
        )
        return matches.sort((a, b) => b.version - a.version)[0]
      },

      needsBlueprintAck: (taskId) => {
        const task = get().tasks[taskId]
        if (!task) return false
        const bp = get().getBlueprintForTask(taskId)
        return !!bp && bp.version > 1 && !task.blueprintAcknowledged
      },

      getBlockingReason: (taskId) => {
        const task = get().tasks[taskId]
        if (!task) return null
        const deps = TASK_DEPENDENCIES[task.workType]
        if (deps?.length) {
          const aptKey = apartmentKey(task.section, task.house, task.entrance, task.floor, task.apartmentNumber)
          for (const depType of deps) {
            const depTask = Object.values(get().tasks).find(
              (t) =>
                t.objectId === task.objectId &&
                apartmentKey(t.section, t.house, t.entrance, t.floor, t.apartmentNumber) === aptKey &&
                t.workType === depType,
            )
            if (depTask && depTask.status !== 'done') {
              return `Ожидает: ${WORK_TYPE_LABELS[depType]}`
            }
          }
        }
        return getHiddenWorkBlockingReason(get().tasks, task)
      },

      getSubWorkBlockingReason: (taskId, subWorkId) => {
        const task = get().tasks[taskId]
        if (!task) return null
        const taskBlock = get().getBlockingReason(taskId)
        if (taskBlock) return taskBlock
        return getHiddenSubWorkBlockingReason(get().tasks, task, subWorkId)
      },

      canStartTask: (taskId) => !get().getBlockingReason(taskId),

      canStartSubWork: (taskId, subWorkId) => !get().getSubWorkBlockingReason(taskId, subWorkId),

      canCompleteTask: (taskId) => !get().needsBlueprintAck(taskId),

      updateTaskStatus: (taskId, status) => {
        const tasks = { ...get().tasks }
        const prev = tasks[taskId]?.status
        if (tasks[taskId] && prev !== status) {
          tasks[taskId] = { ...tasks[taskId], status }
          set({ tasks })
          logTaskAudit({
            taskId,
            field: 'status',
            oldValue: STATUS_LABELS[prev!] || prev!,
            newValue: STATUS_LABELS[status] || status,
          })
          onTaskStatusChange(taskId, status, prev)
          if (status === 'done') {
            useWorkerPayrollStore.getState().accrueOnTaskAccepted(taskId)
          }
        }
      },

      acceptTaskWithChecklist: (taskId, author, payload, meta) => {
        const task = get().tasks[taskId]
        if (!task) return { ok: false, error: 'Задача не найдена' }
        if (task.status !== 'review') return { ok: false, error: 'Задача не на приёмке' }
        const checklistErr = validateChecklistForAcceptance(payload.checklist)
        if (checklistErr) return { ok: false, error: checklistErr }

        const photos = task.workPhotos ?? []
        const act = useQualityAcceptanceStore.getState().createAct({
          objectId: task.objectId,
          objectName: meta?.objectName,
          taskId,
          workType: task.workType,
          workLabel: task.title,
          apartmentNumber: task.apartmentNumber,
          acceptedBy: author.name,
          acceptedByRole: author.role,
          payload,
          photos,
        })

        get().updateTaskStatus(taskId, 'done')
        useAcceptanceReportStore.getState().addEntry({
          objectId: task.objectId,
          taskId,
          subWorkId: 'main',
          subWorkLabel: task.title,
          workType: task.workType,
          apartmentNumber: task.apartmentNumber,
          action: 'accepted',
          authorRole: author.role,
          authorName: author.name,
        })
        return { ok: true, act }
      },

      updateTaskDetails: (taskId, patch) => {
        const tasks = { ...get().tasks }
        const task = tasks[taskId]
        if (!task) return
        if (patch.description !== undefined && patch.description !== task.description) {
          logTaskAudit({
            taskId,
            field: 'description',
            fieldLabel: 'Описание',
            oldValue: task.description || '—',
            newValue: patch.description || '—',
          })
        }
        if (patch.dueDate !== undefined && patch.dueDate !== task.dueDate) {
          logTaskAudit({
            taskId,
            field: 'description',
            fieldLabel: 'Срок',
            oldValue: task.dueDate || '—',
            newValue: patch.dueDate || '—',
          })
        }
        tasks[taskId] = { ...task, ...patch }
        set({ tasks })
      },

      addWorkPhoto: (taskId, photoUrl) => {
        const tasks = { ...get().tasks }
        const task = tasks[taskId]
        if (!task) return
        const workPhotos = [...(task.workPhotos ?? []), photoUrl]
        tasks[taskId] = { ...task, workPhotos }
        set({ tasks })
        logTaskAudit({
          taskId,
          field: 'description',
          fieldLabel: 'Фото работы',
          oldValue: String((task.workPhotos ?? []).length),
          newValue: String(workPhotos.length),
        })
      },

      removeWorkPhoto: (taskId, photoUrl) => {
        const tasks = { ...get().tasks }
        const task = tasks[taskId]
        if (!task) return
        const workPhotos = (task.workPhotos ?? []).filter((u) => u !== photoUrl)
        tasks[taskId] = { ...task, workPhotos }
        set({ tasks })
      },

      submitForReview: (taskId) => {
        const task = get().tasks[taskId]
        if (!task) return { ok: false, error: 'Задача не найдена' }
        if (!get().canCompleteTask(taskId)) {
          return { ok: false, error: 'Подтвердите новый чертёж перед отправкой' }
        }
        if (!(task.workPhotos?.length ?? 0)) {
          return { ok: false, error: 'Прикрепите фото выполненной работы' }
        }
        get().updateTaskStatus(taskId, 'review')
        return { ok: true }
      },

      submitRedo: (taskId, photoUrl, comment, options) => {
        const tasks = { ...get().tasks }
        const task = tasks[taskId]
        if (!task) return

        const prevStatus = task.status
        const prevComment = task.defectComment || '—'

        tasks[taskId] = {
          ...task,
          status: 'rejected',
          defectPhotoUrl: photoUrl,
          defectComment: comment,
          redoReason: options.reason,
        }

        const assignedId = resolveAssignedWorkerId(taskId)

        if (options.reason === 'own_fault' && assignedId) {
          useWorkerPayrollStore.getState().setupOwnFaultRedo(taskId, assignedId)
        }

        if (options.reason === 'other_fault' && options.fixerWorkerId) {
          const newId = `${taskId}-fix-${Date.now()}`
          const fixerName = workerNameById(options.fixerWorkerId)
          tasks[newId] = {
            ...task,
            id: newId,
            parentTaskId: taskId,
            redoReason: 'other_fault',
            title: `Переделка: ${task.title}`,
            status: 'pending',
            defectPhotoUrl: photoUrl,
            defectComment: comment,
            blueprintAcknowledged: task.blueprintAcknowledged,
          }
          const objStore = useObjectStore.getState()
          if (task.contractorId) {
            objStore.assignContractorWorkerToTask(newId, options.fixerWorkerId)
          } else {
            objStore.assignWorkerToTask(newId, options.fixerWorkerId)
          }
          useWorkerPayrollStore.getState().setupOtherFaultRedo({
            newTaskId: newId,
            parentTaskId: taskId,
            workerId: options.fixerWorkerId,
            workerName: fixerName,
            contractorId: task.contractorId,
            workType: task.workType,
          })
          logTaskCreated(newId, tasks[newId].title)
        }

        set({ tasks })
        logTaskAudit({
          taskId,
          field: 'status',
          oldValue: STATUS_LABELS[prevStatus] || prevStatus,
          newValue: STATUS_LABELS.rejected || 'rejected',
        })
        logTaskAudit({
          taskId,
          field: 'description',
          oldValue: prevComment,
          newValue: `${comment} (${options.reason === 'own_fault' ? 'свой брак' : 'чужой брак'})`,
        })
        onTaskRedo(taskId)
      },

      addChatMessage: (taskId, authorRole, authorName, text) => {
        const msg: TaskChatMessage = {
          id: `msg-${Date.now()}`,
          taskId,
          authorRole,
          authorName,
          text,
          createdAt: new Date().toISOString(),
        }
        set({ chatMessages: [...get().chatMessages, msg] })
        onChatMessage(taskId, authorRole, authorName, text)
      },

      addChatReport: (params) => {
        const firstName = params.authorName.trim().split(/\s+/)[0] || params.authorName
        const body = params.text.trim() || params.apartmentLabel || 'готово'
        const caption = `${firstName}: ${body}${params.photoUrl ? ' 📷' : ''}`
        const msg: TaskChatMessage = {
          id: `msg-${Date.now()}`,
          taskId: params.taskId,
          authorRole: params.authorRole,
          authorName: params.authorName,
          authorUserKey: params.authorUserKey,
          workerMemberId: params.workerMemberId,
          text: caption,
          photoUrl: params.photoUrl,
          createdAt: new Date().toISOString(),
        }
        set({ chatMessages: [...get().chatMessages, msg] })
        onChatMessage(params.taskId, params.authorRole, params.authorName, caption)

        if (params.brigadeId && params.authorUserKey) {
          useBrigadeStore.getState().recordContribution({
            brigadeId: params.brigadeId,
            taskId: params.taskId,
            workerUserKey: params.authorUserKey,
            workerName: params.authorName,
            workerMemberId: params.workerMemberId,
            apartmentLabel: params.apartmentLabel ?? body,
            photoUrl: params.photoUrl,
            chatMessageId: msg.id,
          })
        }
      },

      getTasksByObject: (objectId) =>
        Object.values(get().tasks).filter((t) => t.objectId === objectId),

      getTasksByApartment: (objectId, aptKey) =>
        Object.values(get().tasks).filter(
          (t) =>
            t.objectId === objectId &&
            apartmentKey(t.section, t.house, t.entrance, t.floor, t.apartmentNumber) === aptKey,
        ),

      syncContractorsFromOrgs: (orgs) => {
        const existing = get().contractors
        const names = new Set(existing.map((c) => c.name))
        const added: Contractor[] = []
        for (const org of orgs) {
          if (!org.name || names.has(org.name)) continue
          names.add(org.name)
          added.push({
            id: `c-${Date.now()}-${added.length}`,
            name: org.name,
            specialty: org.specialty,
            phone: org.phone,
          })
        }
        if (added.length) set({ contractors: [...existing, ...added] })
      },

      registerContractor: (params) => {
        const existing = get().contractors
        const codes = new Set(
          existing.map((c) => (c.inviteCode ?? '').toUpperCase()).filter(Boolean),
        )
        const inviteCode = generatePersonCode('ОРГ', codes)
        const contractor: Contractor = {
          id: `c-reg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: params.name.trim(),
          specialty: specialtyTextFromIds(params.specializationIds),
          phone: params.phone,
          inviteCode,
          specializationIds: params.specializationIds,
          isRegisteredOrg: true,
        }
        set({ contractors: [contractor, ...existing] })
        registerOrganizationInRegistry({
          id: contractor.id,
          name: contractor.name,
          specialty: contractor.specialty,
          phone: contractor.phone,
          inviteCode: contractor.inviteCode,
          specializationIds: contractor.specializationIds,
        })
        return contractor
      },

      findContractorByInviteCode: (code) => {
        const normalized = code.trim().toUpperCase()
        if (!normalized) return undefined
        return get().contractors.find((c) => (c.inviteCode ?? '').toUpperCase() === normalized)
      },

      getContractorsForSpecializations: (specIds) => {
        return get().contractors.filter((c) => {
          const orgSpecs = c.specializationIds ?? []
          if (!orgSpecs.length) return true
          return specializationsOverlap(specIds, orgSpecs)
        })
      },

      ensureTaskSubWorks: (taskId) => {
        const tasks = { ...get().tasks }
        const task = tasks[taskId]
        if (!task) return
        const subWorks = initSubWorksForTask(task)
        if (!subWorks?.length) return
        tasks[taskId] = {
          ...task,
          subWorks,
          status: aggregateSubWorkStatus(subWorks),
        }
        set({ tasks })
      },

      getTaskSubWorks: (taskId) => {
        const task = get().tasks[taskId]
        if (!task) return []
        const subs = initSubWorksForTask(task)
        return subs ?? []
      },

      updateSubWorkStatus: (taskId, subWorkId, status) => {
        const sub = patchSubWork(get, set, taskId, subWorkId, (s) => {
          const updated = appendSubWorkHistory(s, {
            action: 'status',
            authorRole: 'worker',
            authorName: 'Мастер',
            oldStatus: s.status,
            newStatus: status,
          })
          return { ...updated, status }
        })
        if (sub && status === 'review') {
          onSubWorkReview(taskId, subWorkId, sub.label)
        }
      },

      addSubWorkPhoto: (taskId, subWorkId, photoUrl) => {
        patchSubWork(get, set, taskId, subWorkId, (s) => {
          const workPhotos = [...s.workPhotos, photoUrl]
          return appendSubWorkHistory(
            { ...s, workPhotos },
            {
              action: 'photo',
              authorRole: 'worker',
              authorName: 'Мастер',
              text: `Добавлено фото (${workPhotos.length})`,
            },
          )
        })
      },

      removeSubWorkPhoto: (taskId, subWorkId, photoUrl) => {
        patchSubWork(get, set, taskId, subWorkId, (s) => ({
          ...s,
          workPhotos: s.workPhotos.filter((u) => u !== photoUrl),
        }))
      },

      addSubWorkBeforeClosePhoto: (taskId, subWorkId, photoUrl) => {
        patchSubWork(get, set, taskId, subWorkId, (s) => {
          const beforeClosePhotos = [...(s.beforeClosePhotos ?? []), photoUrl]
          return appendSubWorkHistory(
            { ...s, beforeClosePhotos },
            {
              action: 'before_close_photo',
              authorRole: 'worker',
              authorName: 'Мастер',
              text: 'Фото до закрытия',
            },
          )
        })
      },

      removeSubWorkBeforeClosePhoto: (taskId, subWorkId, photoUrl) => {
        patchSubWork(get, set, taskId, subWorkId, (s) => {
          if (s.status === 'done') return s
          return {
            ...s,
            beforeClosePhotos: (s.beforeClosePhotos ?? []).filter((u) => u !== photoUrl),
          }
        })
      },

      updateSubWorkDescription: (taskId, subWorkId, description) => {
        patchSubWork(get, set, taskId, subWorkId, (s) => ({ ...s, description }))
      },

      submitSubWorkForReview: (taskId, subWorkId) => {
        const task = get().tasks[taskId]
        if (!task) return { ok: false, error: 'Задача не найдена' }
        if (!get().canCompleteTask(taskId)) {
          return { ok: false, error: 'Подтвердите новый чертёж перед отправкой' }
        }
        const sub = get().getTaskSubWorks(taskId).find((s) => s.id === subWorkId)
        if (!sub) return { ok: false, error: 'Под-работа не найдена' }
        if (sub.isHiddenWork) {
          if (!(sub.beforeClosePhotos?.length ?? 0)) {
            return { ok: false, error: 'Прикрепите фото ДО закрытия — обязательно для скрытых работ' }
          }
        } else if (!sub.workPhotos.length) {
          return { ok: false, error: 'Прикрепите фото выполненной работы' }
        }
        get().updateSubWorkStatus(taskId, subWorkId, 'review')
        return { ok: true }
      },

      acceptSubWork: (taskId, subWorkId, author, payload, meta) => {
        const task = get().tasks[taskId]
        if (!task) return { ok: false, error: 'Задача не найдена' }
        const current = get().getTaskSubWorks(taskId).find((s) => s.id === subWorkId)
        if (!current) return { ok: false, error: 'Под-работа не найдена' }
        if (current.isHiddenWork && !(current.beforeClosePhotos?.length ?? 0)) {
          return { ok: false, error: 'Нельзя принять без фото до закрытия' }
        }
        if (payload) {
          const checklistErr = validateChecklistForAcceptance(payload.checklist)
          if (checklistErr) return { ok: false, error: checklistErr }
        }

        const sub = patchSubWork(get, set, taskId, subWorkId, (s) =>
          appendSubWorkHistory(
            { ...s, status: 'done', defectComment: undefined },
            {
              action: 'accept',
              authorRole: author.role,
              authorName: author.name,
              oldStatus: s.status,
              newStatus: 'done',
            },
          ),
        )
        if (!sub) return { ok: false, error: 'Не удалось обновить статус' }

        let act: AcceptanceAct | undefined
        if (payload) {
          const photos = sub.isHiddenWork
            ? (sub.beforeClosePhotos ?? [])
            : sub.workPhotos
          act = useQualityAcceptanceStore.getState().createAct({
            objectId: task.objectId,
            objectName: meta?.objectName,
            taskId,
            subWorkId,
            workType: task.workType,
            workLabel: sub.label,
            apartmentNumber: task.apartmentNumber,
            acceptedBy: author.name,
            acceptedByRole: author.role,
            payload,
            photos,
          })
        }

        useAcceptanceReportStore.getState().addEntry({
          objectId: task.objectId,
          taskId,
          subWorkId,
          subWorkLabel: sub.label,
          workType: task.workType,
          apartmentNumber: task.apartmentNumber,
          action: 'accepted',
          authorRole: author.role,
          authorName: author.name,
        })
        onSubWorkAccepted(taskId, subWorkId, sub.label, author)
        return { ok: true, act }
      },

      redoSubWork: (taskId, subWorkId, reason, author) => {
        const task = get().tasks[taskId]
        if (!task) return
        const trimmed = reason.trim()
        if (!trimmed) return
        const sub = patchSubWork(get, set, taskId, subWorkId, (s) =>
          appendSubWorkHistory(
            { ...s, status: 'rejected', defectComment: trimmed },
            {
              action: 'redo',
              authorRole: author.role,
              authorName: author.name,
              oldStatus: s.status,
              newStatus: 'rejected',
              reason: trimmed,
            },
          ),
        )
        if (!sub) return
        useAcceptanceReportStore.getState().addEntry({
          objectId: task.objectId,
          taskId,
          subWorkId,
          subWorkLabel: sub.label,
          workType: task.workType,
          apartmentNumber: task.apartmentNumber,
          action: 'redo',
          reason: trimmed,
          authorRole: author.role,
          authorName: author.name,
        })
        onSubWorkRedo(taskId, subWorkId, sub.label, trimmed, author)
      },

      patchApartmentTasks: ({
        objectId,
        section,
        house,
        entrance,
        floor,
        oldApartmentNumber,
        newApartmentNumber,
        oldWorkTemplate: _oldWorkTemplate,
        newWorkTemplate,
      }) => {
        const tasks = { ...get().tasks }
        const newTypes = WORK_TEMPLATES[newWorkTemplate].types
        const preserved = new Map<WorkType, ProjectTask>()

        for (const [id, task] of Object.entries(tasks)) {
          if (
            task.objectId === objectId &&
            task.section === section &&
            task.house === house &&
            task.entrance === entrance &&
            task.floor === floor &&
            task.apartmentNumber === oldApartmentNumber
          ) {
            preserved.set(task.workType, task)
            delete tasks[id]
          }
        }

        for (const workType of newTypes) {
          const id = buildTaskId(objectId, section, house, entrance, floor, newApartmentNumber, workType)
          const prev = preserved.get(workType)
          const newTitle = `${WORK_TYPE_LABELS[workType] || workType} — кв. ${newApartmentNumber}`
          tasks[id] = prev
            ? {
                ...prev,
                id,
                apartmentNumber: newApartmentNumber,
                title: newTitle,
              }
            : {
                id,
                objectId,
                section,
                house,
                entrance,
                floor,
                apartmentNumber: newApartmentNumber,
                workType,
                title: newTitle,
                status: 'pending',
                blueprintAcknowledged: true,
                subWorks: hasSubWorks(workType) ? createSubWorksForType(workType) : undefined,
              }
          if (prev && oldApartmentNumber !== newApartmentNumber) {
            logTaskAudit({
              taskId: id,
              field: 'description',
              fieldLabel: 'Квартира',
              oldValue: `кв. ${oldApartmentNumber}`,
              newValue: `кв. ${newApartmentNumber}`,
            })
          } else if (!prev) {
            logTaskCreated(id, newTitle)
          }
        }

        set({ tasks })
      },
    }),
    {
      name: STORAGE_KEYS.WORKFLOW,
      storage: createJSONStorage(() => createZustandStorage()),
    },
  ),
)
