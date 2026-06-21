import type {
  ConstructionObject,
  House,
  Entrance,
  Floor,
  Apartment,
  WorkItem,
} from '@types'

// === ДЕМО-ДАННЫЕ: объекты со структурой (дом → подъезд → этаж → квартира) ===

export const DEMO_HIERARCHY_OBJECTS: ConstructionObject[] = [
  {
    id: 'obj-h1',
    block_id: 'block-1',
    name: 'Секция А',
    address: 'Корпус 1, ул. Солнечная, 15',
    client_name: 'ООО «Солнечный Девелопмент»',
    client_phone: '+7 (495) 111-22-33',
    foreman_id: 'foreman-1',
    status: 'active',
    progress: 45,
    total_houses: 2,
    completed_houses: 0,
    budget_total: 8500000,
    budget_spent: 3200000,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'obj-h2',
    block_id: 'block-1',
    name: 'Секция Б',
    address: 'Корпус 2, ул. Солнечная, 17',
    client_name: 'ООО «Солнечный Девелопмент»',
    client_phone: '+7 (495) 111-22-33',
    foreman_id: 'foreman-1',
    status: 'active',
    progress: 28,
    total_houses: 1,
    completed_houses: 0,
    budget_total: 5200000,
    budget_spent: 1100000,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'obj-h3',
    block_id: 'block-2',
    name: 'Секция 1',
    address: 'мкр. Заречье, 8, корп. 1',
    client_name: 'ЗАО «Заречье Строй»',
    client_phone: '+7 (495) 444-55-66',
    foreman_id: 'foreman-1',
    status: 'active',
    progress: 62,
    total_houses: 1,
    completed_houses: 0,
    budget_total: 12000000,
    budget_spent: 7400000,
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
]

const DEMO_HOUSES: House[] = [
  {
    id: 'house-1',
    object_id: 'obj-h1',
    block_id: 'block-1',
    name: 'Дом 1',
    address: 'Корпус 1',
    total_entrances: 2,
    completed_entrances: 0,
    total_floors: 17,
    progress: 52,
    status: 'active',
    created_at: '2026-01-20T00:00:00Z',
  },
  {
    id: 'house-2',
    object_id: 'obj-h1',
    block_id: 'block-1',
    name: 'Дом 2',
    address: 'Корпус 1, пристройка',
    total_entrances: 1,
    completed_entrances: 0,
    total_floors: 9,
    progress: 31,
    status: 'active',
    created_at: '2026-02-01T00:00:00Z',
  },
]

const DEMO_ENTRANCES: Entrance[] = [
  {
    id: 'ent-1',
    house_id: 'house-1',
    object_id: 'obj-h1',
    block_id: 'block-1',
    number: 1,
    total_floors: 17,
    total_apartments: 68,
    completed_apartments: 12,
    progress: 18,
    status: 'active',
    created_at: '2026-01-25T00:00:00Z',
  },
  {
    id: 'ent-2',
    house_id: 'house-1',
    object_id: 'obj-h1',
    block_id: 'block-1',
    number: 2,
    total_floors: 17,
    total_apartments: 68,
    completed_apartments: 8,
    progress: 12,
    status: 'active',
    created_at: '2026-01-25T00:00:00Z',
  },
]

const DEMO_FLOORS: Floor[] = [
  {
    id: 'floor-1',
    entrance_id: 'ent-1',
    house_id: 'house-1',
    object_id: 'obj-h1',
    block_id: 'block-1',
    number: 3,
    total_apartments: 4,
    completed_apartments: 1,
    progress: 25,
    status: 'active',
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'floor-2',
    entrance_id: 'ent-1',
    house_id: 'house-1',
    object_id: 'obj-h1',
    block_id: 'block-1',
    number: 4,
    total_apartments: 4,
    completed_apartments: 0,
    progress: 0,
    status: 'new',
    created_at: '2026-02-01T00:00:00Z',
  },
]

const DEMO_APARTMENTS: Apartment[] = [
  {
    id: 'apt-1',
    floor_id: 'floor-1',
    entrance_id: 'ent-1',
    house_id: 'house-1',
    object_id: 'obj-h1',
    block_id: 'block-1',
    number: 'кв. 12',
    total_works: 8,
    completed_works: 3,
    progress: 38,
    status: 'active',
    budget_total: 450000,
    budget_spent: 187500,
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'apt-2',
    floor_id: 'floor-1',
    entrance_id: 'ent-1',
    house_id: 'house-1',
    object_id: 'obj-h1',
    block_id: 'block-1',
    number: 'кв. 14',
    total_works: 8,
    completed_works: 1,
    progress: 12,
    status: 'active',
    budget_total: 380000,
    budget_spent: 45000,
    created_at: '2026-03-01T00:00:00Z',
  },
]

const DEMO_WORKS: WorkItem[] = [
  {
    id: 'work-1',
    apartment_id: 'apt-1',
    floor_id: 'floor-1',
    entrance_id: 'ent-1',
    house_id: 'house-1',
    object_id: 'obj-h1',
    block_id: 'block-1',
    type: 'electrical',
    name: 'Электрика (разводка)',
    status: 'done',
    priority: 'high',
    estimated_hours: 16,
    actual_hours: 14,
    photos: [],
    materials: [],
    created_by: 'foreman-1',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-15T00:00:00Z',
  },
  {
    id: 'work-2',
    apartment_id: 'apt-1',
    floor_id: 'floor-1',
    entrance_id: 'ent-1',
    house_id: 'house-1',
    object_id: 'obj-h1',
    block_id: 'block-1',
    type: 'plumbing',
    name: 'Сантехника (стояки)',
    status: 'in_progress',
    priority: 'urgent',
    estimated_hours: 12,
    actual_hours: 6,
    photos: [],
    materials: [],
    created_by: 'foreman-1',
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'work-3',
    apartment_id: 'apt-1',
    floor_id: 'floor-1',
    entrance_id: 'ent-1',
    house_id: 'house-1',
    object_id: 'obj-h1',
    block_id: 'block-1',
    type: 'plaster',
    name: 'Штукатурка стен',
    status: 'pending',
    priority: 'medium',
    estimated_hours: 24,
    photos: [],
    materials: [],
    created_by: 'foreman-1',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
  },
  {
    id: 'work-4',
    apartment_id: 'apt-1',
    floor_id: 'floor-1',
    entrance_id: 'ent-1',
    house_id: 'house-1',
    object_id: 'obj-h1',
    block_id: 'block-1',
    type: 'tiles',
    name: 'Укладка плитки (ванная)',
    status: 'pending',
    priority: 'low',
    estimated_hours: 8,
    photos: [],
    materials: [],
    created_by: 'foreman-1',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
  },
]

export const WORK_TYPE_LABELS: Record<WorkItem['type'], string> = {
  walls: 'Стены',
  plaster: 'Штукатурка',
  electrical: 'Электрика',
  plumbing: 'Сантехника',
  screed: 'Стяжка',
  windows: 'Окна',
  ceiling: 'Потолки',
  paint: 'Покраска',
  doors: 'Двери',
  floor: 'Полы',
  tiles: 'Плитка',
  heating: 'Отопление',
  ventilation: 'Вентиляция',
  facade: 'Фасад',
  roof: 'Кровля',
  insulation: 'Утепление',
}

export async function getHouses(objectId: string): Promise<House[]> {
  return DEMO_HOUSES.filter((h) => h.object_id === objectId)
}

export async function getHouseById(id: string): Promise<House | null> {
  return DEMO_HOUSES.find((h) => h.id === id) || null
}

export async function getEntrances(houseId: string): Promise<Entrance[]> {
  return DEMO_ENTRANCES.filter((e) => e.house_id === houseId).sort((a, b) => a.number - b.number)
}

export async function getEntranceById(id: string): Promise<Entrance | null> {
  return DEMO_ENTRANCES.find((e) => e.id === id) || null
}

export async function getFloors(entranceId: string): Promise<Floor[]> {
  return DEMO_FLOORS.filter((f) => f.entrance_id === entranceId).sort((a, b) => a.number - b.number)
}

export async function getFloorById(id: string): Promise<Floor | null> {
  return DEMO_FLOORS.find((f) => f.id === id) || null
}

export async function getApartments(floorId: string): Promise<Apartment[]> {
  return DEMO_APARTMENTS.filter((a) => a.floor_id === floorId)
}

export async function getApartmentById(id: string): Promise<Apartment | null> {
  return DEMO_APARTMENTS.find((a) => a.id === id) || null
}

export async function getWorks(apartmentId: string): Promise<WorkItem[]> {
  return DEMO_WORKS.filter((w) => w.apartment_id === apartmentId)
}
