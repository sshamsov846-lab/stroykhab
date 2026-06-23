import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { ConstructionObject, WorkType } from '@types'
import type { ClientOrganization, ClientWorkSection } from '@api/clientView'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { onWorkerAssignedToTask } from '@utils/workflowNotifications'
import { logAssignmentChange } from '@utils/taskAuditLog'
import { buildSideJobImportRows } from '@utils/sideJobTasks'
import { notifyBrigadeTaskAssigned } from '@utils/brigadeNotifications'
import { formatSubWorkAddress } from '@utils/subWorkNotifications'

export type ObjectKind = 'apartment' | 'building' | 'sideJob'

export interface ObjectMeta {
  kind: ObjectKind
  housesCount?: number
  sideJobType?: import('@utils/sideJob').SideJobType
  /** Резервная копия кода подключения к объекту */
  inviteCode?: string
  wizard?: import('@/types/objectWizard').ObjectWizardMeta
}

export interface TeamMember {
  id: string
  name: string
  role: string
  phone: string
  specialty?: string
  specializationIds?: import('@/constants/specializations').SpecializationId[]
  facePhoto?: string
  personalCode?: string
  userKey?: string
  foremanUserKey?: string
  workerEmploymentType?: import('@/types/person').WorkerEmploymentType
}

const SPECIALTY_TO_WORK: Record<string, WorkType> = {
  электр: 'electrical',
  сантех: 'plumbing',
  штукатур: 'plaster',
  бетон: 'screed',
  стяжк: 'screed',
  маляр: 'paint',
  покрас: 'paint',
  плитк: 'tiles',
  окн: 'windows',
  двер: 'doors',
  отоплен: 'heating',
  вентил: 'ventilation',
}

export const DEFAULT_ORG_TEMPLATES: Omit<ClientOrganization, 'id'>[] = [
  { name: 'ООО «ЭлектроМонтаж»', specialty: 'Электрика', phone: '+7 (495) 300-55-66' },
  { name: 'ООО «АкваТех»', specialty: 'Сантехника', phone: '+7 (495) 400-77-88' },
  { name: 'ИП Козлов', specialty: 'Штукатурка и отделка', phone: '+7 (916) 222-33-44' },
  { name: 'ООО «БетонСтрой»', specialty: 'Бетонные работы', phone: '+7 (495) 100-11-11' },
]

function workTypeFromSpecialty(specialty: string): WorkType | null {
  const lower = specialty.toLowerCase()
  for (const [key, wt] of Object.entries(SPECIALTY_TO_WORK)) {
    if (lower.includes(key)) return wt
  }
  return null
}

export function buildWorkSectionsFromOrganizations(orgs: ClientOrganization[]): ClientWorkSection[] {
  return orgs.map((org, i) => {
    const wt = workTypeFromSpecialty(org.specialty) || 'walls'
    return {
      id: `sec-${org.id}`,
      type: wt,
      organization: org.name,
      status: 'pending' as const,
      tasks: [{
        id: `task-${org.id}-${i}`,
        title: WORK_TYPE_LABELS[wt] || org.specialty,
        status: 'pending' as const,
        remaining_note: 'Ожидает начала работ',
        media: [],
      }],
    }
  })
}

interface ObjectStoreState {
  userObjects: ConstructionObject[]
  objectOrganizations: Record<string, ClientOrganization[]>
  objectMeta: Record<string, ObjectMeta>
  teamMembers: TeamMember[]
  workerTaskAssignments: Record<string, string>
  /** Мастера подрядных организаций: contractorId → workers */
  contractorWorkers: Record<string, TeamMember[]>
  /** Назначения мастеров подрядчика: taskId → workerId */
  contractorWorkerAssignments: Record<string, string>
  /** Назначения бригад: taskId → brigadeId */
  brigadeTaskAssignments: Record<string, string>

