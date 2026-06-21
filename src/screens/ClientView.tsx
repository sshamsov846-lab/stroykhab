import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Wallet, Users, Phone } from 'lucide-react'
import { ClientBlockCard } from '@components/client/ClientBlockCard'
import { ClientWorkSectionCard } from '@components/client/ClientWorkSectionCard'
import {
  getClientObjectData,
  getClientEntrances,
  getClientFloors,
  getClientApartments,
  getClientWorkSections,
  layoutTags,
  type ClientObjectData,
  type ClientHouse,
  type ClientEntrance,
  type ClientFloor,
  type ClientApartment,
  type ClientWorkSection,
} from '@api/clientView'
import { ImportedHierarchyView } from '@components/workflow/ImportedHierarchyView'
import { BuiltHierarchyView } from '@components/client/BuiltHierarchyView'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useClientPortalStore } from '@store/clientPortalStore'
import { PLURAL, pluralWithCount } from '@utils/russianPlural'
import { calcTaskProgress } from '@utils/hierarchyProgress'
import { AcceptanceReportPanel } from '@components/workflow/AcceptanceReportPanel'
import { useUserStore } from '@store/userStore'
import { canAccessObject } from '@utils/sideJob'
import { ObjectInvitePanel } from '@components/objectAccess/ObjectInvitePanel'
import { ObjectAccessMembersPanel } from '@components/objectAccess/ObjectAccessMembersPanel'
import { AddOrganizationPanel } from '@components/objectChain/AddOrganizationPanel'
import { AddForemanToObjectPanel } from '@components/objectChain/AddForemanToObjectPanel'
import { ObjectOrgTeamPanel } from '@components/objectChain/ObjectOrgTeamPanel'

type NavLevel = 'object' | 'entrances' | 'floors' | 'apartments' | 'works'

interface NavState {
  level: NavLevel
  house?: ClientHouse
  entrance?: ClientEntrance
  floor?: ClientFloor
  apartment?: ClientApartment
}

