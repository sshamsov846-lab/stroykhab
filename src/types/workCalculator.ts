import type { SpecializationId } from '@/constants/specializations'
import type { VolumeUnit } from '@/types/workerPayroll'
import type { WorkType } from '@types'

export type CalculatorGroupId =
  | 'pipes_heating'
  | 'pipes_water'
  | 'sewage'
  | 'insulation'
  | 'valves'
  | 'radiators'
  | 'compensators'
  | 'supports'
  | 'fittings'
  | 'meters'
  | 'cable'
  | 'conduit'
  | 'grooving'
  | 'sockets'
  | 'points'
  | 'lighting'
  | 'panels'
  | 'walls'
  | 'ceilings'
  | 'slopes'
  | 'beacons'
  | 'reinforcement'
  | 'floors'
  | 'concrete'
  | 'finishing'
  | 'grout'
  | 'plinth'
  | 'wallpaper'
  | 'masonry_wall'
  | 'partitions'
  | 'belt'
  | 'drywall_wall'
  | 'drywall_ceiling'
  | 'boxes'
  | 'windows_doors'
  | 'roof'
  | 'waterproofing'
  | 'gutters'
  | 'other'

export const CALCULATOR_GROUP_LABELS: Record<CalculatorGroupId, string> = {
  pipes_heating: 'Трубы отопления',
  pipes_water: 'Трубы водоснабжения',
  sewage: 'Канализация',
  insulation: 'Изоляция',
  valves: 'Краны / вентили',
  radiators: 'Радиаторы / батареи',
  compensators: 'Компенсаторы',
  supports: 'Опоры / крепления',
  fittings: 'Фитинги / отводы',
  meters: 'Счётчики / полотенцесушители',
  cable: 'Кабель / проводка',
  conduit: 'Гофра / кабель-канал',
  grooving: 'Штробление',
  sockets: 'Розетки / выключатели',
  points: 'Точки',
  lighting: 'Светильники',
  panels: 'Щиты / автоматы',
  walls: 'Стены',
  ceilings: 'Потолки',
  slopes: 'Откосы',
  beacons: 'Маяки',
  reinforcement: 'Армирование',
  floors: 'Полы / стяжка',
  concrete: 'Бетон',
  finishing: 'Отделка / покраска',
  grout: 'Затирка',
  plinth: 'Плинтус / бордюр',
  wallpaper: 'Обои',
  masonry_wall: 'Кладка',
  partitions: 'Перегородки',
  belt: 'Армопояс',
  drywall_wall: 'Стены ГКЛ',
  drywall_ceiling: 'Потолок ГКЛ',
  boxes: 'Короба ГКЛ',
  windows_doors: 'Окна / двери',
  roof: 'Кровля',
  waterproofing: 'Гидроизоляция',
  gutters: 'Водостоки',
  other: 'Прочее',
}

export type CalculatorInputMode = 'simple' | 'area_thickness'

export interface CalculatorCatalogItem {
  id: string
  specializationId: SpecializationId
  groupId: CalculatorGroupId
  label: string
  unit: VolumeUnit
  workType?: WorkType
  defaultRate?: number
  inputMode?: CalculatorInputMode
  isCustom?: boolean
  createdBy?: string
}

export interface CalculatorLine {
  id: string
  catalogItemId?: string
  specializationId: SpecializationId
  groupId: CalculatorGroupId
  label: string
  unit: VolumeUnit
  quantity: number
  unitRate: number
  amount: number
  workType?: WorkType
  inputMode?: CalculatorInputMode
  areaM2?: number
  thicknessMm?: number
  computedVolumeM3?: number
}

export type CalculatorAttachmentType =
  | 'rate_photo'
  | 'rate_file'
  | 'rate_pdf'
  | 'plan'
  | 'project_pdf'
  | 'project_image'
  | 'excel'

export interface CalculatorAttachment {
  id: string
  type: CalculatorAttachmentType
  fileName: string
  fileUrl: string
  mimeType: string
  uploadedAt: string
}

export type CalculatorStatus = 'draft' | 'submitted' | 'accepted' | 'returned'

export const CALCULATOR_STATUS_LABELS: Record<CalculatorStatus, string> = {
  draft: 'Черновик',
  submitted: 'Отправлен',
  accepted: 'Принят',
  returned: 'На уточнении',
}

export interface WorkerCalculatorRates {
  workerId: string
  ratesByCatalogId: Record<string, number>
  ratesByLabel: Record<string, number>
  updatedAt: string
}

export interface TaskWorkCalculator {
  id: string
  taskId: string
  objectId: string
  workerId: string
  workerName: string
  objectName: string
  zoneLabel: string
  specializationLabel: string
  workerCode: string
  lines: CalculatorLine[]
  attachments: CalculatorAttachment[]
  grandTotal: number
  status: CalculatorStatus
  submittedAt?: string
  acceptedAt?: string
  returnReason?: string
  paymentActId?: string
  archivedAt: string
  createdAt: string
  updatedAt: string
}

export const VOLUME_UNIT_OPTIONS: { id: VolumeUnit; label: string }[] = [
  { id: 'lm', label: 'м.п.' },
  { id: 'm2', label: 'м²' },
  { id: 'm3', label: 'м³' },
  { id: 'pcs', label: 'шт' },
  { id: 'point', label: 'точка' },
]
