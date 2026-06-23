import type { ImportRow } from '@/types/projectWorkflow'
import type { ExcelApartmentRow } from '@/types/projectExcel'
import type {
  GeneratedObjectStructure,
  GeneratedZone,
  WizardSectionDraft,
  WizardApartmentsStep,
  WizardHouseDraft,
} from '@/types/objectStructure'
import { WORK_TEMPLATES, BASEMENT_WORK_TYPES, basementZoneKey } from '@/types/objectStructure'
import {
  ZONE_WORK_CATALOG,
  ZONE_TYPE_LABELS,
  corridorZoneKey,
  stairwellZoneKey,
  elevatorZoneKey,
  facadeZoneKey,
  roofZoneKey,
  engineeringZoneKey,
  TERRITORY_ZONE_KEYS,
  createSubWorksForZoneCategory,
  type ZoneType,
  type WizardTerritoryOptions,
} from '@/types/buildingZones'

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function addZone(
  structure: GeneratedObjectStructure,
  importRows: ImportRow[],
  params: {
    zoneType: ZoneType
    label: string
    zoneKey: string
    sectionId: string
    sectionName: string
    houseName: string
    entrance: string
    floor: string
    houseId?: string
    entranceId?: string
    floorId?: string
  },
) {
  const zoneId = uid('zone')
  const zone: GeneratedZone = {
    id: zoneId,
    zoneType: params.zoneType,
    label: params.label,
    zoneKey: params.zoneKey,
    sectionId: params.sectionId,
    houseId: params.houseId,
    entranceId: params.entranceId,
    floorId: params.floorId,
  }
  structure.zones[zoneId] = zone

  for (const work of ZONE_WORK_CATALOG[params.zoneType]) {
    importRows.push({
      section: params.sectionName,
      house: params.houseName,
      entrance: params.entrance,
      floor: params.floor,
      apartmentNumber: params.zoneKey,
      taskType: work.workType,
      categoryId: work.id,
      zoneType: params.zoneType,
    })
  }
}

function generateHouseZones(
  structure: GeneratedObjectStructure,
  importRows: ImportRow[],
  section: { id: string; name: string },
  houseDraft: WizardHouseDraft,
  houseId: string,
  entranceId: string,
  entranceNum: number,
  floorId: string | undefined,
  floorNum: number | undefined,
) {
  const opts = houseDraft.zoneOptions
  if (!opts) return

  if (opts.corridors && floorNum != null && floorId) {
    addZone(structure, importRows, {
      zoneType: 'corridor',
      label: `${ZONE_TYPE_LABELS.corridor} · эт. ${floorNum}`,
      zoneKey: corridorZoneKey(entranceNum, floorNum),
      sectionId: section.id,
      sectionName: section.name,
      houseName: houseDraft.name,
      entrance: String(entranceNum),
      floor: String(floorNum),
      houseId,
      entranceId,
      floorId,
    })
  }

  if (opts.stairwellsElevators) {
    addZone(structure, importRows, {
      zoneType: 'stairwell',
      label: `${ZONE_TYPE_LABELS.stairwell} · под. ${entranceNum}`,
      zoneKey: stairwellZoneKey(entranceNum),
      sectionId: section.id,
      sectionName: section.name,
      houseName: houseDraft.name,
      entrance: String(entranceNum),
      floor: '0',
      houseId,
      entranceId,
    })
    addZone(structure, importRows, {
      zoneType: 'elevator',
      label: `${ZONE_TYPE_LABELS.elevator} · под. ${entranceNum}`,
      zoneKey: elevatorZoneKey(entranceNum),
      sectionId: section.id,
      sectionName: section.name,
      houseName: houseDraft.name,
      entrance: String(entranceNum),
      floor: '0',
      houseId,
      entranceId,
    })
  }
}

