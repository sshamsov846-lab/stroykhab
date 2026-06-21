import type { ConstructionObject, TaskStatus, WorkType } from '@types'
import {
  DEMO_HIERARCHY_OBJECTS,
  getHouses,
  getEntrances,
  getFloors,
  getApartments,
  getWorks,
  WORK_TYPE_LABELS,
} from '@api/hierarchy'
import { getObjectById } from '@api/supabase'
import { getOrganizationsForObject, buildWorkSectionsFromOrganizations } from '@store/objectStore'

export type FloorKind = 'basement' | 'regular' | 'roof'

export interface ClientOrganization {
  id: string
  name: string
  specialty: string
  phone?: string
  contract_date?: string
  /** Привязка к зарегистрированной организации */
  contractorId?: string
}

export interface ApartmentLayout {
  rooms: number
  kitchen: boolean
  bathroom: boolean
  shower: boolean
  balcony: boolean
  dressing_room: boolean
  hallway?: boolean
  storage?: boolean
}

export interface ClientMedia {
  id: string
  type: 'photo' | 'video'
  url: string
  thumbnail?: string
  label: 'before' | 'after' | 'progress' | 'defect'
  caption?: string
}

export interface ClientWorkTask {
  id: string
  title: string
  status: TaskStatus
  done_note?: string
  remaining_note?: string
  media: ClientMedia[]
}

export interface ClientWorkSection {
  id: string
  type: WorkType
  organization: string
  status: TaskStatus
  tasks: ClientWorkTask[]
}

export interface ClientFloor {
  id: string
  kind: FloorKind
  number: number
  label: string
  total_apartments: number
  progress: number
}

export interface ClientApartment {
  id: string
  number: string
  layout: ApartmentLayout
  progress: number
  budget_total: number
  budget_spent: number
}

export interface ClientEntrance {
  id: string
  number: number
  total_floors: number
  progress: number
}

export interface ClientHouse {
  id: string
  name: string
  number: number
  address: string
  total_entrances: number
  progress: number
}

export interface ClientObjectData {
  object: ConstructionObject
  organizations: ClientOrganization[]
  houses: ClientHouse[]
}

const ORGANIZATIONS: Record<string, ClientOrganization[]> = {
  'obj-h1': [
    { id: 'org-1', name: 'ООО «БетонСтрой»', specialty: 'Бетонные работы', phone: '+7 (495) 100-11-11', contract_date: '2026-01-20' },
    { id: 'org-2', name: 'ИП Козлов', specialty: 'Штукатурные работы', phone: '+7 (916) 222-33-44', contract_date: '2026-02-01' },
    { id: 'org-3', name: 'ООО «ЭлектроМонтаж»', specialty: 'Электрика', phone: '+7 (495) 300-55-66', contract_date: '2026-02-15' },
    { id: 'org-4', name: 'ООО «АкваТех»', specialty: 'Сантехника', phone: '+7 (495) 400-77-88', contract_date: '2026-03-01' },
    { id: 'org-5', name: 'ООО «ОкнаПро»', specialty: 'Окна и двери', phone: '+7 (495) 500-99-00', contract_date: '2026-03-10' },
  ],
  default: [
    { id: 'org-d1', name: 'ООО «РемСтрой»', specialty: 'Комплексный ремонт', phone: '+7 (999) 123-45-67', contract_date: '2026-05-01' },
    { id: 'org-d2', name: 'ИП Сидоров', specialty: 'Электрика', phone: '+7 (999) 111-22-33', contract_date: '2026-05-10' },
    { id: 'org-d3', name: 'ООО «СанТехСервис»', specialty: 'Сантехника', phone: '+7 (999) 444-55-66', contract_date: '2026-05-12' },
  ],
}

