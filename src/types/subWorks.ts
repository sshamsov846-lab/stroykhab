import type { TaskStatus, WorkType } from '@types'

export interface SubWorkDefinition {
  id: string
  label: string
  description?: string
  /** Скрытая работа — будет закрыта следующим этапом */
  isHiddenWork?: boolean
  /** Какой вид работ закроет эту под-работу */
  hiddenCoveredBy?: WorkType
}

export interface SubWorkHistoryEntry {
  id: string
  at: string
  action: 'status' | 'photo' | 'before_close_photo' | 'accept' | 'redo' | 'comment'
  authorRole: 'foreman' | 'worker' | 'client' | 'subcontractor'
  authorName: string
  oldStatus?: TaskStatus
  newStatus?: TaskStatus
  reason?: string
  text?: string
}

export interface SubWorkState {
  id: string
  label: string
  description?: string
  status: TaskStatus
  workPhotos: string[]
  /** Фото ДО закрытия — обязательно для скрытых работ, хранится навсегда */
  beforeClosePhotos?: string[]
  isHiddenWork?: boolean
  hiddenCoveredBy?: WorkType
  defectComment?: string
  history: SubWorkHistoryEntry[]
}

function hiddenDef(
  id: string,
  label: string,
  description: string,
  hiddenCoveredBy: WorkType,
): SubWorkDefinition {
  return { id, label, description, isHiddenWork: true, hiddenCoveredBy }
}

/** Каталог под-работ по видам работ — можно дополнять */
export const SUB_WORK_CATALOG: Partial<Record<WorkType, SubWorkDefinition[]>> = {
  electrical: [
    hiddenDef('grooving', 'Штробление', 'Штробы под кабель и подрозетники', 'plaster'),
    hiddenDef('cabling', 'Прокладка кабеля', 'Прокладка силового и слаботочного кабеля', 'plaster'),
    { id: 'socket-boxes', label: 'Подрозетники', description: 'Установка подрозетников' },
    { id: 'sockets', label: 'Розетки', description: 'Монтаж розеток и выводов' },
    { id: 'switches', label: 'Выключатели', description: 'Выключатели и проходные' },
    { id: 'lighting', label: 'Освещение', description: 'Светильники, люстры, точечный свет' },
    { id: 'panel', label: 'Электрощит', description: 'Сборка и монтаж щитка' },
    { id: 'meter', label: 'Счётчик', description: 'Установка и опломбировка счётчика' },
    { id: 'grounding', label: 'Заземление', description: 'Контур заземления и уравнивание потенциалов' },
    { id: 'low-voltage', label: 'Слаботочка', description: 'Интернет, ТВ, телефония' },
    { id: 'cctv', label: 'Видеонаблюдение', description: 'Камеры и видеорегистратор' },
    { id: 'intercom', label: 'Домофон', description: 'Домофон и вызовная панель' },
  ],
  plumbing: [
    { id: 'heating', label: 'Отопление (радиаторы)', description: 'Раскладка и монтаж батарей, обвязка' },
    { id: 'risers', label: 'Стояки', description: 'Монтаж стояков воды и канализации' },
    hiddenDef('sewer', 'Канализация', 'Трубы канализации, трапы, выпуски', 'screed'),
    { id: 'supply-return', label: 'Обратка/подача', description: 'Подающие и обратные линии отопления' },
    { id: 'collector', label: 'Коллектор', description: 'Коллекторный узел и группы' },
    { id: 'water-supply', label: 'Водоснабжение', description: 'Разводка ХВС и ГВС' },
    { id: 'ventilation', label: 'Вентиляция', description: 'Вентканалы и решётки' },
    { id: 'faucets', label: 'Краны/смесители', description: 'Смесители, краны, сифоны' },
    { id: 'bathroom', label: 'Установка санузла', description: 'Унитаз, раковина, ванна/душ' },
    { id: 'towel-rail', label: 'Полотенцесушитель', description: 'Монтаж полотенцесушителя' },
    { id: 'water-meters', label: 'Счётчики воды', description: 'Установка счётчиков ХВС/ГВС' },
  ],
  plaster: [
    { id: 'walls', label: 'Стены', description: 'Штукатурка стен по маякам' },
    { id: 'slopes', label: 'Откосы', description: 'Штукатурка оконных и дверных откосов' },
    { id: 'ceiling', label: 'Потолок', description: 'Штукатурка потолка' },
    { id: 'corners', label: 'Углы/маяки', description: 'Установка маяков и выведение углов' },
  ],
  screed: [
    hiddenDef('waterproofing', 'Гидроизоляция', 'Гидроизоляция мокрых зон', 'screed'),
    { id: 'beacons', label: 'Маяки', description: 'Установка маяков под стяжку' },
    { id: 'pour', label: 'Заливка стяжки', description: 'Заливка цементно-песчаной стяжки' },
    { id: 'underfloor', label: 'Тёплый пол', description: 'Монтаж и заливка тёплого пола' },
  ],
  windows: [
    { id: 'install', label: 'Установка окон', description: 'Монтаж оконных блоков' },
    { id: 'sills', label: 'Подоконники', description: 'Установка подоконников' },
    { id: 'slopes', label: 'Откосы', description: 'Отделка откосов' },
    { id: 'mosquito', label: 'Москитные сетки', description: 'Москитные сетки на окна' },
    { id: 'balcony', label: 'Балконный блок', description: 'Балконная дверь и блок' },
  ],
}

