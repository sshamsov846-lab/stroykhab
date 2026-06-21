import type { ProjectTask } from '@/types/projectWorkflow'
import type {
  GeneratedApartment,
  GeneratedEntrance,
  GeneratedFloor,
  GeneratedHouse,
  GeneratedObjectStructure,
  GeneratedSection,
} from '@/types/objectStructure'
import { basementZoneKey } from '@/types/objectStructure'

export interface ProgressStats {
  total: number
  done: number
  percent: number
}

export function calcTaskProgress(taskList: ProjectTask[]): ProgressStats {
  const total = taskList.length
  if (total === 0) return { total: 0, done: 0, percent: 0 }
  const done = taskList.filter((t) => t.status === 'done').length
  return { total, done, percent: Math.round((done / total) * 100) }
}

export function progressDotClass(percent: number): string {
  if (percent >= 100) return 'bg-emerald-500'
  if (percent > 0) return 'bg-amber-400'
  return 'bg-gray-300'
}

export function progressBarClass(percent: number): string {
  if (percent >= 100) return 'bg-emerald-500'
  if (percent > 0) return 'bg-amber-400'
  return 'bg-gray-200'
}

export function getTasksForApartment(
  tasks: ProjectTask[],
  apt: GeneratedApartment,
  ctx: { section: string; house: string; entrance: string; floor: string },
): ProjectTask[] {
  return tasks.filter(
    (t) =>
      t.apartmentNumber === apt.number &&
      t.section === ctx.section &&
      t.house === ctx.house &&
      t.entrance === ctx.entrance &&
      t.floor === ctx.floor,
  )
}

export function getTasksForFloor(
  tasks: ProjectTask[],
  structure: GeneratedObjectStructure,
  floor: GeneratedFloor,
  entrance: GeneratedEntrance,
  house: GeneratedHouse,
  section: GeneratedSection,
): ProjectTask[] {
  if (floor.kind === 'basement') {
    const zone = basementZoneKey(entrance.number)
    return tasks.filter(
      (t) =>
        t.section === section.name &&
        t.house === house.name &&
        t.entrance === String(entrance.number) &&
        t.floor === '-1' &&
        t.apartmentNumber === zone,
    )
  }

  const aptNumbers = new Set(
    Object.values(structure.apartments)
      .filter((a) => a.floorId === floor.id)
      .map((a) => a.number),
  )
  const zoneKeys = new Set(
    Object.values(structure.zones ?? {})
      .filter((z) => z.floorId === floor.id)
      .map((z) => z.zoneKey),
  )

  return tasks.filter(
    (t) =>
      t.section === section.name &&
      t.house === house.name &&
      t.entrance === String(entrance.number) &&
      t.floor === String(floor.number) &&
      (aptNumbers.has(t.apartmentNumber) || zoneKeys.has(t.apartmentNumber)),
  )
}

export function findApartmentNav(structure: GeneratedObjectStructure, apartmentId: string) {
  const apt = structure.apartments[apartmentId]
  if (!apt) return null
  const floor = structure.floors[apt.floorId]
  const entrance = structure.entrances[apt.entranceId]
  if (!floor || !entrance) return null
  const house = structure.houses[entrance.houseId]
  if (!house) return null
  const section = structure.sections.find((s) => s.houseIds.includes(house.id))
  if (!section) return null
  return { apt, floor, entrance, house, section }
}
