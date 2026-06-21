import type { TaskStatus, WorkType } from '@types'
import type { ZoneType } from '@/types/buildingZones'

export interface ImportRow {
  section: string
  house: string
  entrance: string
  floor: string
  apartmentNumber: string
  taskType: WorkType
  /** ID категории работ в зоне (для уникальности задачи) */
  categoryId?: string
  zoneType?: ZoneType
  /** Произвольное название работы */
  title?: string
  description?: string
  isSideJob?: boolean
}

export interface Contractor {
  id: string
  name: string
  specialty: string
  phone?: string
  /** Код приглашения для мастеров и прорабов */
  inviteCode?: string
  specializationIds?: import('@/constants/specializations').SpecializationId[]
  /** Создана при регистрации пользователя */
  isRegisteredOrg?: boolean
}

export interface ProjectTask {
  id: string
  objectId: string
  section: string
  house: string
  entrance: string
  floor: string
  apartmentNumber: string
  workType: WorkType
  title: string
  status: TaskStatus
  contractorId?: string
  contractorName?: string
  blueprintAcknowledged: boolean
  defectPhotoUrl?: string
  defectComment?: string
  parentTaskId?: string
  redoReason?: 'own_fault' | 'other_fault'
  /** Описание работ */
  description?: string
  /** Срок выполнения YYYY-MM-DD */
  dueDate?: string
  /** Фото выполненной работы (blob/data URLs) */
  workPhotos?: string[]
  /** Под-работы внутри вида работ (этапы) */
  subWorks?: import('@/types/subWorks').SubWorkState[]
  /** Зона (не квартира) */
  zoneType?: ZoneType
  categoryId?: string
  /** Задача подработки прораба */
  isSideJob?: boolean
}

export interface BlueprintFile {
  id: string
  objectId: string
  workType?: WorkType
  apartmentKey?: string
  taskId?: string
  fileName: string
  fileUrl: string
  mimeType: string
  version: number
  uploadedAt: string
  pendingAcknowledgment: boolean
}

export interface TaskChatMessage {
  id: string
  taskId: string
  authorRole: 'foreman' | 'worker' | 'client' | 'subcontractor'
  authorName: string
  authorUserKey?: string
  workerMemberId?: string
  text: string
  photoUrl?: string
  createdAt: string
}

/** Зависимости: ключ — задача, значение — что должно быть done */
export const TASK_DEPENDENCIES: Partial<Record<WorkType, WorkType[]>> = {
  plaster: ['screed'],
  paint: ['plaster'],
  tiles: ['plumbing'],
  floor: ['screed'],
  ceiling: ['plaster'],
  doors: ['plaster'],
  electrical: ['screed'],
}

export const TASK_TYPE_ALIASES: Record<string, WorkType> = {
  electrical: 'electrical',
  'electrical works': 'electrical',
  электрика: 'electrical',
  plumbing: 'plumbing',
  сантехника: 'plumbing',
  plaster: 'plaster',
  штукатурка: 'plaster',
  screed: 'screed',
  стяжка: 'screed',
  paint: 'paint',
  покраска: 'paint',
  tiles: 'tiles',
  плитка: 'tiles',
  windows: 'windows',
  окна: 'windows',
  doors: 'doors',
  двери: 'doors',
  ceiling: 'ceiling',
  потолок: 'ceiling',
  floor: 'floor',
  полы: 'floor',
  heating: 'heating',
  walls: 'walls',
}

export function apartmentKey(section: string, house: string, entrance: string, floor: string, apt: string) {
  return `${section}|${house}|${entrance}|${floor}|${apt}`
}

export function buildTaskId(
  objectId: string,
  section: string,
  house: string,
  entrance: string,
  floor: string,
  apt: string,
  workType: WorkType,
  categoryId?: string,
) {
  const base = `${objectId}__${section}__${house}__${entrance}__${floor}__${apt}__${workType}`
  const withCat = categoryId ? `${base}__${categoryId}` : base
  return withCat.replace(/\s+/g, '_')
}