export function hasSubWorks(workType: WorkType): boolean {
  return (SUB_WORK_CATALOG[workType]?.length ?? 0) > 0
}

export function subWorkDefFromCatalog(
  workType: WorkType,
  subWorkId: string,
): SubWorkDefinition | undefined {
  return SUB_WORK_CATALOG[workType]?.find((d) => d.id === subWorkId)
}

export function createSubWorkStateFromDef(d: SubWorkDefinition): SubWorkState {
  return {
    id: d.id,
    label: d.label,
    description: d.description ?? '',
    status: 'pending' as TaskStatus,
    workPhotos: [],
    beforeClosePhotos: [],
    isHiddenWork: d.isHiddenWork,
    hiddenCoveredBy: d.hiddenCoveredBy,
    history: [],
  }
}

export function createSubWorksForType(workType: WorkType): SubWorkState[] {
  const defs = SUB_WORK_CATALOG[workType]
  if (!defs?.length) return []
  return defs.map(createSubWorkStateFromDef)
}

export function enrichSubWorkState(
  sub: SubWorkState,
  def?: SubWorkDefinition,
): SubWorkState {
  if (!def) {
    return { ...sub, beforeClosePhotos: sub.beforeClosePhotos ?? [] }
  }
  return {
    ...sub,
    isHiddenWork: def.isHiddenWork ?? sub.isHiddenWork,
    hiddenCoveredBy: def.hiddenCoveredBy ?? sub.hiddenCoveredBy,
    beforeClosePhotos: sub.beforeClosePhotos ?? [],
  }
}

export function subWorkChatTaskId(taskId: string, subWorkId: string): string {
  return `${taskId}__sub__${subWorkId}`
}

export function aggregateSubWorkStatus(subWorks: SubWorkState[]): TaskStatus {
  if (!subWorks.length) return 'pending'
  if (subWorks.every((s) => s.status === 'done')) return 'done'
  if (subWorks.some((s) => s.status === 'review')) return 'review'
  if (subWorks.some((s) => s.status === 'rejected')) return 'rejected'
  if (subWorks.some((s) => s.status === 'in_progress')) return 'in_progress'
  return 'pending'
}

export function calcSubWorkProgress(subWorks: SubWorkState[]): { total: number; done: number; percent: number } {
  const total = subWorks.length
  if (total === 0) return { total: 0, done: 0, percent: 0 }
  const done = subWorks.filter((s) => s.status === 'done').length
  return { total, done, percent: Math.round((done / total) * 100) }
}

export function countHiddenSubWorks(subWorks: SubWorkState[]): number {
  return subWorks.filter((s) => s.isHiddenWork).length
}
