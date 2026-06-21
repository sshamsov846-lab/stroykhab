import type { WorkType } from '@types'
import type { SubWorkDefinition, SubWorkState } from '@/types/subWorks'
import { createSubWorkStateFromDef } from '@/types/subWorks'

/** Тип зоны на объекте */
export type ZoneType =
  | 'corridor'
  | 'stairwell'
  | 'elevator'
  | 'facade'
  | 'roof'
  | 'engineering'
  | 'parking'
  | 'playground'
  | 'landscaping'
  | 'underground_parking'

export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  corridor: 'Коридор/холл этажа',
  stairwell: 'Лестница',
  elevator: 'Лифт',
  facade: 'Фасад',
  roof: 'Кровля',
  engineering: 'Инженерные системы',
  parking: 'Парковка',
  playground: 'Детская площадка',
  landscaping: 'Благоустройство',
  underground_parking: 'Подземный паркинг',
}

export interface ZoneWorkDefinition {
  id: string
  label: string
  workType: WorkType
  description?: string
  subWorks?: SubWorkDefinition[]
}

export const ZONE_WORK_CATALOG: Record<ZoneType, ZoneWorkDefinition[]> = {
  corridor: [
    { id: 'plaster-walls', label: 'Штукатурка стен', workType: 'plaster', subWorks: [{ id: 'walls', label: 'Стены' }, { id: 'corners', label: 'Углы/маяки' }] },
    { id: 'screed-floor', label: 'Стяжка пола', workType: 'screed', subWorks: [{ id: 'pour', label: 'Заливка стяжки' }, { id: 'beacons', label: 'Маяки' }] },
    { id: 'paint', label: 'Покраска', workType: 'paint', subWorks: [{ id: 'walls', label: 'Стены' }, { id: 'ceiling', label: 'Потолок' }] },
    { id: 'lighting', label: 'Освещение', workType: 'electrical', subWorks: [{ id: 'lighting', label: 'Светильники' }] },
    { id: 'electrical', label: 'Электрика', workType: 'electrical', subWorks: [{ id: 'cabling', label: 'Прокладка кабеля' }, { id: 'sockets', label: 'Розетки' }, { id: 'panel', label: 'Щит этажный' }] },
    { id: 'fire-alarm', label: 'Пожарная сигнализация', workType: 'electrical', subWorks: [{ id: 'sensors', label: 'Датчики' }, { id: 'panel', label: 'Пульт' }] },
    { id: 'doors', label: 'Двери', workType: 'doors', subWorks: [{ id: 'apt-doors', label: 'Входные в квартиры' }, { id: 'tech-doors', label: 'Технические' }] },
    { id: 'flooring', label: 'Напольное покрытие', workType: 'tiles', subWorks: [{ id: 'tile', label: 'Плитка/керамогранит' }] },
  ],
  stairwell: [
    { id: 'steps', label: 'Ступени/марши', workType: 'screed', subWorks: [{ id: 'steps', label: 'Ступени' }, { id: 'landings', label: 'Площадки' }] },
    { id: 'railings', label: 'Перила/ограждения', workType: 'doors', subWorks: [{ id: 'railings', label: 'Монтаж перил' }] },
    { id: 'finish', label: 'Покраска/штукатурка', workType: 'plaster', subWorks: [{ id: 'walls', label: 'Стены' }, { id: 'paint', label: 'Покраска' }] },
    { id: 'lighting', label: 'Освещение', workType: 'electrical', subWorks: [{ id: 'lighting', label: 'Освещение лестницы' }] },
    { id: 'windows', label: 'Окна на лестнице', workType: 'windows', subWorks: [{ id: 'install', label: 'Установка окон' }] },
  ],
  elevator: [
    { id: 'shaft', label: 'Шахта лифта', workType: 'walls', subWorks: [{ id: 'shaft', label: 'Шахта' }] },
    { id: 'install', label: 'Монтаж лифта', workType: 'electrical', subWorks: [{ id: 'cabin', label: 'Кабина' }] },
    { id: 'hall', label: 'Отделка лифтового холла', workType: 'plaster', subWorks: [{ id: 'walls', label: 'Отделка холла' }] },
    { id: 'doors', label: 'Двери лифта', workType: 'doors', subWorks: [{ id: 'doors', label: 'Двери шахты' }] },
  ],
  facade: [
    {
      id: 'insulation',
      label: 'Утепление',
      workType: 'insulation',
      subWorks: [{
        id: 'insulation',
        label: 'Утеплитель',
        isHiddenWork: true,
        hiddenCoveredBy: 'plaster',
      }],
    },
    { id: 'plaster', label: 'Штукатурка фасада', workType: 'plaster', subWorks: [{ id: 'walls', label: 'Штукатурка' }] },
    { id: 'cladding', label: 'Покраска/облицовка', workType: 'paint', subWorks: [{ id: 'paint', label: 'Покраска' }] },
    { id: 'vent-facade', label: 'Вентилируемый фасад', workType: 'facade', subWorks: [{ id: 'panels', label: 'Панели' }] },
    { id: 'windows', label: 'Окна (с улицы)', workType: 'windows', subWorks: [{ id: 'install', label: 'Монтаж окон' }] },
    { id: 'balconies', label: 'Балконы/лоджии', workType: 'facade', subWorks: [{ id: 'balconies', label: 'Балконы' }] },
    { id: 'canopies', label: 'Козырьки над входом', workType: 'facade', subWorks: [{ id: 'canopies', label: 'Козырьки' }] },
    { id: 'drainage', label: 'Водосточная система', workType: 'plumbing', subWorks: [{ id: 'gutters', label: 'Водосток' }] },
  ],
  roof: [
    { id: 'waterproofing', label: 'Гидроизоляция', workType: 'roof', subWorks: [{ id: 'waterproofing', label: 'Гидроизоляция' }] },
    {
      id: 'insulation',
      label: 'Утепление',
      workType: 'insulation',
      subWorks: [{
        id: 'insulation',
        label: 'Утепление кровли',
        isHiddenWork: true,
        hiddenCoveredBy: 'paint',
      }],
    },
    { id: 'covering', label: 'Кровельное покрытие', workType: 'roof', subWorks: [{ id: 'covering', label: 'Покрытие' }] },
    { id: 'parapets', label: 'Парапеты', workType: 'roof', subWorks: [{ id: 'parapets', label: 'Парапеты' }] },
    { id: 'vents', label: 'Вентвыходы', workType: 'ventilation', subWorks: [{ id: 'vents', label: 'Вентвыходы' }] },
    { id: 'drainage', label: 'Водосток', workType: 'plumbing', subWorks: [{ id: 'drainage', label: 'Водосток' }] },
  ],
  engineering: [
    { id: 'pump-room', label: 'Насосная/водомерный узел', workType: 'plumbing', subWorks: [{ id: 'pumps', label: 'Насосы' }] },
    { id: 'itp', label: 'ИТП (теплоузел)', workType: 'heating', subWorks: [{ id: 'itp', label: 'Теплоузел' }] },
    { id: 'electrical-room', label: 'Электрощитовая', workType: 'electrical', subWorks: [{ id: 'panel', label: 'Щиты' }] },
    { id: 'vent-chambers', label: 'Вентиляционные камеры', workType: 'ventilation', subWorks: [{ id: 'chambers', label: 'Камеры' }] },
    { id: 'fire-pump', label: 'Пожарная насосная', workType: 'plumbing', subWorks: [{ id: 'pumps', label: 'Насосы' }] },
    { id: 'low-voltage', label: 'Слаботочка (серверная)', workType: 'electrical', subWorks: [{ id: 'server', label: 'Серверная' }] },
  ],
  parking: [
    { id: 'marking', label: 'Разметка', workType: 'floor', subWorks: [{ id: 'marking', label: 'Разметка' }] },
    { id: 'asphalt', label: 'Асфальт/покрытие', workType: 'screed', subWorks: [{ id: 'surface', label: 'Покрытие' }] },
    { id: 'curbs', label: 'Бордюры', workType: 'screed', subWorks: [{ id: 'curbs', label: 'Бордюры' }] },
    { id: 'lighting', label: 'Освещение', workType: 'electrical', subWorks: [{ id: 'lighting', label: 'Освещение' }] },
  ],
  playground: [
    { id: 'surface', label: 'Покрытие (резина/песок)', workType: 'floor', subWorks: [{ id: 'surface', label: 'Покрытие' }] },
    { id: 'equipment', label: 'Установка оборудования', workType: 'walls', subWorks: [{ id: 'equipment', label: 'Оборудование' }] },
    { id: 'fence', label: 'Ограждение', workType: 'facade', subWorks: [{ id: 'fence', label: 'Ограждение' }] },
  ],
  landscaping: [
    { id: 'greenery', label: 'Озеленение/газон', workType: 'floor', subWorks: [{ id: 'lawn', label: 'Газон' }] },
    { id: 'paths', label: 'Тротуары/дорожки', workType: 'screed', subWorks: [{ id: 'paths', label: 'Дорожки' }] },
    { id: 'benches', label: 'Лавочки/урны', workType: 'walls', subWorks: [{ id: 'benches', label: 'Малые формы' }] },
    { id: 'lighting', label: 'Освещение двора', workType: 'electrical', subWorks: [{ id: 'lighting', label: 'Освещение' }] },
    { id: 'fence', label: 'Ограждение территории', workType: 'facade', subWorks: [{ id: 'fence', label: 'Ограждение' }] },
  ],
  underground_parking: [
    { id: 'screed', label: 'Стяжка пола', workType: 'screed', subWorks: [{ id: 'pour', label: 'Стяжка' }] },
    { id: 'marking', label: 'Разметка машиномест', workType: 'floor', subWorks: [{ id: 'marking', label: 'Разметка' }] },
    { id: 'ventilation', label: 'Вентиляция', workType: 'ventilation', subWorks: [{ id: 'vents', label: 'Вентиляция' }] },
    { id: 'lighting', label: 'Освещение', workType: 'electrical', subWorks: [{ id: 'lighting', label: 'Освещение' }] },
    { id: 'fire', label: 'Пожаротушение', workType: 'plumbing', subWorks: [{ id: 'sprinklers', label: 'Спринклеры' }] },
    { id: 'gates', label: 'Ворота/въезд', workType: 'doors', subWorks: [{ id: 'gates', label: 'Ворота' }] },
    {
      id: 'waterproofing',
      label: 'Гидроизоляция',
      workType: 'screed',
      subWorks: [{
        id: 'waterproofing',
        label: 'Гидроизоляция',
        isHiddenWork: true,
        hiddenCoveredBy: 'screed',
      }],
    },
  ],
}