  registerObject: (
    object: ConstructionObject,
    organizations: ClientOrganization[],
    meta: ObjectMeta,
  ) => void
  registerSideJob: (
    object: ConstructionObject,
    works: Array<{ title: string; description?: string }>,
  ) => string
  getOrganizations: (objectId: string) => ClientOrganization[] | undefined
  setOrganizations: (objectId: string, organizations: ClientOrganization[]) => void
  addOrganization: (objectId: string, org: Omit<ClientOrganization, 'id'>) => ClientOrganization
  removeOrganization: (objectId: string, orgId: string) => void
  addTeamMember: (member: Omit<TeamMember, 'id'>) => TeamMember
  removeTeamMember: (id: string) => void
  assignWorkerToTask: (taskId: string, workerId: string | null) => void
  bulkAssignWorker: (objectId: string, workType: WorkType, workerId: string) => number
  bulkAssignWorkerByScope: (
    objectId: string,
    workerId: string,
    scope: 'task' | 'entrance' | 'floor',
    filter: { taskId?: string; workType?: WorkType; entrance?: string; floor?: string },
  ) => number
  getAssignedWorkerId: (taskId: string) => string | undefined
  addContractorWorker: (contractorId: string, member: Omit<TeamMember, 'id'>) => TeamMember
  removeContractorWorker: (contractorId: string, workerId: string) => void
  getContractorWorkers: (contractorId: string) => TeamMember[]
  assignContractorWorkerToTask: (taskId: string, workerId: string | null) => void
  bulkAssignContractorWorker: (contractorId: string, objectId: string, workType: WorkType, workerId: string) => number
  getContractorWorkerAssignment: (taskId: string) => string | undefined
  assignBrigadeToTask: (taskId: string, brigadeId: string | null) => void
  bulkAssignBrigadeByScope: (
    objectId: string,
    brigadeId: string,
    scope: 'task' | 'entrance' | 'floor',
    filter: { taskId?: string; workType?: WorkType; entrance?: string; floor?: string },
  ) => number
  getBrigadeForTask: (taskId: string) => string | undefined
  getWorkSectionsForApartment: (objectId: string, apartmentId: string) => ClientWorkSection[] | null
  setObjectInviteCode: (objectId: string, inviteCode: string) => void
}

const DEFAULT_TEAM: TeamMember[] = [
  { id: 'w1', name: 'Петров С.В.', role: 'Сантехник', phone: '+7 (999) 234-56-78', specialty: 'Сантехника' },
  { id: 'w2', name: 'Сидоров М.К.', role: 'Электрик', phone: '+7 (999) 345-67-89', specialty: 'Электрика' },
  { id: 'w3', name: 'Козлов Д.И.', role: 'Плиточник', phone: '+7 (999) 456-78-90', specialty: 'Плитка' },
  { id: 'w4', name: 'Никитин А.А.', role: 'Штукатур', phone: '+7 (999) 567-89-01', specialty: 'Штукатурка' },
]

