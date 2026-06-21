import React, { useState, useEffect, useMemo } from 'react'

import { useNavigate } from 'react-router-dom'

import { ArrowLeft, Pencil, Wrench } from 'lucide-react'

import { WORK_TYPE_LABELS } from '@api/hierarchy'

import { STATUS_COLORS, STATUS_LABELS } from '@api/clientView'

import { useClientPortalStore } from '@store/clientPortalStore'

import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

import { ApartmentEditModal } from '@components/client/ApartmentEditModal'

import { HierarchyProgressCard } from '@components/client/HierarchyProgressCard'

import { FloorNumberStrip } from '@components/client/FloorNumberStrip'

import { ApartmentSearchBar } from '@components/client/ApartmentSearchBar'

import { openWorkflowTask, openWorkflowSubWork } from '@utils/workflowNavigation'

import {

  formatApartmentLocation,

  formatApartmentTitle,

} from '@utils/apartmentDisplay'

import {

  calcTaskProgress,

  findApartmentNav,

  getTasksForApartment,

  getTasksForFloor,

} from '@utils/hierarchyProgress'

import { calcTaskProgressWithSubWorks, displayTaskStatus, subWorkProgressLabel, taskHasSubWorksList } from '@utils/subWorkProgress'
import {
  getTerritoryZones,
  getZonesOnFloor,
  getZonesOnEntrance,
  getZonesOnHouse,
  getTasksForZone,
  zoneWorkLabel,
  zoneProgress,
  zoneParentLevel,
  zoneNavContext,
  zoneTypeIcon,
} from '@utils/zoneHelpers'

import { PLURAL, pluralWithCount } from '@utils/russianPlural'

import type { BuiltHierarchyNav, BuiltNavLevel } from '@/types/hierarchyNav'

import {

  WORK_TEMPLATES,

  BASEMENT_WORK_TYPES,

  basementTaskLabel,

  basementZoneKey,

} from '@/types/objectStructure'

import type { GeneratedApartment, GeneratedFloor, GeneratedZone } from '@/types/objectStructure'



interface Props {

  objectId: string

}



const DEFAULT_NAV: BuiltHierarchyNav = {

  kind: 'built',

  level: 'sections',

  sectionId: '',

  houseId: '',

  entranceId: '',

  floorId: '',

  apartmentId: null,

  zoneId: null,

  workTaskId: null,

}



const OBJECT_SEARCH_LEVELS: BuiltNavLevel[] = ['sections', 'houses', 'entrances', 'floors']