export interface WizardHouseZoneOptions {
  corridors: boolean
  stairwellsElevators: boolean
  facade: boolean
  roofZone: boolean
  engineering: boolean
}

export interface WizardTerritoryOptions {
  parking: boolean
  playground: boolean
  landscaping: boolean
  undergroundParking: boolean
}

export const DEFAULT_HOUSE_ZONE_OPTIONS: WizardHouseZoneOptions = {
  corridors: true,
  stairwellsElevators: true,
  facade: false,
  roofZone: false,
  engineering: false,
}

export const DEFAULT_TERRITORY_OPTIONS: WizardTerritoryOptions = {
  parking: false,
  playground: false,
  landscaping: false,
  undergroundParking: false,
}

export function corridorZoneKey(entranceNumber: number, floorNumber: number): string {
  return `коридор-п${entranceNumber}-эт${floorNumber}`
}

export function stairwellZoneKey(entranceNumber: number): string {
  return `лестница-п${entranceNumber}`
}

export function elevatorZoneKey(entranceNumber: number): string {
  return `лифт-п${entranceNumber}`
}

export function facadeZoneKey(houseName: string): string {
  return `фасад-${houseName.replace(/\s+/g, '-')}`
}

export function roofZoneKey(houseName: string): string {
  return `кровля-${houseName.replace(/\s+/g, '-')}`
}

export function engineeringZoneKey(houseName: string): string {
  return `инж-системы-${houseName.replace(/\s+/g, '-')}`
}

export const TERRITORY_ZONE_KEYS: Record<
  'parking' | 'playground' | 'landscaping' | 'underground_parking',
  string
> = {
  parking: 'парковка',
  playground: 'детская-площадка',
  landscaping: 'благоустройство',
  underground_parking: 'паркинг-подземный',
}

export function createSubWorksForZoneCategory(zoneType: ZoneType, categoryId: string): SubWorkState[] {
  const cat = ZONE_WORK_CATALOG[zoneType]?.find((c) => c.id === categoryId)
  if (!cat) return []
  const defs = cat.subWorks?.length ? cat.subWorks : [{ id: 'main', label: cat.label }]
  return defs.map(createSubWorkStateFromDef)
}

export function zoneCategoryLabel(zoneType: ZoneType, categoryId: string): string {
  return ZONE_WORK_CATALOG[zoneType]?.find((c) => c.id === categoryId)?.label ?? categoryId
}