const APARTMENT_LAYOUTS: Record<string, ApartmentLayout> = {
  'apt-1': { rooms: 3, kitchen: true, bathroom: true, shower: true, balcony: true, dressing_room: true, hallway: true },
  'apt-2': { rooms: 2, kitchen: true, bathroom: true, shower: false, balcony: true, dressing_room: false, hallway: true },
  'apt-simple': { rooms: 3, kitchen: true, bathroom: true, shower: true, balcony: true, dressing_room: false, hallway: true, storage: true },
}

const FLOOR_KINDS: Record<string, FloorKind> = {
  'floor-basement': 'basement',
  'floor-roof': 'roof',
}

function floorLabel(kind: FloorKind, number: number): string {
  if (kind === 'basement') return 'Подвал'
  if (kind === 'roof') return 'Крыша'
  return `Этаж ${number}`
}

function demoMedia(seed: string, label: ClientMedia['label'], type: 'photo' | 'video' = 'photo'): ClientMedia {
  const colors: Record<ClientMedia['label'], string> = {
    before: '#94a3b8',
    after: '#34d399',
    progress: '#60a5fa',
    defect: '#f87171',
  }
  const svg = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="${colors[label]}" width="400" height="300"/><text x="50%" y="50%" fill="white" font-size="18" text-anchor="middle" dy=".3em">${label}</text></svg>`,
  )}`
  return {
    id: `media-${seed}`,
    type,
    url: type === 'photo' ? svg : '#',
    thumbnail: svg,
    label,
    caption: label === 'before' ? 'До работ' : label === 'after' ? 'После работ' : label === 'progress' ? 'В процессе' : 'Замечание',
  }
}