function generateHouseLevelZones(
  structure: GeneratedObjectStructure,
  importRows: ImportRow[],
  section: { id: string; name: string },
  houseDraft: WizardHouseDraft,
  houseId: string,
  entranceNum: number,
) {
  const opts = houseDraft.zoneOptions
  if (!opts) return

  if (opts.facade) {
    addZone(structure, importRows, {
      zoneType: 'facade',
      label: ZONE_TYPE_LABELS.facade,
      zoneKey: facadeZoneKey(houseDraft.name),
      sectionId: section.id,
      sectionName: section.name,
      houseName: houseDraft.name,
      entrance: String(entranceNum),
      floor: '0',
      houseId,
    })
  }
  if (opts.roofZone) {
    addZone(structure, importRows, {
      zoneType: 'roof',
      label: ZONE_TYPE_LABELS.roof,
      zoneKey: roofZoneKey(houseDraft.name),
      sectionId: section.id,
      sectionName: section.name,
      houseName: houseDraft.name,
      entrance: String(entranceNum),
      floor: '999',
      houseId,
    })
  }
  if (opts.engineering) {
    addZone(structure, importRows, {
      zoneType: 'engineering',
      label: ZONE_TYPE_LABELS.engineering,
      zoneKey: engineeringZoneKey(houseDraft.name),
      sectionId: section.id,
      sectionName: section.name,
      houseName: houseDraft.name,
      entrance: String(entranceNum),
      floor: '-1',
      houseId,
    })
  }
}

function generateTerritoryZones(
  structure: GeneratedObjectStructure,
  importRows: ImportRow[],
  section: { id: string; name: string },
  territoryOptions: WizardTerritoryOptions,
) {
  const territoryTypes: Array<{ key: keyof WizardTerritoryOptions; zoneType: ZoneType }> = [
    { key: 'parking', zoneType: 'parking' },
    { key: 'playground', zoneType: 'playground' },
    { key: 'landscaping', zoneType: 'landscaping' },
    { key: 'undergroundParking', zoneType: 'underground_parking' },
  ]

  for (const { key, zoneType } of territoryTypes) {
    if (!territoryOptions[key]) continue
    const zoneKey =
      zoneType === 'underground_parking'
        ? TERRITORY_ZONE_KEYS.underground_parking
        : TERRITORY_ZONE_KEYS[zoneType as keyof typeof TERRITORY_ZONE_KEYS]
    addZone(structure, importRows, {
      zoneType,
      label: ZONE_TYPE_LABELS[zoneType],
      zoneKey,
      sectionId: section.id,
      sectionName: section.name,
      houseName: 'Территория ЖК',
      entrance: '0',
      floor: '0',
    })
  }
}

