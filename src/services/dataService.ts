import type { ConstructionObject, Task } from '@types'
import type {
  Contractor,
  ProjectTask,
  BlueprintFile,
  TaskChatMessage,
} from '@/types/projectWorkflow'
import type {
  GeneratedObjectStructure,
} from '@/types/objectStructure'
import type { AppRole } from '@store/userStore'
import type { ObjectMeta, TeamMember } from '@store/objectStore'
import type { ClientOrganization } from '@api/clientView'
import {
  STORAGE_KEYS,
  getJSON,
  setJSON,
  getPersistedState,
  setPersistedState,
  patchPersistedState,
} from '@services/storage'

// ─── Типы persisted-срезов ───────────────────────────────────────────────────

export interface UserData {
  registered: boolean
  fullName: string
  phone: string
  role: AppRole
  contractorId: string
}

export interface ObjectStoreData {
  userObjects: ConstructionObject[]
  objectOrganizations: Record<string, ClientOrganization[]>
  objectMeta: Record<string, ObjectMeta>
  teamMembers: TeamMember[]
  workerTaskAssignments: Record<string, string>
  contractorWorkers: Record<string, TeamMember[]>
  contractorWorkerAssignments: Record<string, string>
}

export interface WorkflowStoreData {
  contractors: Contractor[]
  tasks: Record<string, ProjectTask>
  blueprints: BlueprintFile[]
  chatMessages: TaskChatMessage[]
  importedObjects: string[]
}

import type { HierarchyNavState } from '@/types/hierarchyNav'

export interface ClientPortalData {
  customStructures: Record<string, GeneratedObjectStructure>
  hierarchyNavByObject: Record<string, HierarchyNavState>
}

export interface QueuedAction {
  id: string
  type: string
  payload: unknown
  timestamp: number
  retryCount: number
}

interface CacheEntry {
  data: unknown
  timestamp: number
}

// ─── Пользователь ────────────────────────────────────────────────────────────

export function getUser(): UserData | null {
  return getPersistedState<UserData>(STORAGE_KEYS.USER)
}

export function saveUser(data: Partial<UserData>): void {
  const current = getUser() ?? {
    registered: false,
    fullName: '',
    phone: '',
    role: 'foreman' as AppRole,
    contractorId: '',
  }
  setPersistedState(STORAGE_KEYS.USER, { ...current, ...data })
}

export function clearUser(): void {
  setPersistedState<UserData>(STORAGE_KEYS.USER, {
    registered: false,
    fullName: '',
    phone: '',
    role: 'foreman',
    contractorId: '',
  })
}

/** @deprecated используйте getUser — alias для совместимости */
export function getUsers(): UserData | null {
  return getUser()
}

// ─── Проекты (объекты) ───────────────────────────────────────────────────────

function readObjectStore(): ObjectStoreData {
  return (
    getPersistedState<ObjectStoreData>(STORAGE_KEYS.OBJECT) ?? {
      userObjects: [],
      objectOrganizations: {},
      objectMeta: {},
      teamMembers: [],
      workerTaskAssignments: {},
      contractorWorkers: {},
      contractorWorkerAssignments: {},
    }
  )
}

function writeObjectStore(data: ObjectStoreData): void {
  setPersistedState(STORAGE_KEYS.OBJECT, data)
}

export function getProjects(): ConstructionObject[] {
  return readObjectStore().userObjects
}

export function getProjectById(id: string): ConstructionObject | undefined {
  return getProjects().find((p) => p.id === id)
}

export function saveProject(project: ConstructionObject): void {
  const store = readObjectStore()
  writeObjectStore({
    ...store,
    userObjects: [project, ...store.userObjects.filter((p) => p.id !== project.id)],
  })
}

export function deleteProject(id: string): void {
  const store = readObjectStore()
  const { [id]: _orgs, ...restOrgs } = store.objectOrganizations
  const { [id]: _meta, ...restMeta } = store.objectMeta
  writeObjectStore({
    ...store,
    userObjects: store.userObjects.filter((p) => p.id !== id),
    objectOrganizations: restOrgs,
    objectMeta: restMeta,
  })
}

export function getObjectOrganizations(objectId: string): ClientOrganization[] | undefined {
  return readObjectStore().objectOrganizations[objectId]
}

export function saveObjectOrganizations(objectId: string, organizations: ClientOrganization[]): void {
  const store = readObjectStore()
  writeObjectStore({
    ...store,
    objectOrganizations: { ...store.objectOrganizations, [objectId]: organizations },
  })
}

export function getObjectMeta(objectId: string): ObjectMeta | undefined {
  return readObjectStore().objectMeta[objectId]
}

export function saveObjectMeta(objectId: string, meta: ObjectMeta): void {
  const store = readObjectStore()
  writeObjectStore({
    ...store,
    objectMeta: { ...store.objectMeta, [objectId]: meta },
  })
}

export function getTeamMembers(): TeamMember[] {
  return readObjectStore().teamMembers
}

export function saveTeamMembers(members: TeamMember[]): void {
  patchPersistedState<ObjectStoreData>(STORAGE_KEYS.OBJECT, { teamMembers: members })
}

export function getWorkerAssignments(): Record<string, string> {
  return readObjectStore().workerTaskAssignments
}

export function saveWorkerAssignment(taskId: string, workerId: string | null): void {
  const store = readObjectStore()
  const next = { ...store.workerTaskAssignments }
  if (workerId) next[taskId] = workerId
  else delete next[taskId]
  patchPersistedState<ObjectStoreData>(STORAGE_KEYS.OBJECT, { workerTaskAssignments: next })
}