const WORK_SECTIONS_DEMO: Record<string, ClientWorkSection[]> = {
  'apt-1': [
    {
      id: 'sec-concrete',
      type: 'screed',
      organization: 'ООО «БетонСтрой»',
      status: 'done',
      tasks: [
        {
          id: 't1',
          title: 'Стяжка пола',
          status: 'done',
          done_note: 'Стяжка залита, выдержка 28 дней соблюдена',
          media: [demoMedia('screed-before', 'before'), demoMedia('screed-after', 'after')],
        },
      ],
    },
    {
      id: 'sec-electrical',
      type: 'electrical',
      organization: 'ООО «ЭлектроМонтаж»',
      status: 'done',
      tasks: [
        {
          id: 't2',
          title: 'Разводка электрики',
          status: 'done',
          done_note: 'Щиток, розетки, выключатели установлены',
          media: [demoMedia('elec-before', 'before'), demoMedia('elec-after', 'after')],
        },
      ],
    },
    {
      id: 'sec-plumbing',
      type: 'plumbing',
      organization: 'ООО «АкваТех»',
      status: 'in_progress',
      tasks: [
        {
          id: 't3',
          title: 'Стояки ГВС/ХВС',
          status: 'in_progress',
          done_note: 'Стояки заменены, разводка по квартире в работе',
          remaining_note: 'Установка смесителей, подключение унитаза',
          media: [demoMedia('plumb-before', 'before'), demoMedia('plumb-progress', 'progress'), demoMedia('plumb-vid', 'progress', 'video')],
        },
      ],
    },
    {
      id: 'sec-plaster',
      type: 'plaster',
      organization: 'ИП Козлов',
      status: 'pending',
      tasks: [
        {
          id: 't4',
          title: 'Штукатурка стен и потолков',
          status: 'pending',
          remaining_note: 'Ожидает завершения сантехники',
          media: [demoMedia('plaster-before', 'before')],
        },
      ],
    },
    {
      id: 'sec-tiles',
      type: 'tiles',
      organization: 'ИП Козлов',
      status: 'pending',
      tasks: [{ id: 't5', title: 'Плитка в ванной', status: 'pending', remaining_note: 'Не начато', media: [] }],
    },
    {
      id: 'sec-windows',
      type: 'windows',
      organization: 'ООО «ОкнаПро»',
      status: 'review',
      tasks: [
        {
          id: 't6',
          title: 'Установка окон',
          status: 'review',
          done_note: 'Окна установлены, требуется приёмка заказчиком',
          media: [demoMedia('win-before', 'before'), demoMedia('win-after', 'after')],
        },
      ],
    },
    {
      id: 'sec-paint',
      type: 'paint',
      organization: 'ООО «РемСтрой»',
      status: 'rejected',
      tasks: [
        {
          id: 't7',
          title: 'Покраска стен (гостиная)',
          status: 'rejected',
          done_note: 'Покраска выполнена',
          remaining_note: 'Неравномерный тон — требуется переделка',
          media: [demoMedia('paint-defect', 'defect'), demoMedia('paint-vid', 'defect', 'video')],
        },
      ],
    },
  ],
  'apt-simple': [
    {
      id: 'sec-electrical-s',
      type: 'electrical',
      organization: 'ИП Сидоров',
      status: 'done',
      tasks: [{ id: 'ts1', title: 'Электрика', status: 'done', done_note: 'Готово', media: [demoMedia('s-elec', 'after')] }],
    },
    {
      id: 'sec-plumbing-s',
      type: 'plumbing',
      organization: 'ООО «СанТехСервис»',
      status: 'in_progress',
      tasks: [{
        id: 'ts2',
        title: 'Сантехника',
        status: 'in_progress',
        done_note: 'Стояки заменены',
        remaining_note: 'Смесители, унитаз',
        media: [demoMedia('s-plumb', 'progress')],
      }],
    },
    {
      id: 'sec-plaster-s',
      type: 'plaster',
      organization: 'ООО «РемСтрой»',
      status: 'pending',
      tasks: [{ id: 'ts3', title: 'Штукатурка', status: 'pending', remaining_note: 'Не начато', media: [] }],
    },
  ],
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Не начато',
  in_progress: 'В работе',
  review: 'На проверке',
  done: 'Принято',
  rejected: 'Переделка',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-primary-100 text-primary-700',
  review: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

export function layoutTags(layout: ApartmentLayout): string[] {
  const tags: string[] = [`${layout.rooms} комн.`]
  if (layout.kitchen) tags.push('Кухня')
  if (layout.bathroom) tags.push('Туалет')
  if (layout.shower) tags.push('Душевая')
  if (layout.balcony) tags.push('Балкон')
  if (layout.dressing_room) tags.push('Раздевалка')
  if (layout.hallway) tags.push('Прихожая')
  if (layout.storage) tags.push('Кладовая')
  return tags
}

export async function getClientObjectData(objectId: string): Promise<ClientObjectData | null> {
  let object = await getObjectById(objectId)
  if (!object) {
    object = DEMO_HIERARCHY_OBJECTS.find((o) => o.id === objectId) || null
  }
  if (!object) return null

  const housesRaw = await getHouses(objectId)
  let houses: ClientHouse[]

  if (housesRaw.length === 0) {
    houses = [{
      id: `house-simple-${objectId}`,
      name: 'Дом 1',
      number: 1,
      address: object.address,
      total_entrances: 1,
      progress: object.progress ?? 0,
    }]
  } else {
    houses = housesRaw.map((h, i) => ({
      id: h.id,
      name: h.name,
      number: i + 1,
      address: h.address,
      total_entrances: h.total_entrances,
      progress: h.progress,
    }))
  }

  const organizations = getOrganizationsForObject(objectId) || ORGANIZATIONS[objectId] || ORGANIZATIONS.default

  return { object, organizations, houses }
}

export async function getClientEntrances(houseId: string, objectId: string): Promise<ClientEntrance[]> {
  if (houseId.startsWith('house-simple-')) {
    return [{ id: `ent-simple-${objectId}`, number: 1, total_floors: 1, progress: 50 }]
  }
  const entrances = await getEntrances(houseId)
  return entrances.map((e) => ({
    id: e.id,
    number: e.number,
    total_floors: e.total_floors,
    progress: e.progress,
  }))
}

export async function getClientFloors(entranceId: string): Promise<ClientFloor[]> {
  if (entranceId.startsWith('ent-simple-')) {
    return [{
      id: `floor-simple-${entranceId}`,
      kind: 'regular',
      number: 3,
      label: 'Этаж 3',
      total_apartments: 1,
      progress: 42,
    }]
  }

  const floors = await getFloors(entranceId)
  const result: ClientFloor[] = [
    {
      id: 'floor-basement',
      kind: 'basement',
      number: -1,
      label: 'Подвал',
      total_apartments: 2,
      progress: 80,
    },
  ]

  for (const f of floors) {
    const kind = FLOOR_KINDS[f.id] || 'regular'
    result.push({
      id: f.id,
      kind,
      number: f.number,
      label: floorLabel(kind, f.number),
      total_apartments: f.total_apartments,
      progress: f.progress,
    })
  }

  result.push({
    id: 'floor-roof',
    kind: 'roof',
    number: 999,
    label: 'Крыша',
    total_apartments: 0,
    progress: 100,
  })

  return result
}

export async function getClientApartments(floorId: string, entranceId: string): Promise<ClientApartment[]> {
  if (floorId.startsWith('floor-simple-')) {
    const objectId = entranceId.replace('ent-simple-', '')
    const object = await getObjectById(objectId)
    return [{
      id: `apt-simple-${objectId}`,
      number: object?.address.match(/кв\.\s*\d+/)?.[0] || 'кв. 1',
      layout: APARTMENT_LAYOUTS['apt-simple'],
      progress: object?.progress ?? 42,
      budget_total: object?.budget_total ?? 450000,
      budget_spent: object?.budget_spent ?? 187500,
    }]
  }

  if (floorId === 'floor-basement' || floorId === 'floor-roof') {
    return []
  }

  const apartments = await getApartments(floorId)
  return apartments.map((a) => ({
    id: a.id,
    number: a.number,
    layout: APARTMENT_LAYOUTS[a.id] || { rooms: 2, kitchen: true, bathroom: true, shower: true, balcony: false, dressing_room: false },
    progress: a.progress,
    budget_total: a.budget_total,
    budget_spent: a.budget_spent,
  }))
}

export async function getClientWorkSections(apartmentId: string): Promise<ClientWorkSection[]> {
  if (WORK_SECTIONS_DEMO[apartmentId]) {
    return WORK_SECTIONS_DEMO[apartmentId]
  }

  if (apartmentId.startsWith('apt-simple-')) {
    const objectId = apartmentId.replace('apt-simple-', '')
    const orgs = getOrganizationsForObject(objectId)
    if (orgs?.length) {
      return buildWorkSectionsFromOrganizations(orgs)
    }
  }

  const works = await getWorks(apartmentId)
  const byType = new Map<WorkType, ClientWorkSection>()

  for (const w of works) {
    if (!byType.has(w.type)) {
      byType.set(w.type, {
        id: `sec-${w.type}`,
        type: w.type,
        organization: 'Подрядчик',
        status: w.status,
        tasks: [],
      })
    }
    const section = byType.get(w.type)!
    section.tasks.push({
      id: w.id,
      title: w.name,
      status: w.status,
      done_note: w.status === 'done' ? 'Работа выполнена' : undefined,
      remaining_note: w.status === 'pending' ? 'Ожидает начала' : undefined,
      media: w.photos.map((url, i) => ({
        id: `m-${w.id}-${i}`,
        type: 'photo' as const,
        url,
        label: 'progress' as const,
      })),
    })
    if (w.status === 'in_progress' || w.status === 'rejected') section.status = w.status
  }

  return Array.from(byType.values()).map((s) => ({
    ...s,
    organization: ORGANIZATIONS.default.find((o) => o.specialty.includes(WORK_TYPE_LABELS[s.type].slice(0, 4)))?.name || 'Подрядчик',
  }))
}

export { WORK_TYPE_LABELS }
