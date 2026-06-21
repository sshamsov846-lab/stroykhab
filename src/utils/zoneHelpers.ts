import type { ProjectTask } from '@/types/projectWorkflow'
import type { GeneratedObjectStructure, GeneratedZone } from '@/types/objectStructure'
import type { ZoneType } from '@/types/buildingZones'
import { zoneCategoryLabel } from '@/types/buildingZones'

export function getTerritoryZones(structure: GeneratedObjectStructure): GeneratedZone[] {
  return Object.values(structure.zones ?? {}).filter((z) =>
    ['parking', 'playground', 'landscaping', 'underground_parking'].includes(z.zoneType),
  )
}

export function getZonesOnFloor(structure: GeneratedObjectStructure, floorId: string): GeneratedZone[] {
  return Object.values(structure.zones ?? {}).filter((z) => z.floorId === floorId && z.zoneType === 'corridor')
}

export function getZonesOnEntrance(structure: GeneratedObjectStructure, entranceId: string): GeneratedZone[] {
  return Object.values(structure.zones ?? {}).filter(
    (z) => z.entranceId === entranceId && (z.zoneType === 'stairwell' || z.zoneType === 'elevator'),
  )
}

export function getZonesOnHouse(structure: GeneratedObjectStructure, houseId: string): GeneratedZone[] {
  return Object.values(structure.zones ?? {}).filter(
    (z) => z.houseId === houseId && ['facade', 'roof', 'engineering'].includes(z.zoneType),
  )
}

export function getTasksForZone(
  tasks: ProjectTask[],
  zone: GeneratedZone,
  ctx: { section: string; house: string },
): ProjectTask[] {
  return tasks.filter((t) => {
    if (t.apartmentNumber !== zone.zoneKey) return false
    if (t.section !== ctx.section) return false
    if (['parking', 'playground', 'landscaping', 'underground_parking'].includes(zone.zoneType)) {
      return t.house === 'Территория ЖК'
    }
    return t.house === ctx.house
  })
}

export function zoneWorkLabel(task: ProjectTask): string {
  if (task.zoneType && task.categoryId) {
    return zoneCategoryLabel(task.zoneType, task.categoryId)
  }
  return task.title
}

export function isZoneTask(task: ProjectTask): boolean {
  return !!task.zoneType && !!task.categoryId
}

export function zoneTypeIcon(zoneType: ZoneType): string {
  const icons: Partial<Record<ZoneType, string>> = {
    corridor: '🚪',
    stairwell: '🪜',
    elevator: '🛗',
    facade: '🏢',
    roof: '🏠',
    engineering: '⚙️',
    parking: '🅿️',
    playground: '🛝',
    landscaping: '🌳',
    underground_parking: '🚗',
  }
  return icons[zoneType] ?? '📍'
}

import { calcTaskProgressWithSubWorks } from '@utils/subWorkProgress'

export function zoneProgress(tasks: ProjectTask[], zone: GeneratedZone, ctx: { section: string; house: string }) {
  const list = getTasksForZone(tasks, zone, ctx)
  return calcTaskProgressWithSubWorks(list).percent
}

export function zoneParentLevel(zone: GeneratedZone): import('@/types/hierarchyNav').BuiltNavLevel {
  if (['parking', 'playground', 'landscaping', 'underground_parking'].includes(zone.zoneType)) {
    return 'territory'
  }
  if (zone.zoneType === 'corridor') return 'apartments'
  if (zone.zoneType === 'stairwell' || zone.zoneType === 'elevator') return 'floors'
  return 'entrances'
}

export function zoneNavContext(
  structure: GeneratedObjectStructure,
  zone: GeneratedZone,
): { section: string; house: string } | null {
  const section = structure.sections.find((s) => s.id === zone.sectionId)
  if (!section) return null
  if (['parking', 'playground', 'landscaping', 'underground_parking'].includes(zone.zoneType)) {
    return { section: section.name, house: 'Территория ЖК' }
  }
  const house = zone.houseId ? structure.houses[zone.houseId] : undefined
  if (!house) return null
  return { section: section.name, house: house.name }
}
