import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type {
  GeneratedObjectStructure,
  GeneratedApartment,
} from '@/types/objectStructure'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import type { HierarchyNavState } from '@/types/hierarchyNav'

interface ClientPortalState {
  customStructures: Record<string, GeneratedObjectStructure>
  hierarchyNavByObject: Record<string, HierarchyNavState>

  saveCustomStructure: (structure: GeneratedObjectStructure) => void
  getCustomStructure: (objectId: string) => GeneratedObjectStructure | undefined
  setHierarchyNav: (objectId: string, nav: HierarchyNavState) => void
  getHierarchyNav: (objectId: string) => HierarchyNavState | undefined
  updateApartment: (objectId: string, apartmentId: string, patch: Partial<GeneratedApartment>) => void
  resolveApartmentContext: (objectId: string, apartmentId: string) => {
    section: string
    house: string
    entrance: string
    floor: string
  } | null
}

export const useClientPortalStore = create<ClientPortalState>()(
  persist(
    (set, get) => ({
      customStructures: {},
      hierarchyNavByObject: {},

      saveCustomStructure: (structure) => {
        set((s) => ({
          customStructures: { ...s.customStructures, [structure.objectId]: structure },
        }))
      },

      getCustomStructure: (objectId) => get().customStructures[objectId],

      setHierarchyNav: (objectId, nav) => {
        set((s) => ({
          hierarchyNavByObject: { ...s.hierarchyNavByObject, [objectId]: nav },
        }))
      },

      getHierarchyNav: (objectId) => get().hierarchyNavByObject[objectId],

      resolveApartmentContext: (objectId, apartmentId) => {
        const structure = get().customStructures[objectId]
        const apt = structure?.apartments[apartmentId]
        if (!structure || !apt) return null
        const entrance = structure.entrances[apt.entranceId]
        const house = entrance ? structure.houses[entrance.houseId] : undefined
        const section = structure.sections.find((s) => house && s.houseIds.includes(house.id))
        const floor = structure.floors[apt.floorId]
        if (!entrance || !house || !section || !floor) return null
        const floorKey = floor.kind === 'basement' ? '-1' : String(floor.number)
        return {
          section: section.name,
          house: house.name,
          entrance: String(entrance.number),
          floor: floorKey,
        }
      },

      updateApartment: (objectId, apartmentId, patch) => {
        const structure = get().customStructures[objectId]
        const apt = structure?.apartments[apartmentId]
        if (!structure || !apt) return

        const ctx = get().resolveApartmentContext(objectId, apartmentId)
        const oldNumber = apt.number
        const oldTemplate = apt.workTemplate
        const updated: GeneratedApartment = { ...apt, ...patch }

        const nextStructure: GeneratedObjectStructure = {
          ...structure,
          apartments: {
            ...structure.apartments,
            [apartmentId]: updated,
          },
        }
        set((s) => ({
          customStructures: { ...s.customStructures, [objectId]: nextStructure },
        }))

        if (ctx && (patch.number !== undefined || patch.workTemplate !== undefined)) {
          useProjectWorkflowStore.getState().patchApartmentTasks({
            objectId,
            ...ctx,
            oldApartmentNumber: oldNumber,
            newApartmentNumber: updated.number,
            oldWorkTemplate: oldTemplate,
            newWorkTemplate: updated.workTemplate,
          })
        }
      },
    }),
    {
      name: STORAGE_KEYS.CLIENT_PORTAL,
      storage: createJSONStorage(() => createZustandStorage()),
      partialize: (state) => ({
        customStructures: state.customStructures,
        hierarchyNavByObject: state.hierarchyNavByObject,
      }),
    },
  ),
)

export function getCustomStructureForObject(objectId: string) {
  return useClientPortalStore.getState().customStructures[objectId]
}