export function generateObjectStructure(
  objectId: string,
  sections: WizardSectionDraft[],
  aptStep: WizardApartmentsStep,
  territoryOptions: WizardTerritoryOptions,
  options?: { excelRows?: ExcelApartmentRow[] },
): { structure: GeneratedObjectStructure; importRows: ImportRow[] } {
  const structure: GeneratedObjectStructure = {
    objectId,
    sections: [],
    houses: {},
    entrances: {},
    floors: {},
    apartments: {},
    zones: {},
    territoryOptions,
    summary: { sections: 0, houses: 0, entrances: 0, floors: 0, apartments: 0, zones: 0, tasks: 0 },
  }

  const importRows: ImportRow[] = []
  let globalAptNum = 1
  const houseZonesGenerated = new Set<string>()
  const excelRows = options?.excelRows ?? []

  for (const section of sections) {
    const sectionId = section.id || uid('sec')
    const houseIds: string[] = []

    if (
      territoryOptions.parking ||
      territoryOptions.playground ||
      territoryOptions.landscaping ||
      territoryOptions.undergroundParking
    ) {
      generateTerritoryZones(structure, importRows, { id: sectionId, name: section.name }, territoryOptions)
    }

    for (const houseDraft of section.houses) {
      const houseId = houseDraft.id || uid('house')
      const entranceIds: string[] = []
      const houseWorkTypes = WORK_TEMPLATES[houseDraft.workTemplate ?? aptStep.workTemplate].types
      const entranceZonesDone = new Set<number>()

      if (excelRows.length > 0) {
        const byEntrance = new Map<number, ExcelApartmentRow[]>()
        for (const row of excelRows) {
          const list = byEntrance.get(row.entrance) ?? []
          list.push(row)
          byEntrance.set(row.entrance, list)
        }

        for (const entranceNum of [...byEntrance.keys()].sort((a, b) => a - b)) {
          const entranceRows = byEntrance.get(entranceNum)!
          const entranceId = uid('ent')
          entranceIds.push(entranceId)
          structure.entrances[entranceId] = { id: entranceId, houseId, number: entranceNum }

          if (!entranceZonesDone.has(entranceNum)) {
            if (houseDraft.zoneOptions?.stairwellsElevators) {
              generateHouseZones(
                structure,
                importRows,
                { id: sectionId, name: section.name },
                houseDraft,
                houseId,
                entranceId,
                entranceNum,
                undefined,
                undefined,
              )
            }
            entranceZonesDone.add(entranceNum)
          }

          const floorNums = [...new Set(entranceRows.map((r) => r.floor))].sort((a, b) => a - b)
          for (const floorNum of floorNums) {
            const floorId = uid('floor')
            structure.floors[floorId] = {
              id: floorId,
              entranceId,
              kind: 'regular',
              number: floorNum,
              label: `Этаж ${floorNum}`,
            }

            if (houseDraft.zoneOptions?.corridors) {
              generateHouseZones(
                structure,
                importRows,
                { id: sectionId, name: section.name },
                houseDraft,
                houseId,
                entranceId,
                entranceNum,
                floorId,
                floorNum,
              )
            }

            const floorRows = entranceRows
              .filter((r) => r.floor === floorNum)
              .sort((a, b) => String(a.apartmentNumber).localeCompare(String(b.apartmentNumber), 'ru', { numeric: true }))

            for (const row of floorRows) {
              const aptId = uid('apt')
              const aptNumber = row.apartmentNumber || String(globalAptNum++)
              structure.apartments[aptId] = {
                id: aptId,
                number: aptNumber,
                entranceId,
                floorId,
                workTemplate: houseDraft.workTemplate ?? aptStep.workTemplate,
                rooms: row.rooms,
                roomCount: row.rooms,
                area: row.apartmentArea > 0 ? row.apartmentArea : undefined,
                label: row.hasKitchen
                  ? row.kitchenCount > 1
                    ? `${row.kitchenCount} кухни`
                    : 'с кухней'
                  : undefined,
              }
              for (const taskType of houseWorkTypes) {
                importRows.push({
                  section: section.name,
                  house: houseDraft.name,
                  entrance: String(entranceNum),
                  floor: String(floorNum),
                  apartmentNumber: aptNumber,
                  taskType,
                })
              }
            }
          }

          if (!houseZonesGenerated.has(houseId)) {
            generateHouseLevelZones(
              structure,
              importRows,
              { id: sectionId, name: section.name },
              houseDraft,
              houseId,
              entranceNum,
            )
            houseZonesGenerated.add(houseId)
          }
        }

        structure.houses[houseId] = { id: houseId, sectionId, name: houseDraft.name, entranceIds }
        houseIds.push(houseId)
        continue
      }

      const entrancesCount = houseDraft.entrancesCount || 1
      const floorsCount = houseDraft.floorsPerEntrance || 1
      const aptsPerFloor = houseDraft.apartmentsPerFloor || aptStep.apartmentsPerFloor || 1

      for (let e = 1; e <= entrancesCount; e++) {
        const entranceId = uid('ent')
        entranceIds.push(entranceId)
        structure.entrances[entranceId] = { id: entranceId, houseId, number: e }

        if (!entranceZonesDone.has(e)) {
          if (houseDraft.zoneOptions?.stairwellsElevators) {
            generateHouseZones(structure, importRows, { id: sectionId, name: section.name }, houseDraft, houseId, entranceId, e, undefined, undefined)
          }
          entranceZonesDone.add(e)
        }

        const floorList: GeneratedObjectStructure['floors'][string][] = []

        if (houseDraft.includeBasement) {
          floorList.push({ id: uid('floor'), entranceId, kind: 'basement', number: -1, label: 'Подвал' })
        }
        for (let f = 1; f <= floorsCount; f++) {
          floorList.push({ id: uid('floor'), entranceId, kind: 'regular', number: f, label: `Этаж ${f}` })
        }
        if (houseDraft.includeRoof) {
          floorList.push({ id: uid('floor'), entranceId, kind: 'roof', number: 999, label: 'Крыша' })
        }

        for (const floor of floorList) {
          structure.floors[floor.id] = floor

          if (floor.kind === 'basement') {
            const zone = basementZoneKey(e)
            for (const taskType of BASEMENT_WORK_TYPES) {
              importRows.push({
                section: section.name,
                house: houseDraft.name,
                entrance: String(e),
                floor: '-1',
                apartmentNumber: zone,
                taskType,
              })
            }
            continue
          }
          if (floor.kind === 'roof') continue

          if (houseDraft.zoneOptions?.corridors) {
            generateHouseZones(
              structure,
              importRows,
              { id: sectionId, name: section.name },
              houseDraft,
              houseId,
              entranceId,
              e,
              floor.id,
              floor.number,
            )
          }

          for (let a = 1; a <= aptsPerFloor; a++) {
            const aptId = uid('apt')
            const aptNumber = String(globalAptNum++)
            structure.apartments[aptId] = {
              id: aptId,
              number: aptNumber,
              entranceId,
              floorId: floor.id,
              workTemplate: houseDraft.workTemplate ?? aptStep.workTemplate,
              rooms: houseDraft.defaultRooms ?? 2,
              roomCount: houseDraft.defaultRooms ?? 2,
              area: houseDraft.apartmentArea > 0 ? houseDraft.apartmentArea : undefined,
            }
            for (const taskType of houseWorkTypes) {
              importRows.push({
                section: section.name,
                house: houseDraft.name,
                entrance: String(e),
                floor: String(floor.number),
                apartmentNumber: aptNumber,
                taskType,
              })
            }
          }
        }

        if (!houseZonesGenerated.has(houseId)) {
          generateHouseLevelZones(structure, importRows, { id: sectionId, name: section.name }, houseDraft, houseId, e)
          houseZonesGenerated.add(houseId)
        }
      }

      structure.houses[houseId] = { id: houseId, sectionId, name: houseDraft.name, entranceIds }
      houseIds.push(houseId)
    }

    structure.sections.push({ id: sectionId, name: section.name, houseIds })
  }

  structure.summary = {
    sections: structure.sections.length,
    houses: Object.keys(structure.houses).length,
    entrances: Object.keys(structure.entrances).length,
    floors: Object.keys(structure.floors).length,
    apartments: Object.keys(structure.apartments).length,
    zones: Object.keys(structure.zones).length,
    tasks: importRows.length,
  }

  return { structure, importRows }
}

