import React, { useEffect, useState } from 'react'

import { useParams, useNavigate } from 'react-router-dom'

import { ArrowLeft, Wallet, MessageSquare, Share2, Eye, Users, ShieldAlert, FileText } from 'lucide-react'

import { useTelegram } from '@hooks/useTelegram'

import { BigButton } from '@components/BigButton'

import { getObjectById } from '@api/supabase'

import { useObjectStore } from '@store/objectStore'

import { useUserStore } from '@store/userStore'

import { useClientPortalStore } from '@store/clientPortalStore'

import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

import { countPendingHiddenWorks } from '@utils/hiddenWorks'

import { ObjectPresentPanel } from '@components/attendance/ObjectPresentPanel'

import { ObjectRemarksPanel } from '@components/quality/ObjectRemarksPanel'
import { ObjectWorkerAccessPanel } from '@components/objectAccess/ObjectWorkerAccessPanel'
import { ObjectAccessMembersPanel } from '@components/objectAccess/ObjectAccessMembersPanel'
import { canAccessObject } from '@utils/sideJob'

import type { ConstructionObject } from '@types'



type TabType = 'organizations' | 'expenses' | 'chat' | 'access'



export const ObjectDetail: React.FC = () => {

  const { id } = useParams<{ id: string }>()

  const navigate = useNavigate()

  const { haptic, showBackButton, hideBackButton } = useTelegram()

  const [object, setObject] = useState<ConstructionObject | null>(null)

  const [activeTab, setActiveTab] = useState<TabType>('organizations')

  const [isLoading, setIsLoading] = useState(true)

  const organizations = useObjectStore((s) => (id ? s.objectOrganizations[id] : undefined))

  const addOrganization = useObjectStore((s) => s.addOrganization)

  const role = useUserStore((s) => s.role)
  const fullName = useUserStore((s) => s.fullName)

  const hasBuilt = useClientPortalStore((s) => (id ? !!s.customStructures[id] : false))

  const hasImported = useProjectWorkflowStore((s) => (id ? s.importedObjects.includes(id) : false))

  const workflowTasks = useProjectWorkflowStore((s) => s.tasks)

  const pendingHiddenWorks = id ? countPendingHiddenWorks(id, workflowTasks) : 0



  useEffect(() => {

    showBackButton(() => navigate(-1))

    return () => hideBackButton()

  }, [showBackButton, hideBackButton, navigate])



  useEffect(() => { if (id) loadData() }, [id])



  const loadData = async () => {

    try {

      setIsLoading(true)

      const objData = await getObjectById(id!)

      if (objData?.isSideJob) {
        if (role === 'foreman') {
          navigate(`/side-job/${id}`, { replace: true })
        }
        return
      }

      if (id && !canAccessObject(id, role)) {
        setObject(null)
        return
      }

      setObject(objData)

    } catch (error) {

      console.error('Ошибка загрузки:', error)

    } finally {

      setIsLoading(false)

    }

  }



  const handleShare = () => {

    haptic('light')

    const shareUrl = `${window.location.origin}/client/${id}`

    if (navigator.share) {

      navigator.share({ title: `Объект: ${object?.name}`, text: 'Посмотрите прогресс работ', url: shareUrl })

    } else {

      navigator.clipboard.writeText(shareUrl)

    }

  }



  if (isLoading) {

    return (

      <div className="p-4 space-y-4">

        <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />

        <div className="h-40 bg-gray-200 rounded-2xl animate-pulse" />

        <div className="h-8 bg-gray-200 rounded-lg animate-pulse" />

        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}

      </div>

    )

  }



  if (!object) {

    return (

      <div className="p-4 text-center">

        <p className="text-lg-mobile text-gray-700">Объект не найден</p>

        <BigButton variant="primary" size="md" onClick={() => navigate('/')} className="mt-4">← На главную</BigButton>

      </div>

    )

  }



  const budgetPercent = object.budget_total > 0 ? Math.round((object.budget_spent / object.budget_total) * 100) : 0



  return (

    <div className="pb-24">

      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">

        <div className="px-4 py-3 flex items-center gap-3">

          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">

            <ArrowLeft size={24} />

          </button>

          <div className="flex-1 min-w-0">

            <h1 className="text-lg-mobile font-bold text-gray-900 truncate">{object.name}</h1>

            <p className="text-xs-mobile text-gray-500 truncate">{object.address}</p>

          </div>

          <button onClick={handleShare} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">

            <Share2 size={20} />

          </button>

          <button

            type="button"

            onClick={() => { haptic('light'); navigate(`/client/${id}`) }}

            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"

            title="Прогресс работ"

          >

            <Eye size={20} />

          </button>

        </div>



        <div className="px-4 pb-3">

          <div className="flex items-center justify-between text-sm-mobile mb-1">

            <div className="flex items-center gap-1 text-gray-600"><Wallet size={14} /><span>Бюджет</span></div>

            <span className="font-semibold">{object.budget_spent.toLocaleString('ru-RU')} / {object.budget_total.toLocaleString('ru-RU')} ₽</span>

          </div>

          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">

            <div className={`h-full rounded-full transition-all ${budgetPercent > 100 ? 'bg-red-500' : 'bg-primary-500'}`} style={{ width: `${Math.min(budgetPercent, 100)}%` }} />

          </div>

        </div>

      </div>



      <div className="px-4 py-3 space-y-2">

        {id && <ObjectPresentPanel objectId={id} />}

        {id && <ObjectRemarksPanel objectId={id} />}

        {(hasBuilt || hasImported) && (
          <>
            <BigButton variant="ghost" size="sm" fullWidth onClick={() => navigate(`/object/${id}/acceptance-acts`)}>
              📄 Акты приёмки
            </BigButton>
            <BigButton variant="ghost" size="sm" fullWidth onClick={() => navigate(`/object/${id}/payment-acts`)}>
              💰 Акты на оплату
            </BigButton>
          </>
        )}

        <BigButton variant="primary" size="sm" fullWidth onClick={() => navigate(`/client/${id}`)}>

          📊 Прогресс работ (квартиры, зоны, приёмка)

        </BigButton>

        <BigButton variant="secondary" size="sm" fullWidth onClick={() => navigate(`/object/${id}/documents`)}>

          <span className="flex items-center justify-center gap-2">
            <FileText size={16} />
            Документы
          </span>

        </BigButton>

        <BigButton variant="secondary" size="sm" fullWidth onClick={() => navigate(`/object/${id}/setup`)}>

          📥 Импорт сметы и подрядчики

        </BigButton>

        {(hasBuilt || hasImported) && (

          <BigButton variant="secondary" size="sm" fullWidth onClick={() => navigate(`/object/${id}/hidden-works`)}>

            <span className="flex items-center justify-center gap-2">
              <ShieldAlert size={16} />
              Скрытые работы
              {pendingHiddenWorks > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs bg-amber-500 text-white">{pendingHiddenWorks}</span>
              )}
            </span>

          </BigButton>

        )}

        <BigButton variant="ghost" size="sm" fullWidth onClick={() => navigate('/team')}>

          👷 Назначить мастеров на задачи

        </BigButton>

        {(hasBuilt || hasImported) && (

          <p className="text-xs-mobile text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl">

            Workflow настроен — задачи и зоны в разделе «Прогресс работ»

          </p>

        )}

      </div>



      <div className="flex border-b border-gray-100 bg-white overflow-x-auto scrollbar-hide">

        {[

          { key: 'organizations', label: 'Организации', icon: Users },

          { key: 'access', label: 'Доступ', icon: Users },

          { key: 'expenses', label: 'Расходы', icon: Wallet },

          { key: 'chat', label: 'Чат', icon: MessageSquare },

        ].map((tab) => (

          <button

            key={tab.key}

            onClick={() => { haptic('selection'); setActiveTab(tab.key as TabType) }}

            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs-mobile font-medium transition-colors ${activeTab === tab.key ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}

          >

            <tab.icon size={20} /><span>{tab.label}</span>

          </button>

        ))}

      </div>



      <div className="p-4">

        {activeTab === 'organizations' && (

          <div className="space-y-3">

            <h3 className="text-base-mobile font-semibold text-gray-900">Подрядные организации</h3>

            <p className="text-sm-mobile text-gray-500">Видны заказчику в кабинете объекта</p>

            {(organizations || []).length === 0 ? (

              <p className="text-sm-mobile text-gray-400 py-4 text-center">Организации не добавлены при создании</p>

            ) : (

              (organizations || []).map((org) => (

                <div key={org.id} className="bg-white rounded-xl p-4 border border-gray-100">

                  <p className="font-semibold text-gray-900">{org.name}</p>

                  <p className="text-sm-mobile text-gray-500">{org.specialty}</p>

                  {org.phone && <p className="text-sm-mobile text-primary-600 mt-1">{org.phone}</p>}

                </div>

              ))

            )}

            <BigButton

              variant="secondary"

              size="sm"

              fullWidth

              onClick={() => {

                if (!id) return

                addOrganization(id, { name: 'Новая организация', specialty: 'Подрядные работы', phone: '' })

              }}

            >

              + Добавить организацию

            </BigButton>

          </div>

        )}



        {activeTab === 'access' && id && (

          <div className="space-y-4">

            <ObjectWorkerAccessPanel objectId={id} />

            <div>

              <h3 className="text-base-mobile font-semibold text-gray-900 mb-2">Подключённые мастера</h3>

              <ObjectAccessMembersPanel

                objectId={id}

                canRevoke={role === 'foreman'}

                revokeFilter={['worker']}

                revokedByName={fullName || 'Прораб'}

              />

            </div>

          </div>

        )}



        {activeTab === 'expenses' && (

          <div className="space-y-4">

            <BigButton variant="primary" size="lg" fullWidth icon={<Wallet size={20} />} onClick={() => navigate(`/object/${id}/expense/new`)}>➕ Добавить расход</BigButton>

            <div className="text-center py-8 text-gray-400"><Wallet size={32} className="mx-auto mb-2" /><p className="text-sm-mobile">Расходы появятся здесь</p></div>

          </div>

        )}



        {activeTab === 'chat' && (

          <div className="space-y-4">

            <div className="text-center py-8 text-gray-400"><MessageSquare size={32} className="mx-auto mb-2" /><p className="text-sm-mobile">Чат с командой</p><p className="text-xs-mobile mt-1">Используйте чат внутри задач workflow</p></div>

          </div>

        )}

      </div>

    </div>

  )

}