export const BuiltHierarchyView: React.FC<Props> = ({ objectId }) => {

  const navigate = useNavigate()

  const structure = useClientPortalStore((s) => s.customStructures[objectId])

  const savedNav = useClientPortalStore((s) => s.hierarchyNavByObject[objectId])

  const setHierarchyNav = useClientPortalStore((s) => s.setHierarchyNav)

  const resolveApartmentContext = useClientPortalStore((s) => s.resolveApartmentContext)

  const tasks = useProjectWorkflowStore((s) => s.getTasksByObject(objectId))

  const getTaskSubWorks = useProjectWorkflowStore((s) => s.getTaskSubWorks)

  const ensureTaskSubWorks = useProjectWorkflowStore((s) => s.ensureTaskSubWorks)



  const initial = savedNav?.kind === 'built' ? savedNav : DEFAULT_NAV



  const [level, setLevel] = useState<BuiltNavLevel>(initial.level)

  const [sectionId, setSectionId] = useState(initial.sectionId)

  const [houseId, setHouseId] = useState(initial.houseId)

  const [entranceId, setEntranceId] = useState(initial.entranceId)

  const [floorId, setFloorId] = useState(initial.floorId)

  const [apartmentId, setApartmentId] = useState<string | null>(initial.apartmentId)

  const [zoneId, setZoneId] = useState<string | null>(
    initial.kind === 'built' ? initial.zoneId ?? null : null,
  )

  const [workTaskId, setWorkTaskId] = useState<string | null>(
    initial.kind === 'built' ? initial.workTaskId ?? null : null,
  )

  const [editOpen, setEditOpen] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')



  const apartment = apartmentId && structure ? structure.apartments[apartmentId] ?? null : null

  const zone = zoneId && structure ? structure.zones?.[zoneId] ?? null : null

  const currentFloor = floorId && structure ? structure.floors[floorId] ?? null : null



  useEffect(() => {

    setHierarchyNav(objectId, {

      kind: 'built',

      level,

      sectionId,

      houseId,

      entranceId,

      floorId,

      apartmentId,

      zoneId,

      workTaskId,

    })

  }, [objectId, level, sectionId, houseId, entranceId, floorId, apartmentId, zoneId, workTaskId, setHierarchyNav])



  useEffect(() => {

    setSearchQuery('')

  }, [level, entranceId, floorId])

  const isObjectSearch = OBJECT_SEARCH_LEVELS.includes(level)
  const trimmedSearch = searchQuery.trim()

  const aptsOnFloor = structure
    ? Object.values(structure.apartments).filter((a) => a.floorId === floorId)
    : []

  const globalSearchResults = useMemo(() => {
    if (!structure || !trimmedSearch || !isObjectSearch) return []
    return Object.values(structure.apartments).filter((a) => a.number.includes(trimmedSearch))
  }, [structure, trimmedSearch, isObjectSearch])

  const floorSearchResults = useMemo(() => {
    if (!trimmedSearch || level !== 'apartments') return aptsOnFloor
    return aptsOnFloor.filter((a) => a.number.includes(trimmedSearch))
  }, [aptsOnFloor, trimmedSearch, level])

  if (!structure) return null

  const section = structure.sections.find((s) => s.id === sectionId)

  const house = houseId ? structure.houses[houseId] : undefined

  const entrance = entranceId ? structure.entrances[entranceId] : undefined



  const territoryZones = getTerritoryZones(structure)

  const houseZones = houseId ? getZonesOnHouse(structure, houseId) : []

  const entranceZones = entranceId ? getZonesOnEntrance(structure, entranceId) : []

  const floorZones = floorId ? getZonesOnFloor(structure, floorId) : []

  const housesInSection = section?.houseIds.map((id) => structure.houses[id]).filter(Boolean) || []

  const entrancesInHouse = house?.entranceIds.map((id) => structure.entrances[id]).filter(Boolean) || []

  const floorsInEntrance = Object.values(structure.floors).filter((f) => f.entranceId === entranceId)

  const regularFloors = floorsInEntrance

    .filter((f) => f.kind === 'regular')

    .sort((a, b) => a.number - b.number)

  const specialFloors = floorsInEntrance.filter((f) => f.kind !== 'regular')

  const aptTasks = apartment

    ? (() => {

        const ctx = resolveApartmentContext(objectId, apartment.id)

        return ctx ? getTasksForApartment(tasks, apartment, ctx) : tasks.filter((t) => t.apartmentNumber === apartment.number)

      })()

    : []



  const zoneCtx = zone ? zoneNavContext(structure, zone) : null

  const zoneTasks = zone && zoneCtx ? getTasksForZone(tasks, zone, zoneCtx) : []



  const selectedWorkTask = workTaskId ? tasks.find((t) => t.id === workTaskId) : undefined

  const selectedSubWorks = workTaskId ? getTaskSubWorks(workTaskId) : []



  const basementZone = entrance ? basementZoneKey(entrance.number) : ''

  const basementTasks = entrance

    ? tasks.filter((t) => t.floor === '-1' && t.apartmentNumber === basementZone)

    : []



  const currentNav = (): BuiltHierarchyNav => ({

    kind: 'built',

    level,

    sectionId,

    houseId,

    entranceId,

    floorId,

    apartmentId,

    zoneId,

    workTaskId,

  })



  const SimpleCard = ({

    title,

    sub,

    onClick,

  }: {

    title: string

    sub?: string

    onClick: () => void

  }) => (

    <button

      type="button"

      onClick={onClick}

      className="w-full flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100 text-left active:scale-[0.98]"

    >

      <div>

        <p className="text-base-mobile font-bold text-gray-900">{title}</p>

        {sub && <p className="text-sm-mobile text-gray-500">{sub}</p>}

      </div>

      <span className="text-gray-300">›</span>

    </button>

  )



  const goBack = () => {

    if (level === 'subWorks') {

      setLevel('works')

      setWorkTaskId(null)

    } else if (level === 'works') {

      if (zoneId) {

        const z = structure.zones?.[zoneId]

        setZoneId(null)

        setWorkTaskId(null)

        if (z) setLevel(zoneParentLevel(z))

      } else {

        setLevel('apartments')

        setApartmentId(null)

        setWorkTaskId(null)

      }

    } else if (level === 'basement') {

      setLevel('floors')

      setFloorId('')

    } else if (level === 'apartments') {

      setLevel('floors')

      setFloorId('')

    } else if (level === 'floors') {

      setLevel('entrances')

      setEntranceId('')

    } else if (level === 'entrances') {

      setLevel('houses')

      setHouseId('')

    } else if (level === 'houses') {

      setLevel('sections')

      setSectionId('')

    } else if (level === 'territory') {

      setLevel('sections')

    }

  }



  const openZone = (z: GeneratedZone) => {

    setZoneId(z.id)

    setApartmentId(null)

    setWorkTaskId(null)

    if (z.sectionId) setSectionId(z.sectionId)

    if (z.houseId) setHouseId(z.houseId)

    if (z.entranceId) setEntranceId(z.entranceId)

    if (z.floorId) setFloorId(z.floorId)

    setLevel('works')

  }



  const renderZoneCard = (z: GeneratedZone) => {

    const ctx = zoneNavContext(structure, z)

    const percent = ctx ? zoneProgress(tasks, z, ctx) : 0

    return (

      <HierarchyProgressCard

        key={z.id}

        title={`${zoneTypeIcon(z.zoneType)} ${z.label}`}

        percent={percent}

        onClick={() => openZone(z)}

      />

    )

  }



  const openApartment = (apt: GeneratedApartment) => {

    const nav = findApartmentNav(structure, apt.id)

    if (!nav) return

    setSectionId(nav.section.id)

    setHouseId(nav.house.id)

    setEntranceId(nav.entrance.id)

    setFloorId(nav.floor.id)

    setApartmentId(apt.id)

    setLevel('works')

    setSearchQuery('')

  }



  const openFloor = (f: GeneratedFloor) => {

    setFloorId(f.id)

    if (f.kind === 'basement') {

      setLevel('basement')

      return

    }

    if (f.kind === 'roof') return

    setLevel('apartments')

  }



  const floorProgress = (f: GeneratedFloor) => {

    if (!section || !house || !entrance) return 0

    return calcTaskProgress(getTasksForFloor(tasks, structure, f, entrance, house, section)).percent

  }



  const apartmentProgress = (a: GeneratedApartment) => {

    const ctx = resolveApartmentContext(objectId, a.id)

    const list = ctx ? getTasksForApartment(tasks, a, ctx) : tasks.filter((t) => t.apartmentNumber === a.number)

    return calcTaskProgressWithSubWorks(list).percent

  }



  const renderSearchResults = (apartments: GeneratedApartment[]) => {

    if (apartments.length === 0) {

      return <p className="text-sm-mobile text-gray-500 text-center py-6">Квартира не найдена</p>

    }

    return apartments.map((a) => {

      const nav = findApartmentNav(structure, a.id)

      const location = nav

        ? formatApartmentLocation(nav.house.name, nav.entrance.number, nav.floor.label)

        : undefined

      return (

        <HierarchyProgressCard

          key={a.id}

          title={formatApartmentTitle(a)}

          subtitle={location}

          percent={apartmentProgress(a)}

          onClick={() => openApartment(a)}

        />

      )

    })

  }



  return (

    <div className="space-y-3">

      <p className="text-xs-mobile text-primary-700 bg-primary-50 px-3 py-2 rounded-xl">

        Конструктор · {pluralWithCount(structure.summary.apartments, PLURAL.apartment)}
        {(structure.summary.zones ?? 0) > 0 && ` · ${structure.summary.zones} зон`}
        {' · '}{pluralWithCount(structure.summary.tasks, PLURAL.task)}

      </p>



      {level !== 'sections' && (

        <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm-mobile text-primary-600 font-medium py-1">

          <ArrowLeft size={16} />

          Назад

        </button>

      )}



      {isObjectSearch && (

        <ApartmentSearchBar

          value={searchQuery}

          onChange={setSearchQuery}

          placeholder="Найти квартиру по номеру (по всему объекту)…"

        />

      )}



      {level === 'apartments' && (

        <>

          {regularFloors.length > 0 && (

            <FloorNumberStrip

              floors={regularFloors}

              activeFloorId={floorId}

              onSelect={openFloor}

            />

          )}

          <ApartmentSearchBar

            value={searchQuery}

            onChange={setSearchQuery}

            placeholder="Найти квартиру на этом этаже…"

          />

        </>

      )}



      {level === 'floors' && regularFloors.length > 0 && (

        <FloorNumberStrip

          floors={regularFloors}

          activeFloorId={floorId}

          onSelect={openFloor}

        />

      )}



      {trimmedSearch && isObjectSearch ? (

        renderSearchResults(globalSearchResults)

      ) : (

        <>

          {level === 'sections' && (

            <>

              {territoryZones.length > 0 && (

                <SimpleCard

                  title="🌳 Территория ЖК"

                  sub={territoryZones.length === 1 ? '1 зона' : `${territoryZones.length} зоны`}

                  onClick={() => setLevel('territory')}

                />

              )}

              {structure.sections.map((s) => (

                <SimpleCard

                  key={s.id}

                  title={s.name}

                  sub={pluralWithCount(s.houseIds.length, PLURAL.house)}

                  onClick={() => { setSectionId(s.id); setLevel('houses') }}

                />

              ))}

            </>

          )}



          {level === 'territory' && territoryZones.map((z) => renderZoneCard(z))}



          {level === 'houses' && housesInSection.map((h) => h && (

            <SimpleCard

              key={h.id}

              title={h.name}

              sub={pluralWithCount(h.entranceIds.length, PLURAL.entrance)}

              onClick={() => { setHouseId(h.id); setLevel('entrances') }}

            />

          ))}



          {level === 'entrances' && (

            <>

              {houseZones.map((z) => renderZoneCard(z))}

              {entrancesInHouse.map((e) => e && (

                <SimpleCard

                  key={e.id}

                  title={`Подъезд ${e.number}`}

                  onClick={() => { setEntranceId(e.id); setLevel('floors') }}

                />

              ))}

            </>

          )}



          {level === 'floors' && (

            <>

              {entranceZones.map((z) => renderZoneCard(z))}

              {regularFloors.map((f) => {

                const aptCount = Object.values(structure.apartments).filter((a) => a.floorId === f.id).length

                return (

                  <HierarchyProgressCard

                    key={f.id}

                    title={f.label}

                    subtitle={pluralWithCount(aptCount, PLURAL.apartment)}

                    percent={floorProgress(f)}

                    onClick={() => openFloor(f)}

                  />

                )

              })}

              {specialFloors.map((f) => (

                <HierarchyProgressCard

                  key={f.id}

                  title={f.label}

                  subtitle={

                    f.kind === 'basement'

                      ? 'Инженерия: трубы, стяжка, двери — без квартир'

                      : 'Технический этаж'

                  }

                  percent={floorProgress(f)}

                  onClick={() => openFloor(f)}

                  disabled={f.kind === 'roof'}

                />

              ))}

            </>

          )}



          {level === 'basement' && currentFloor?.kind === 'basement' && (

            <div className="space-y-2">

              <div className="bg-slate-100 rounded-xl p-3 text-sm-mobile text-slate-700">

                <Wrench size={16} className="inline mr-1 -mt-0.5" />

                Подвал подъезда {entrance?.number}: вводы, стояки, стяжка. Квартир здесь нет.

              </div>

              {BASEMENT_WORK_TYPES.map((wt) => {

                const task = basementTasks.find((t) => t.workType === wt)

                return (

                  <button

                    key={wt}

                    type="button"

                    onClick={() => task && openWorkflowTask(navigate, objectId, task.id, currentNav())}

                    className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left"

                  >

                    <div className="flex justify-between items-center gap-2">

                      <div>

                        <p className="text-sm-mobile font-semibold text-gray-900">{basementTaskLabel(wt)}</p>

                        <p className="text-xs-mobile text-gray-500">{WORK_TYPE_LABELS[wt]}</p>

                      </div>

                      {task && (

                        <span className={`px-2 py-0.5 rounded-full text-xs-mobile shrink-0 ${STATUS_COLORS[task.status]}`}>

                          {STATUS_LABELS[task.status]}

                        </span>

                      )}

                    </div>

                  </button>

                )

              })}

            </div>

          )}



          {level === 'apartments' && (

            <>

              {floorZones.map((z) => renderZoneCard(z))}

              {floorSearchResults.length === 0 ? (

                <p className="text-sm-mobile text-gray-500 text-center py-6">На этом этаже нет квартир</p>

              ) : (

                floorSearchResults.map((a) => (

                  <HierarchyProgressCard

                    key={a.id}

                    title={formatApartmentTitle(a)}

                    subtitle={WORK_TEMPLATES[a.workTemplate].label}

                    percent={apartmentProgress(a)}

                    onClick={() => openApartment(a)}

                  />

                ))

              )}

            </>

          )}

        </>

      )}



      {level === 'works' && apartment && (

        <div className="space-y-2">

          <div className="flex items-center justify-between">

            <h3 className="text-sm-mobile font-semibold text-gray-700">{formatApartmentTitle(apartment)}</h3>

            <button

              type="button"

              onClick={() => setEditOpen(true)}

              className="flex items-center gap-1 text-sm-mobile text-primary-600 font-medium px-2 py-1 rounded-lg hover:bg-primary-50"

            >

              <Pencil size={14} />

              Изменить

            </button>

          </div>

          {apartment.notes && (

            <p className="text-xs-mobile text-amber-800 bg-amber-50 px-3 py-2 rounded-lg">{apartment.notes}</p>

          )}

          <p className="text-xs-mobile text-gray-500">Виды работ</p>

          {aptTasks.length === 0 ? (

            <p className="text-sm-mobile text-gray-500 py-4 text-center">Задачи не найдены</p>

          ) : (

            aptTasks.map((t) => {

              const progressLabel = subWorkProgressLabel(t)

              const status = displayTaskStatus(t)

              return (

                <button

                  key={t.id}

                  type="button"

                  onClick={() => {

                    if (taskHasSubWorksList(t)) {

                      ensureTaskSubWorks(t.id)

                      setWorkTaskId(t.id)

                      setLevel('subWorks')

                    } else {

                      openWorkflowTask(navigate, objectId, t.id, currentNav())

                    }

                  }}

                  className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left"

                >

                  <div className="flex justify-between items-center gap-2">

                    <div className="min-w-0">

                      <p className="text-sm-mobile font-semibold">{WORK_TYPE_LABELS[t.workType]}</p>

                      {progressLabel && (

                        <p className="text-xs-mobile text-gray-500 mt-0.5">{progressLabel}</p>

                      )}

                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-xs-mobile shrink-0 ${STATUS_COLORS[status]}`}>

                      {STATUS_LABELS[status]}

                    </span>

                  </div>

                </button>

              )

            })

          )}

        </div>

      )}



      {level === 'subWorks' && apartment && selectedWorkTask && (

        <div className="space-y-2">

          <p className="text-xs-mobile text-primary-600">

            {formatApartmentTitle(apartment)} → {WORK_TYPE_LABELS[selectedWorkTask.workType]}

          </p>

          <p className="text-xs-mobile text-gray-500">Под-работы</p>

          {selectedSubWorks.map((sub) => (

            <button

              key={sub.id}

              type="button"

              onClick={() =>
                openWorkflowSubWork(navigate, objectId, selectedWorkTask.id, sub.id, {
                  ...currentNav(),
                  level: 'subWorks',
                  workTaskId: selectedWorkTask.id,
                })
              }

              className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left"

            >

              <div className="flex justify-between items-center gap-2">

                <div className="min-w-0">

                  <p className="text-sm-mobile font-semibold">{sub.label}</p>

                  {sub.description && (

                    <p className="text-xs-mobile text-gray-500 truncate">{sub.description}</p>

                  )}

                </div>

                <span className={`px-2 py-0.5 rounded-full text-xs-mobile shrink-0 ${STATUS_COLORS[sub.status]}`}>

                  {STATUS_LABELS[sub.status]}

                </span>

              </div>

            </button>

          ))}

        </div>

      )}



      {level === 'works' && zone && (

        <div className="space-y-2">

          <h3 className="text-sm-mobile font-semibold text-gray-700">

            {zoneTypeIcon(zone.zoneType)} {zone.label}

          </h3>

          <p className="text-xs-mobile text-gray-500">Виды работ</p>

          {zoneTasks.length === 0 ? (

            <p className="text-sm-mobile text-gray-500 py-4 text-center">Задачи не найдены</p>

          ) : (

            zoneTasks.map((t) => {

              const progressLabel = subWorkProgressLabel(t)

              const status = displayTaskStatus(t)

              return (

                <button

                  key={t.id}

                  type="button"

                  onClick={() => {

                    if (taskHasSubWorksList(t)) {

                      ensureTaskSubWorks(t.id)

                      setWorkTaskId(t.id)

                      setLevel('subWorks')

                    } else {

                      openWorkflowTask(navigate, objectId, t.id, currentNav())

                    }

                  }}

                  className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left"

                >

                  <div className="flex justify-between items-center gap-2">

                    <div className="min-w-0">

                      <p className="text-sm-mobile font-semibold">{zoneWorkLabel(t)}</p>

                      {progressLabel && (

                        <p className="text-xs-mobile text-gray-500 mt-0.5">{progressLabel}</p>

                      )}

                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-xs-mobile shrink-0 ${STATUS_COLORS[status]}`}>

                      {STATUS_LABELS[status]}

                    </span>

                  </div>

                </button>

              )

            })

          )}

        </div>

      )}



      {level === 'subWorks' && zone && selectedWorkTask && (

        <div className="space-y-2">

          <p className="text-xs-mobile text-primary-600">

            {zone.label} → {zoneWorkLabel(selectedWorkTask)}

          </p>

          <p className="text-xs-mobile text-gray-500">Под-работы</p>

          {selectedSubWorks.map((sub) => (

            <button

              key={sub.id}

              type="button"

              onClick={() =>
                openWorkflowSubWork(navigate, objectId, selectedWorkTask.id, sub.id, {
                  ...currentNav(),
                  level: 'subWorks',
                  workTaskId: selectedWorkTask.id,
                })
              }

              className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left"

            >

              <div className="flex justify-between items-center gap-2">

                <div className="min-w-0">

                  <p className="text-sm-mobile font-semibold">{sub.label}</p>

                  {sub.description && (

                    <p className="text-xs-mobile text-gray-500 truncate">{sub.description}</p>

                  )}

                </div>

                <span className={`px-2 py-0.5 rounded-full text-xs-mobile shrink-0 ${STATUS_COLORS[sub.status]}`}>

                  {STATUS_LABELS[sub.status]}

                </span>

              </div>

            </button>

          ))}

        </div>

      )}



      {editOpen && apartment && (

        <ApartmentEditModal

          objectId={objectId}

          apartment={apartment}

          onClose={() => setEditOpen(false)}

          onSaved={(updated) => setApartmentId(updated.id)}

        />

      )}

    </div>

  )

}