export function initSubWorksForImportRow(row: ImportRow): import('@/types/subWorks').SubWorkState[] | undefined {
  if (row.zoneType && row.categoryId) {
    return createSubWorksForZoneCategory(row.zoneType, row.categoryId)
  }
  return undefined
}

export function estimateStructureCounts(sections: WizardSectionDraft[], territoryOptions?: WizardTerritoryOptions) {
  let entrances = 0
  let floors = 0
  let apartments = 0
  let basementZones = 0
  let zones = 0

  if (territoryOptions) {
    if (territoryOptions.parking) zones += 1
    if (territoryOptions.playground) zones += 1
    if (territoryOptions.landscaping) zones += 1
    if (territoryOptions.undergroundParking) zones += 1
  }

  for (const section of sections) {
    for (const house of section.houses) {
      const ec = house.entrancesCount || 1
      const fc = house.floorsPerEntrance || 1
      const apts = house.apartmentsPerFloor || 1
      const extra = (house.includeBasement ? 1 : 0) + (house.includeRoof ? 1 : 0)
      const opts = house.zoneOptions
      entrances += ec
      floors += ec * (fc + extra)
      if (house.includeBasement) basementZones += ec
      apartments += ec * fc * apts
      if (opts?.corridors) zones += ec * fc
      if (opts?.stairwellsElevators) zones += ec * 2
      if (opts?.facade) zones += 1
      if (opts?.roofZone) zones += 1
      if (opts?.engineering) zones += 1
    }
  }

  return {
    sections: sections.length,
    houses: sections.reduce((s, sec) => s + sec.houses.length, 0),
    entrances,
    floors,
    apartments,
    basementZones,
    zones,
  }
}

export function estimateHouseCounts(house: WizardHouseDraft) {
  const ec = house.entrancesCount || 1
  const fc = house.floorsPerEntrance || 1
  const apts = house.apartmentsPerFloor || 1
  const opts = house.zoneOptions
  let zones = 0
  if (opts?.corridors) zones += ec * fc
  if (opts?.stairwellsElevators) zones += ec * 2
  if (opts?.facade) zones += 1
  if (opts?.roofZone) zones += 1
  if (opts?.engineering) zones += 1
  return {
    entrances: ec,
    floors: ec * (fc + (house.includeBasement ? 1 : 0) + (house.includeRoof ? 1 : 0)),
    apartments: ec * fc * apts,
    zones,
  }
}