// ─── Задачи (legacy supabase demo) ───────────────────────────────────────────

export function getLegacyTasks(objectId?: string): Task[] {
  const tasks = getJSON<Task[]>(STORAGE_KEYS.LEGACY_TASKS) ?? []
  return objectId ? tasks.filter((t) => t.object_id === objectId) : tasks
}

export function saveLegacyTask(task: Task): void {
  const tasks = getLegacyTasks()
  const idx = tasks.findIndex((t) => t.id === task.id)
  if (idx >= 0) tasks[idx] = task
  else tasks.push(task)
  setJSON(STORAGE_KEYS.LEGACY_TASKS, tasks)
}

export function deleteLegacyTask(id: string): void {
  setJSON(
    STORAGE_KEYS.LEGACY_TASKS,
    getLegacyTasks().filter((t) => t.id !== id),
  )
}

// ─── Workflow-задачи ─────────────────────────────────────────────────────────

function readWorkflowStore(): WorkflowStoreData {
  return (
    getPersistedState<WorkflowStoreData>(STORAGE_KEYS.WORKFLOW) ?? {
      contractors: [],
      tasks: {},
      blueprints: [],
      chatMessages: [],
      importedObjects: [],
    }
  )
}

function writeWorkflowStore(data: WorkflowStoreData): void {
  setPersistedState(STORAGE_KEYS.WORKFLOW, data)
}

export function getTasks(): Record<string, ProjectTask> {
  return readWorkflowStore().tasks
}

export function getTasksByObject(objectId: string): ProjectTask[] {
  return Object.values(getTasks()).filter((t) => t.objectId === objectId)
}

export function getTaskById(id: string): ProjectTask | undefined {
  return getTasks()[id]
}

export function saveTask(task: ProjectTask): void {
  const store = readWorkflowStore()
  writeWorkflowStore({
    ...store,
    tasks: { ...store.tasks, [task.id]: task },
  })
}

export function deleteTask(id: string): void {
  const store = readWorkflowStore()
  const { [id]: _removed, ...rest } = store.tasks
  writeWorkflowStore({ ...store, tasks: rest })
}

export function getWorkflowBlueprints(): BlueprintFile[] {
  return readWorkflowStore().blueprints
}

export function saveWorkflowBlueprint(blueprint: BlueprintFile): void {
  const store = readWorkflowStore()
  writeWorkflowStore({ ...store, blueprints: [...store.blueprints, blueprint] })
}

export function getChatMessages(): TaskChatMessage[] {
  return readWorkflowStore().chatMessages
}

export function saveChatMessage(message: TaskChatMessage): void {
  const store = readWorkflowStore()
  writeWorkflowStore({ ...store, chatMessages: [...store.chatMessages, message] })
}

export function getImportedObjectIds(): string[] {
  return readWorkflowStore().importedObjects
}

// ─── Клиентский портал ───────────────────────────────────────────────────────

function readClientPortal(): ClientPortalData {
  return (
    getPersistedState<ClientPortalData>(STORAGE_KEYS.CLIENT_PORTAL) ?? {
      customStructures: {},
      hierarchyNavByObject: {},
    }
  )
}

export function getCustomStructures(): Record<string, GeneratedObjectStructure> {
  return readClientPortal().customStructures
}

export function saveCustomStructure(structure: GeneratedObjectStructure): void {
  const store = readClientPortal()
  setPersistedState(STORAGE_KEYS.CLIENT_PORTAL, {
    ...store,
    customStructures: { ...store.customStructures, [structure.objectId]: structure },
  })
}

// ─── Офлайн-очередь и кэш ────────────────────────────────────────────────────

export function getOfflineQueue(): QueuedAction[] {
  return getJSON<QueuedAction[]>(STORAGE_KEYS.OFFLINE_QUEUE) ?? []
}

export function saveOfflineQueue(queue: QueuedAction[]): void {
  setJSON(STORAGE_KEYS.OFFLINE_QUEUE, queue)
}

export function addOfflineAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): QueuedAction {
  const item: QueuedAction = {
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    timestamp: Date.now(),
    retryCount: 0,
  }
  saveOfflineQueue([...getOfflineQueue(), item])
  return item
}

export function removeOfflineAction(id: string): void {
  saveOfflineQueue(getOfflineQueue().filter((item) => item.id !== id))
}

export function incrementOfflineRetry(id: string): void {
  saveOfflineQueue(
    getOfflineQueue().map((item) =>
      item.id === id ? { ...item, retryCount: item.retryCount + 1 } : item,
    ),
  )
}

function readCacheStore(): Record<string, CacheEntry> {
  return getJSON<Record<string, CacheEntry>>(STORAGE_KEYS.CACHE) ?? {}
}

function writeCacheStore(cache: Record<string, CacheEntry>): void {
  setJSON(STORAGE_KEYS.CACHE, cache)
}

export function setCacheEntry(key: string, data: unknown): void {
  const cache = readCacheStore()
  cache[key] = { data, timestamp: Date.now() }
  writeCacheStore(cache)
}

export function getCacheEntry<T>(key: string, maxAge = 5 * 60 * 1000): T | null {
  const item = readCacheStore()[key]
  if (!item || Date.now() - item.timestamp > maxAge) return null
  return item.data as T
}