export const useObjectStore = create<ObjectStoreState>()(
  persist(
    (set, get) => ({
      userObjects: [],
      objectOrganizations: {},
      objectMeta: {},
      teamMembers: DEFAULT_TEAM,
      workerTaskAssignments: {},
      contractorWorkers: {},
      contractorWorkerAssignments: {},
      brigadeTaskAssignments: {},

      registerObject: (object, organizations, meta) => {
        set((s) => ({
          userObjects: [object, ...s.userObjects.filter((o) => o.id !== object.id)],
          objectOrganizations: { ...s.objectOrganizations, [object.id]: organizations },
          objectMeta: { ...s.objectMeta, [object.id]: meta },
        }))
      },

      registerSideJob: (object, works) => {
        const meta: ObjectMeta = {
          kind: 'sideJob',
          sideJobType: object.sideJobType,
        }
        get().registerObject(object, [], meta)
        const rows = buildSideJobImportRows(object.name, works)
        useProjectWorkflowStore.getState().importHierarchy(object.id, rows)
        return object.id
      },

      getOrganizations: (objectId) => get().objectOrganizations[objectId],

      setOrganizations: (objectId, organizations) => {
        set((s) => ({
          objectOrganizations: { ...s.objectOrganizations, [objectId]: organizations },
        }))
      },

      addOrganization: (objectId, org) => {
        const newOrg: ClientOrganization = {
          ...org,
          id: `org-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          contract_date: org.contract_date || new Date().toISOString().slice(0, 10),
        }
        set((s) => ({
          objectOrganizations: {
            ...s.objectOrganizations,
            [objectId]: [...(s.objectOrganizations[objectId] || []), newOrg],
          },
        }))
        return newOrg
      },

      removeOrganization: (objectId, orgId) => {
        set((s) => ({
          objectOrganizations: {
            ...s.objectOrganizations,
            [objectId]: (s.objectOrganizations[objectId] || []).filter((o) => o.id !== orgId),
          },
        }))
      },

      addTeamMember: (member) => {
        const newMember: TeamMember = { ...member, id: `w-${Date.now()}` }
        set((s) => ({ teamMembers: [...s.teamMembers, newMember] }))
        return newMember
      },

      removeTeamMember: (id) => {
        set((s) => ({
          teamMembers: s.teamMembers.filter((m) => m.id !== id),
          workerTaskAssignments: Object.fromEntries(
            Object.entries(s.workerTaskAssignments).filter(([, wid]) => wid !== id),
          ),
        }))
      },

      assignWorkerToTask: (taskId, workerId) => {
        const prev = get().workerTaskAssignments[taskId]
        set((s) => {
          const next = { ...s.workerTaskAssignments }
          if (workerId) next[taskId] = workerId
          else delete next[taskId]
          return { workerTaskAssignments: next }
        })
        logAssignmentChange(taskId, prev, workerId)
        if (workerId) onWorkerAssignedToTask(taskId, workerId)
      },

      bulkAssignWorker: (objectId, workType, workerId) =>
        get().bulkAssignWorkerByScope(objectId, workerId, 'task', { workType }),

      bulkAssignWorkerByScope: (objectId, workerId, scope, filter) => {
        let tasks = useProjectWorkflowStore.getState().getTasksByObject(objectId)
        if (filter.workType) tasks = tasks.filter((t) => t.workType === filter.workType)
        if (scope === 'entrance' && filter.entrance) {
          tasks = tasks.filter((t) => t.entrance === filter.entrance)
        }
        if (scope === 'floor' && filter.entrance != null && filter.floor != null) {
          tasks = tasks.filter(
            (t) => t.entrance === filter.entrance && t.floor === filter.floor,
          )
        }
        if (scope === 'task' && filter.taskId) {
          tasks = tasks.filter((t) => t.id === filter.taskId)
        } else if (scope === 'task' && filter.workType && !filter.taskId) {
          tasks = tasks.filter((t) => t.workType === filter.workType)
        }
        if (tasks.length === 0) return 0

        const prevAssignments = get().workerTaskAssignments
        const next: Record<string, string> = {}
        for (const t of tasks) next[t.id] = workerId
        set((s) => ({
          workerTaskAssignments: { ...s.workerTaskAssignments, ...next },
        }))
        for (const t of tasks) {
          logAssignmentChange(t.id, prevAssignments[t.id], workerId)
          onWorkerAssignedToTask(t.id, workerId)
        }
        return tasks.length
      },

      getAssignedWorkerId: (taskId) => get().workerTaskAssignments[taskId],

      addContractorWorker: (contractorId, member) => {
        const newMember: TeamMember = { ...member, id: `cw-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` }
        set((s) => ({
          contractorWorkers: {
            ...s.contractorWorkers,
            [contractorId]: [...(s.contractorWorkers[contractorId] || []), newMember],
          },
        }))
        return newMember
      },

      removeContractorWorker: (contractorId, workerId) => {
        set((s) => ({
          contractorWorkers: {
            ...s.contractorWorkers,
            [contractorId]: (s.contractorWorkers[contractorId] || []).filter((m) => m.id !== workerId),
          },
          contractorWorkerAssignments: Object.fromEntries(
            Object.entries(s.contractorWorkerAssignments).filter(([, wid]) => wid !== workerId),
          ),
        }))
      },

      getContractorWorkers: (contractorId) => get().contractorWorkers[contractorId] || [],

      assignContractorWorkerToTask: (taskId, workerId) => {
        const task = useProjectWorkflowStore.getState().tasks[taskId]
        const prev = get().contractorWorkerAssignments[taskId]
        set((s) => {
          const next = { ...s.contractorWorkerAssignments }
          if (workerId) next[taskId] = workerId
          else delete next[taskId]
          return { contractorWorkerAssignments: next }
        })
        logAssignmentChange(taskId, prev, workerId)
        if (workerId && task) onWorkerAssignedToTask(taskId, workerId)
      },

      bulkAssignContractorWorker: (contractorId, objectId, workType, workerId) => {
        const tasks = useProjectWorkflowStore
          .getState()
          .getTasksByObject(objectId)
          .filter((t) => t.contractorId === contractorId && t.workType === workType)
        const prevAssignments = get().contractorWorkerAssignments
        const next: Record<string, string> = {}
        for (const t of tasks) next[t.id] = workerId
        set((s) => ({
          contractorWorkerAssignments: { ...s.contractorWorkerAssignments, ...next },
        }))
        for (const t of tasks) {
          logAssignmentChange(t.id, prevAssignments[t.id], workerId)
          onWorkerAssignedToTask(t.id, workerId)
        }
        return tasks.length
      },

      getContractorWorkerAssignment: (taskId) => get().contractorWorkerAssignments[taskId],

      assignBrigadeToTask: (taskId, brigadeId) => {
        set((s) => {
          const brigadeNext = { ...s.brigadeTaskAssignments }
          const workerNext = { ...s.workerTaskAssignments }
          const contractorNext = { ...s.contractorWorkerAssignments }
          if (brigadeId) {
            brigadeNext[taskId] = brigadeId
            delete workerNext[taskId]
            delete contractorNext[taskId]
          } else {
            delete brigadeNext[taskId]
          }
          return {
            brigadeTaskAssignments: brigadeNext,
            workerTaskAssignments: workerNext,
            contractorWorkerAssignments: contractorNext,
          }
        })
        if (brigadeId) {
          const task = useProjectWorkflowStore.getState().tasks[taskId]
          if (task) {
            notifyBrigadeTaskAssigned({
              brigadeId,
              taskId,
              objectId: task.objectId,
              locationLabel: formatSubWorkAddress(
                task.apartmentNumber,
                WORK_TYPE_LABELS[task.workType] || task.title,
              ),
            })
          }
        }
      },

      bulkAssignBrigadeByScope: (objectId, brigadeId, scope, filter) => {
        let tasks = useProjectWorkflowStore.getState().getTasksByObject(objectId)
        if (filter.workType) tasks = tasks.filter((t) => t.workType === filter.workType)
        if (scope === 'entrance' && filter.entrance) {
          tasks = tasks.filter((t) => t.entrance === filter.entrance)
        }
        if (scope === 'floor' && filter.entrance != null && filter.floor != null) {
          tasks = tasks.filter(
            (t) => t.entrance === filter.entrance && t.floor === filter.floor,
          )
        }
        if (scope === 'task' && filter.taskId) {
          tasks = tasks.filter((t) => t.id === filter.taskId)
        }
        for (const t of tasks) {
          get().assignBrigadeToTask(t.id, brigadeId)
        }
        return tasks.length
      },

      getBrigadeForTask: (taskId) => get().brigadeTaskAssignments[taskId],

      setObjectInviteCode: (objectId, inviteCode) => {
        set((s) => {
          const prev = s.objectMeta[objectId] ?? { kind: 'building' as ObjectKind }
          return {
            objectMeta: {
              ...s.objectMeta,
              [objectId]: { ...prev, inviteCode },
            },
          }
        })
      },

      getWorkSectionsForApartment: (objectId, apartmentId) => {
        if (!apartmentId.startsWith('apt-simple')) return null
        const orgs = get().objectOrganizations[objectId]
        if (!orgs?.length) return null
        return buildWorkSectionsFromOrganizations(orgs)
      },
    }),
    {
      name: STORAGE_KEYS.OBJECT,
      storage: createJSONStorage(() => createZustandStorage()),
    },
  ),
)

export function getUserObjectsFromStore(): ConstructionObject[] {
  return useObjectStore.getState().userObjects
}

export function getOrganizationsForObject(objectId: string): ClientOrganization[] | undefined {
  return useObjectStore.getState().objectOrganizations[objectId]
}
