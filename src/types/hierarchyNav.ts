export type BuiltNavLevel = 'sections' | 'territory' | 'houses' | 'entrances' | 'floors' | 'apartments' | 'works' | 'subWorks' | 'basement'
export type ImportedNavLevel = 'sections' | 'houses' | 'entrances' | 'floors' | 'apartments' | 'tasks' | 'subWorks'

export interface BuiltHierarchyNav {
  kind: 'built'
  level: BuiltNavLevel
  sectionId: string
  houseId: string
  entranceId: string
  floorId: string
  apartmentId: string | null
  /** Зона (коридор, лестница, фасад и т.д.) */
  zoneId: string | null
  /** Задача вида работ при просмотре под-работ */
  workTaskId: string | null
}
export interface ImportedHierarchyNav {
  kind: 'imported'
  level: ImportedNavLevel
  section: string
  house: string
  entrance: string
  floor: string
  apt: string
  workTaskId: string | null
}
export type HierarchyNavState = BuiltHierarchyNav | ImportedHierarchyNav
