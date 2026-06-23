import type { WizardSectionDraft, WizardHouseDraft } from '@/types/objectStructure'
import { DEFAULT_HOUSE_ZONE_OPTIONS } from '@/types/buildingZones'
import {
  OBJECT_TYPE_PRESETS,
  workTemplateFromScope,
  type ObjectWizardType,
  type ObjectWorkScopeMode,
} from '@/types/objectWizard'

function newId(p: string): string {
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function baseHouse(index: number, patch: Partial<WizardHouseDraft>): WizardHouseDraft {
  return {
    id: newId('house'),
    name: patch.name ?? `Дом ${index}`,
    entrancesCount: patch.entrancesCount ?? 1,
    floorsPerEntrance: patch.floorsPerEntrance ?? 10,
    apartmentsPerFloor: patch.apartmentsPerFloor ?? 4,
    defaultRooms: patch.defaultRooms ?? 2,
    apartmentArea: patch.apartmentArea ?? 55,
    workTemplate: patch.workTemplate ?? 'rough',
    includeBasement: patch.includeBasement ?? true,
    includeRoof: patch.includeRoof ?? true,
    zoneOptions: patch.zoneOptions ?? { ...DEFAULT_HOUSE_ZONE_OPTIONS },
    structureConfigured: patch.structureConfigured ?? false,
    apartmentsConfigured: patch.apartmentsConfigured ?? false,
  }
}

/** Подгоняет секции/дома и зоны под выбранный тип объекта */
export function buildSectionsForObjectType(
  type: ObjectWizardType,
  workScopeMode: ObjectWorkScopeMode,
): WizardSectionDraft[] {
  const preset = OBJECT_TYPE_PRESETS[type]
  const workTemplate = workScopeMode === 'custom' ? preset.defaultWorkTemplate : workTemplateFromScope(workScopeMode)

  if (type === 'apartment') {
    return [
      {
        id: newId('sec'),
        name: 'Квартира',
        houses: [
          baseHouse(1, {
            name: 'Помещение',
            entrancesCount: 1,
            floorsPerEntrance: 1,
            apartmentsPerFloor: 1,
            defaultRooms: 2,
            apartmentArea: 65,
            workTemplate,
            includeBasement: false,
            includeRoof: false,
            zoneOptions: { ...preset.zoneOptions },
          }),
        ],
      },
    ]
  }

  if (type === 'private_house') {
    return [
      {
        id: newId('sec'),
        name: 'Участок',
        houses: [
          baseHouse(1, {
            name: 'Дом',
            entrancesCount: 1,
            floorsPerEntrance: 2,
            apartmentsPerFloor: 1,
            defaultRooms: 4,
            apartmentArea: 120,
            workTemplate,
            includeBasement: false,
            includeRoof: true,
            zoneOptions: { ...preset.zoneOptions },
          }),
        ],
      },
    ]
  }

  if (type === 'commercial') {
    return [
      {
        id: newId('sec'),
        name: 'Помещение',
        houses: [
          baseHouse(1, {
            name: 'Здание',
            entrancesCount: 1,
            floorsPerEntrance: 3,
            apartmentsPerFloor: 2,
            defaultRooms: 0,
            apartmentArea: 80,
            workTemplate,
            includeBasement: false,
            includeRoof: false,
            zoneOptions: { ...preset.zoneOptions },
          }),
        ],
      },
    ]
  }

  if (type === 'industrial') {
    return [
      {
        id: newId('sec'),
        name: 'Площадка',
        houses: [
          baseHouse(1, {
            name: 'Корпус',
            entrancesCount: 1,
            floorsPerEntrance: 1,
            apartmentsPerFloor: 4,
            defaultRooms: 0,
            apartmentArea: 200,
            workTemplate,
            includeBasement: false,
            includeRoof: true,
            zoneOptions: { ...preset.zoneOptions },
          }),
        ],
      },
    ]
  }

  return [
    {
      id: newId('sec'),
      name: 'Секция А',
      houses: [
        baseHouse(1, {
          workTemplate,
          zoneOptions: { ...preset.zoneOptions },
        }),
      ],
    },
  ]
}

export function applyWorkTemplateToSections(
  sections: WizardSectionDraft[],
  workScopeMode: ObjectWorkScopeMode,
  objectType: ObjectWizardType,
): WizardSectionDraft[] {
  const preset = OBJECT_TYPE_PRESETS[objectType]
  const tpl =
    workScopeMode === 'custom' ? preset.defaultWorkTemplate : workTemplateFromScope(workScopeMode)
  return sections.map((sec) => ({
    ...sec,
    houses: sec.houses.map((h) => ({ ...h, workTemplate: tpl })),
  }))
}
