import type { WorkType } from '@types'
import type { ZoneType } from '@/types/buildingZones'
import type { WizardHouseZoneOptions, WizardTerritoryOptions } from '@/types/buildingZones'
import { DEFAULT_HOUSE_ZONE_OPTIONS, DEFAULT_TERRITORY_OPTIONS } from '@/types/buildingZones'

export type WorkTemplateId = 'rough' | 'full' | 'shell'

export const WORK_TEMPLATES: Record<WorkTemplateId, { label: string; types: WorkType[] }> = {
  shell: { label: 'Коробка (без отделки)', types: ['screed', 'electrical', 'plumbing'] },
  rough: { label: 'Черновая отделка', types: ['screed', 'electrical', 'plumbing', 'plaster', 'windows'] },
  full: { label: 'Полный ремонт под ключ', types: ['screed', 'electrical', 'plumbing', 'plaster', 'tiles', 'paint', 'doors'] },
}

/** Работы в подвале: инженерия подъезда, без квартир */
export const BASEMENT_WORK_TYPES: WorkType[] = ['plumbing', 'screed', 'doors', 'windows', 'electrical']

export function basementTaskLabel(workType: WorkType): string {
  const labels: Partial<Record<WorkType, string>> = {
    plumbing: 'Трубы и вводы в подъезд',
    screed: 'Стяжка подвала',
    doors: 'Двери технические',
    windows: 'Окна / витражи подъезда',
    electrical: 'Электрика подвала',
  }
  return labels[workType] || workType
}

/** Маркер «помещения» для задач подвала (не квартира) */
export function basementZoneKey(entranceNumber: number): string {
  return `подвал-п${entranceNumber}`
}

export interface WizardHouseDraft {
  id: string
  name: string
  entrancesCount: number
  floorsPerEntrance: number
  apartmentsPerFloor: number
  /** Тип/комнат по умолчанию (0 = студия, 1–4) — стартовое значение для всех квартир дома */
  defaultRooms: number
  /** Площадь по умолчанию, м² — стартовое значение, можно изменить у каждой квартиры */
  apartmentArea: number
  workTemplate: WorkTemplateId
  includeBasement: boolean
  includeRoof: boolean
  /** Опции дополнительных зон дома */
  zoneOptions: WizardHouseZoneOptions
  structureConfigured: boolean
  apartmentsConfigured: boolean
}

export interface WizardSectionDraft {
  id: string
  name: string
  houses: WizardHouseDraft[]
}

export interface GeneratedZone {
  id: string
  zoneType: ZoneType
  label: string
  zoneKey: string
  sectionId: string
  houseId?: string
  entranceId?: string
  floorId?: string
}

export { DEFAULT_HOUSE_ZONE_OPTIONS, DEFAULT_TERRITORY_OPTIONS }

export interface WizardBasicInfo {
  name: string
  address: string
  budget_total: number
}

export interface WizardApartmentsStep {
  apartmentsPerFloor: number
  workTemplate: WorkTemplateId
}

export interface GeneratedApartment {
  id: string
  number: string
  entranceId: string
  floorId: string
  workTemplate: WorkTemplateId
  /** Тип: 0 = студия, 1–4 = 1–4-комн */
  rooms?: number
  /** Фактическое количество комнат (может отличаться от типа) */
  roomCount?: number
  /** Площадь, м² — для расчёта оплаты по объёму */
  area?: number
  /** Заметка заказчика */
  notes?: string
  /** Подпись, если квартира нестандартная (legacy: могла содержать площадь) */
  label?: string
}

export interface GeneratedFloor {
  id: string
  entranceId: string
  kind: 'basement' | 'regular' | 'roof'
  number: number
  label: string
}

export interface GeneratedEntrance {
  id: string
  houseId: string
  number: number
}

export interface GeneratedHouse {
  id: string
  sectionId: string
  name: string
  entranceIds: string[]
}

export interface GeneratedSection {
  id: string
  name: string
  houseIds: string[]
}

export interface GeneratedObjectStructure {
  objectId: string
  sections: GeneratedSection[]
  houses: Record<string, GeneratedHouse>
  entrances: Record<string, GeneratedEntrance>
  floors: Record<string, GeneratedFloor>
  apartments: Record<string, GeneratedApartment>
  zones: Record<string, GeneratedZone>
  territoryOptions: WizardTerritoryOptions
  summary: {
    sections: number
    houses: number
    entrances: number
    floors: number
    apartments: number
    zones: number
    tasks: number
  }
}

export interface PhotoReportItem {
  id: string
  objectId: string
  objectName: string
  apartmentLabel: string
  workTitle: string
  timestamp: string
  photoUrls: string[]
  author: string
}

export interface ClientNotification {
  id: string
  type: 'question' | 'approval' | 'photo' | 'payment'
  title: string
  message: string
  objectId?: string
  read: boolean
  createdAt: string
}

export interface FinanceRecord {
  id: string
  objectId: string
  objectName: string
  type: 'advance' | 'receipt' | 'upcoming'
  title: string
  amount: number
  date: string
  status: 'paid' | 'pending' | 'planned'
}
