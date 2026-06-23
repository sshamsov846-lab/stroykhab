import type { WorkType } from '@types'
import type { WorkTemplateId } from '@/types/objectStructure'
import type { WizardTerritoryOptions, WizardHouseZoneOptions } from '@/types/buildingZones'

export type ObjectWizardType =
  | 'novostroyka'
  | 'private_house'
  | 'apartment'
  | 'commercial'
  | 'industrial'

export type ObjectWorkScopeMode = 'rough' | 'finish' | 'turnkey' | 'custom'

export interface ObjectWizardMeta {
  objectType: ObjectWizardType
  description: string
  photoUrls: string[]
  startDate: string
  endDate: string
  workScopeMode: ObjectWorkScopeMode
  selectedWorkTypes: WorkType[]
  siteContactName: string
  plotAreaSotkas?: number
  projectFiles?: import('@/types/projectExcel').ObjectProjectFileMeta[]
  excelSummary?: import('@/types/projectExcel').ExcelProjectSummary
}

export const OBJECT_TYPE_OPTIONS: {
  id: ObjectWizardType
  title: string
  desc: string
}[] = [
  { id: 'novostroyka', title: 'Новостройка / ЖК', desc: 'Секции, дома, подъезды, квартиры' },
  { id: 'private_house', title: 'Частный дом', desc: 'Один дом, участок, кровля' },
  { id: 'apartment', title: 'Квартира (ремонт)', desc: 'Одно помещение, полный ремонт' },
  { id: 'commercial', title: 'Коммерция', desc: 'Офис, магазин, инженерия' },
  { id: 'industrial', title: 'Промышленный объект', desc: 'Цеха, инженерные зоны' },
]

export const WORK_SCOPE_OPTIONS: { id: ObjectWorkScopeMode; label: string; hint: string }[] = [
  { id: 'rough', label: 'Черновые работы', hint: 'Стяжка, электрика, сантехника, штукатурка' },
  { id: 'finish', label: 'Чистовые работы', hint: 'Плитка, покраска, двери, напольные покрытия' },
  { id: 'turnkey', label: 'Под ключ', hint: 'Полный цикл от черновых до сдачи' },
  { id: 'custom', label: 'Отдельные виды', hint: 'Выберите нужные работы галочками' },
]

export const INDIVIDUAL_WORK_OPTIONS: { id: WorkType; label: string }[] = [
  { id: 'plumbing', label: 'Сантехника' },
  { id: 'electrical', label: 'Электрика' },
  { id: 'plaster', label: 'Штукатурка / отделка' },
  { id: 'screed', label: 'Стяжка пола' },
  { id: 'tiles', label: 'Плитка' },
  { id: 'paint', label: 'Покраска' },
  { id: 'doors', label: 'Двери' },
  { id: 'windows', label: 'Окна' },
  { id: 'heating', label: 'Отопление' },
  { id: 'ventilation', label: 'Вентиляция' },
  { id: 'facade', label: 'Фасад' },
  { id: 'roof', label: 'Кровля' },
]

export const FINISH_WORK_TYPES: WorkType[] = ['tiles', 'paint', 'doors', 'floor', 'windows']
export const ROUGH_WORK_TYPES: WorkType[] = ['screed', 'electrical', 'plumbing', 'plaster', 'walls']

export function workTemplateFromScope(mode: ObjectWorkScopeMode): WorkTemplateId {
  if (mode === 'turnkey') return 'full'
  if (mode === 'rough') return 'rough'
  if (mode === 'finish') return 'shell'
  return 'rough'
}

export function calcProjectDays(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null
  const ms = end.getTime() - start.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1
}

export interface ObjectTypePreset {
  territoryOptions: WizardTerritoryOptions
  zoneOptions: WizardHouseZoneOptions
  singleUnit: boolean
  showTerritoryBlock: boolean
  showMultiSection: boolean
  defaultWorkTemplate: WorkTemplateId
}

export const OBJECT_TYPE_PRESETS: Record<ObjectWizardType, ObjectTypePreset> = {
  novostroyka: {
    territoryOptions: { parking: true, playground: true, landscaping: true, undergroundParking: true },
    zoneOptions: { corridors: true, stairwellsElevators: true, facade: true, roofZone: true, engineering: true },
    singleUnit: false,
    showTerritoryBlock: true,
    showMultiSection: true,
    defaultWorkTemplate: 'rough',
  },
  private_house: {
    territoryOptions: { parking: true, playground: false, landscaping: true, undergroundParking: false },
    zoneOptions: { corridors: false, stairwellsElevators: false, facade: true, roofZone: true, engineering: false },
    singleUnit: true,
    showTerritoryBlock: true,
    showMultiSection: false,
    defaultWorkTemplate: 'full',
  },
  apartment: {
    territoryOptions: { parking: false, playground: false, landscaping: false, undergroundParking: false },
    zoneOptions: { corridors: false, stairwellsElevators: false, facade: false, roofZone: false, engineering: false },
    singleUnit: true,
    showTerritoryBlock: false,
    showMultiSection: false,
    defaultWorkTemplate: 'full',
  },
  commercial: {
    territoryOptions: { parking: true, playground: false, landscaping: false, undergroundParking: true },
    zoneOptions: { corridors: true, stairwellsElevators: true, facade: true, roofZone: false, engineering: true },
    singleUnit: true,
    showTerritoryBlock: true,
    showMultiSection: false,
    defaultWorkTemplate: 'rough',
  },
  industrial: {
    territoryOptions: { parking: true, playground: false, landscaping: false, undergroundParking: false },
    zoneOptions: { corridors: false, stairwellsElevators: false, facade: true, roofZone: true, engineering: true },
    singleUnit: true,
    showTerritoryBlock: false,
    showMultiSection: false,
    defaultWorkTemplate: 'shell',
  },
}