export const ClientView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ClientObjectData | null>(null)
  const [nav, setNav] = useState<NavState>({ level: 'object' })
  const [entrances, setEntrances] = useState<ClientEntrance[]>([])
  const [floors, setFloors] = useState<ClientFloor[]>([])
  const [apartments, setApartments] = useState<ClientApartment[]>([])
  const [workSections, setWorkSections] = useState<ClientWorkSection[]>([])
  const [showBudget, setShowBudget] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [skipHouseLevel, setSkipHouseLevel] = useState(false)
  const hasImported = useProjectWorkflowStore((s) => (id ? s.importedObjects.includes(id) : false))
  const hasBuilt = useClientPortalStore((s) => (id ? !!s.customStructures[id] : false))
  const workflowTasks = useProjectWorkflowStore((s) => (id ? s.getTasksByObject(id) : []))
  const role = useUserStore((s) => s.role)
  const fullName = useUserStore((s) => s.fullName)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getClientObjectData(id)
      .then((d) => {
        if (!d) {
          setError('Объект не найден')
          return
        }
        setData(d)
        const imported = useProjectWorkflowStore.getState().importedObjects.includes(id)
        const built = !!useClientPortalStore.getState().customStructures[id]
        if (d.houses.length === 1 && !imported && !built) {
          setSkipHouseLevel(true)
          setNav({ level: 'entrances', house: d.houses[0] })
        }
      })
      .catch(() => setError('Не удалось загрузить данные'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || !nav.house) return
    if (['entrances', 'floors', 'apartments', 'works'].includes(nav.level)) {
      getClientEntrances(nav.house.id, id).then(setEntrances)
    }
  }, [nav.house, nav.level, id])

  useEffect(() => {
    if (!nav.entrance) return
    if (['floors', 'apartments', 'works'].includes(nav.level)) {
      getClientFloors(nav.entrance.id).then(setFloors)
    }
  }, [nav.entrance, nav.level])

  useEffect(() => {
    if (!nav.floor || !nav.entrance) return
    if (['apartments', 'works'].includes(nav.level)) {
      getClientApartments(nav.floor.id, nav.entrance.id).then(setApartments)
    }
  }, [nav.floor, nav.entrance, nav.level])

  useEffect(() => {
    if (!nav.apartment) return
    if (nav.level === 'works') {
      getClientWorkSections(nav.apartment.id).then(setWorkSections)
    }
  }, [nav.apartment, nav.level])

  const goBack = useCallback(() => {
    if (nav.level === 'works') {
      setNav((n) => ({ ...n, level: 'apartments', apartment: undefined }))
    } else if (nav.level === 'apartments') {
      setNav((n) => ({ ...n, level: 'floors', floor: undefined }))
    } else if (nav.level === 'floors') {
      setNav((n) => ({ ...n, level: 'entrances', entrance: undefined }))
    } else if (nav.level === 'entrances') {
      if (skipHouseLevel) {
        setNav({ level: 'object' })
      } else {
        setNav({ level: 'object', house: undefined })
      }
    }
  }, [nav.level, skipHouseLevel])

  const openHouse = (house: ClientHouse) => {
    setNav({ level: 'entrances', house })
  }

  const canGoBack = nav.level !== 'object'

  const handleHeaderBack = useCallback(() => {
    if (canGoBack) {
      goBack()
    } else {
      navigate('/objects')
    }
  }, [canGoBack, goBack, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  if (id && !canAccessObject(id, role)) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 text-center text-gray-500">
        Объект не найден
      </div>
    )
  }

  if (!data || !id) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 text-center">
        <p className="text-gray-500">{error || 'Объект не найден'}</p>
      </div>
    )
  }

  const { object, organizations, houses } = data
  const budgetPercent = object.budget_total > 0
    ? Math.round((object.budget_spent / object.budget_total) * 100)
    : 0

  const objectProgress = (hasBuilt || hasImported)
    ? calcTaskProgress(workflowTasks).percent
    : (object.progress ?? 0)
  const objectStatusLabel = objectProgress >= 100
    ? 'Готово'
    : objectProgress > 0
      ? 'В работе'
      : 'Не начат'
  const objectStatusClass = objectProgress >= 100
    ? 'bg-emerald-100 text-emerald-700'
    : objectProgress > 0
      ? 'bg-primary-100 text-primary-700'
      : 'bg-gray-100 text-gray-600'

  const breadcrumb = [
    nav.level !== 'object' && !skipHouseLevel ? object.name : null,
    nav.house ? `Дом ${nav.house.number}` : null,
    nav.entrance ? `Подъезд ${nav.entrance.number}` : null,
    nav.floor?.label,
    nav.apartment?.number,
    nav.level === 'works' ? 'Работы' : null,
  ].filter(Boolean).join(' → ')

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleHeaderBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0"
            aria-label="Назад"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg-mobile font-bold text-gray-900 truncate">{object.name}</h1>
            {canGoBack && breadcrumb ? (
              <p className="text-xs-mobile text-primary-600 truncate">{breadcrumb}</p>
            ) : (
              <p className="text-xs-mobile text-gray-500 truncate">📍 {object.address}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100">
        <div className="px-4 py-4 pt-2">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs-mobile font-medium rounded-full ${objectStatusClass}`}>
              {objectStatusLabel}
            </span>
            <span className="text-xs-mobile text-gray-400">ID: {id.slice(0, 8)}</span>
          </div>
          {nav.level === 'object' && (
            <>
              <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={16} className="text-gray-500" />
                  <span className="text-sm-mobile font-medium text-gray-700">Организации по договору</span>
                </div>
                <div className="space-y-2">
                  {organizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between text-sm-mobile">
                      <div>
                        <p className="font-medium text-gray-900">{org.name}</p>
                        <p className="text-xs-mobile text-gray-500">{org.specialty}</p>
                      </div>
                      {org.phone && (
                        <a href={`tel:${org.phone}`} className="text-primary-600 flex items-center gap-1">
                          <Phone size={14} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm-mobile text-gray-600">Общий прогресс</span>
                  <span className="text-lg-mobile font-bold text-primary-600">{objectProgress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${objectProgress}%` }} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {nav.level === 'object' && (
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => setShowBudget(!showBudget)}
            className="w-full bg-white rounded-2xl p-4 shadow-sm text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-primary-600" />
                <span className="text-sm-mobile font-medium">Бюджет</span>
              </div>
              <span className="text-primary-600 text-sm-mobile">{showBudget ? 'Скрыть' : 'Подробнее'}</span>
            </div>
            <p className="text-xl-mobile font-bold text-gray-900 mt-1">
              {object.budget_spent.toLocaleString('ru-RU')} / {object.budget_total.toLocaleString('ru-RU')} ₽
            </p>
            {showBudget && (
              <div className="mt-2">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${budgetPercent > 90 ? 'bg-red-500' : 'bg-primary-500'}`}
                    style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs-mobile text-gray-500 mt-1">Использовано {budgetPercent}%</p>
              </div>
            )}
          </button>
        </div>
      )}

      <div className="px-4 pb-8 space-y-3">
        {nav.level === 'object' && (
          <>
            {role === 'client' && id && (
              <div className="space-y-4 mb-4">
                <AddOrganizationPanel objectId={id} objectName={object.name} />
                <h2 className="text-base-mobile font-semibold text-gray-900">Код доступа к объекту</h2>
                <ObjectInvitePanel objectId={id} objectName={object.name} canManage />
                <div>
                  <h3 className="text-base-mobile font-semibold text-gray-900 mb-2">Кто подключён</h3>
                  <ObjectAccessMembersPanel
                    objectId={id}
                    canRevoke
                    revokeFilter={['foreman', 'worker']}
                    revokedByName={fullName || 'Заказчик'}
                  />
                </div>
              </div>
            )}
            {role === 'subcontractor' && id && (
              <div className="space-y-4 mb-4">
                <AddForemanToObjectPanel objectId={id} objectName={object.name} />
                <ObjectOrgTeamPanel objectId={id} />
              </div>
            )}
            {hasBuilt ? (
              <>
                <BuiltHierarchyView objectId={id} />
                {(role === 'foreman' || role === 'client' || role === 'subcontractor') && (
                  <AcceptanceReportPanel objectId={id} />
                )}
              </>
            ) : hasImported ? (
              <ImportedHierarchyView objectId={id} />
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm-mobile text-amber-900">
                  Пример (демо) — устаревшая иерархия. Создайте объект через конструктор или импортируйте смету для реального workflow.
                </div>
                <h2 className="text-base-mobile font-semibold text-gray-900 pt-1">Дома на объекте (демо)</h2>
                {houses.map((house) => (
                  <ClientBlockCard
                    key={house.id}
                    icon="house"
                    title={`Дом ${house.number}`}
                    subtitle={house.address}
                    progress={house.progress}
                    meta={pluralWithCount(house.total_entrances, PLURAL.entrance)}
                    onClick={() => openHouse(house)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {nav.level === 'entrances' && (
          <>
            <h2 className="text-base-mobile font-semibold text-gray-900">Подъезды</h2>
            {entrances.map((ent) => (
              <ClientBlockCard
                key={ent.id}
                icon="entrance"
                title={`Подъезд ${ent.number}`}
                subtitle={pluralWithCount(ent.total_floors, PLURAL.floor)}
                progress={ent.progress}
                onClick={() => setNav({ ...nav, level: 'floors', entrance: ent })}
              />
            ))}
          </>
        )}

        {nav.level === 'floors' && (
          <>
            <h2 className="text-base-mobile font-semibold text-gray-900">Этажи</h2>
            {floors.map((floor) => (
              <ClientBlockCard
                key={floor.id}
                icon="floor"
                title={floor.label}
                subtitle={floor.total_apartments > 0 ? pluralWithCount(floor.total_apartments, PLURAL.apartment) : 'Технические помещения'}
                progress={floor.progress}
                onClick={() => setNav({ ...nav, level: 'apartments', floor })}
              />
            ))}
          </>
        )}

        {nav.level === 'apartments' && (
          <>
            <h2 className="text-base-mobile font-semibold text-gray-900">Квартиры</h2>
            {apartments.length === 0 ? (
              <p className="text-sm-mobile text-gray-500 text-center py-8">На этом этаже нет квартир</p>
            ) : (
              apartments.map((apt) => (
                <ClientBlockCard
                  key={apt.id}
                  icon="apartment"
                  title={apt.number}
                  tags={layoutTags(apt.layout)}
                  progress={apt.progress}
                  meta={`${apt.budget_spent.toLocaleString('ru-RU')} / ${apt.budget_total.toLocaleString('ru-RU')} ₽`}
                  onClick={() => setNav({ ...nav, level: 'works', apartment: apt })}
                />
              ))
            )}
          </>
        )}

        {nav.level === 'works' && nav.apartment && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h2 className="text-lg-mobile font-bold text-gray-900">{nav.apartment.number}</h2>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {layoutTags(nav.apartment.layout).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs-mobile rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-sm-mobile text-gray-500 mt-2">Прогресс: {nav.apartment.progress}%</p>
            </div>

            <h3 className="text-base-mobile font-semibold text-gray-900">Виды работ и подрядчики</h3>
            <p className="text-xs-mobile text-gray-500 -mt-1">
              Нажмите на раздел — задания, фото и видео до/после
            </p>
            {workSections.map((section) => (
              <ClientWorkSectionCard key={section.id} section={section} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
