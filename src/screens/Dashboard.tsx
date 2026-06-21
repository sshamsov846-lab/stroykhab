import React, { useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { Plus, TrendingUp, AlertTriangle, CheckCircle2, HardHat, Clock, KeyRound } from 'lucide-react'

import { useTelegram } from '@hooks/useTelegram'

import { useOffline } from '@hooks/useOffline'

import { ObjectCard } from '@components/ObjectCard'

import { BigButton } from '@components/BigButton'

import { NotificationBell } from '@components/NotificationBell'

import { getObjects } from '@api/supabase'

import { filterObjectsForRole } from '@utils/sideJob'

import type { ConstructionObject } from '@types'

import { ForemanOperationsSummary } from '@components/attendance/ForemanOperationsSummary'

import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

import { getOverdueTasks, getDueTodayTasks } from '@utils/taskDeadlines'



export const Dashboard: React.FC = () => {

  const navigate = useNavigate()

  const { setMainButton, hideMainButton, haptic } = useTelegram()

  const { isOnline, queueLength } = useOffline()

  const [objects, setObjects] = useState<ConstructionObject[]>([])

  const [isLoading, setIsLoading] = useState(true)

  const [filter, setFilter] = useState<'all' | 'active' | 'delayed' | 'done'>('all')



  const workflowTasks = useProjectWorkflowStore((s) => s.tasks)

  useEffect(() => { loadObjects() }, [])



  useEffect(() => {

    setMainButton('➕ Новый объект', () => { haptic('light'); navigate('/object/new') })

    return () => hideMainButton()

  }, [setMainButton, hideMainButton, navigate, haptic])



  const loadObjects = async () => {

    try {

      setIsLoading(true)

      const data = await getObjects()

      setObjects(filterObjectsForRole(data || [], 'foreman'))

    } catch (error) {

      console.error('Ошибка загрузки:', error)

    } finally {

      setIsLoading(false)

    }

  }



  const filteredObjects = objects.filter((obj) => (filter === 'all' ? true : obj.status === filter))



  const objectIds = new Set(objects.map((o) => o.id))
  const overdueTaskCount = getOverdueTasks(workflowTasks, objectIds).length
  const dueTodayCount = getDueTodayTasks(workflowTasks, objectIds).length

  const stats = {

    total: objects.length,

    active: objects.filter((o) => o.status === 'active').length,

    delayed: objects.filter((o) => o.status === 'delayed').length,

    done: objects.filter((o) => o.status === 'done' || o.status === 'completed').length,

    totalBudget: objects.reduce((sum, o) => sum + o.budget_total, 0),

    totalSpent: objects.reduce((sum, o) => sum + o.budget_spent, 0),

    overdueTasks: overdueTaskCount,

    dueTodayTasks: dueTodayCount,

  }



  if (isLoading) {

    return (

      <div className="p-4 space-y-4">

        <div className="h-8 bg-gray-200 rounded-lg animate-pulse" />

        <div className="grid grid-cols-2 gap-3">

          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />)}

        </div>

        {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}

      </div>

    )

  }



  return (

    <div className="pb-24">

      {!isOnline && (

        <div className="bg-red-500 text-white text-center py-2 text-sm-mobile sticky top-0 z-50">

          ⚠️ Офлайн-режим. Данные сохранятся при появлении сети ({queueLength} в очереди)

        </div>

      )}



      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">

        <div>

        <h1 className="text-2xl-mobile font-bold text-gray-900">Мои объекты</h1>

        <p className="text-sm-mobile text-gray-500">
          {stats.active} активных
          {stats.overdueTasks > 0 && ` · ${stats.overdueTasks} просрочено`}
          {stats.dueTodayTasks > 0 && ` · ${stats.dueTodayTasks} горит`}
        </p>

        </div>

        <NotificationBell />

      </div>



      <div className="px-4 mb-4">

        <BigButton
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => { haptic('light'); navigate('/connect') }}
        >
          <span className="inline-flex items-center gap-2">
            <KeyRound size={18} /> Подключиться к объекту
          </span>
        </BigButton>

      </div>

      <div className="px-4 mb-4">

        <BigButton
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => { haptic('light'); navigate('/side-job/new') }}
        >
          <span className="inline-flex items-center gap-2">
            <HardHat size={18} /> Создать подработку
          </span>
        </BigButton>

      </div>



      <div className="px-4 mb-4">

        <BigButton variant="ghost" size="sm" fullWidth onClick={() => { haptic('light'); navigate('/timesheet') }}>

          <span className="inline-flex items-center gap-2">

            <Clock size={18} /> Табель · явка и часы

          </span>

        </BigButton>

      </div>



      <ForemanOperationsSummary objects={objects} />



      <div className="px-4 mb-4">

        <div className="grid grid-cols-2 gap-3">

          <div className="bg-primary-50 rounded-2xl p-3 border border-primary-100">

            <div className="flex items-center gap-2 mb-1">

              <TrendingUp size={18} className="text-primary-600" />

              <span className="text-xs-mobile text-primary-700">Бюджет</span>

            </div>

            <p className="text-lg-mobile font-bold text-primary-900">{stats.totalSpent.toLocaleString('ru-RU')} ₽</p>

            <p className="text-xs-mobile text-primary-600">из {stats.totalBudget.toLocaleString('ru-RU')} ₽</p>

          </div>

          <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">

            <div className="flex items-center gap-2 mb-1">

              <CheckCircle2 size={18} className="text-emerald-600" />

              <span className="text-xs-mobile text-emerald-700">Завершено</span>

            </div>

            <p className="text-lg-mobile font-bold text-emerald-900">{stats.done}</p>

            <p className="text-xs-mobile text-emerald-600">объектов</p>

          </div>

          <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">

            <div className="flex items-center gap-2 mb-1">

              <AlertTriangle size={18} className="text-amber-600" />

              <span className="text-xs-mobile text-amber-700">Просрочено</span>

            </div>

            <p className="text-lg-mobile font-bold text-amber-900">{stats.overdueTasks || stats.delayed}</p>

            <p className="text-xs-mobile text-amber-600">задач / объектов</p>

          </div>

          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">

            <div className="flex items-center gap-2 mb-1">

              <Plus size={18} className="text-gray-600" />

              <span className="text-xs-mobile text-gray-700">Всего</span>

            </div>

            <p className="text-lg-mobile font-bold text-gray-900">{stats.total}</p>

            <p className="text-xs-mobile text-gray-600">объектов</p>

          </div>

        </div>

      </div>



      <div className="px-4 mb-4">

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">

          {[

            { key: 'all', label: 'Все', count: stats.total },

            { key: 'active', label: 'В работе', count: stats.active },

            { key: 'delayed', label: 'Просрочено', count: stats.delayed },

            { key: 'done', label: 'Готово', count: stats.done },

          ].map((f) => (

            <button

              key={f.key}

              type="button"

              onClick={() => { haptic('selection'); setFilter(f.key as typeof filter) }}

              className={`px-4 py-2 rounded-full text-sm-mobile font-medium whitespace-nowrap transition-all ${

                filter === f.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'

              }`}

            >

              {f.label} {f.count > 0 && `(${f.count})`}

            </button>

          ))}

        </div>

      </div>



      <div className="px-4 space-y-3">

        {filteredObjects.length === 0 ? (

          <div className="text-center py-12">

            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">

              <Plus size={32} className="text-gray-400" />

            </div>

            <p className="text-lg-mobile font-semibold text-gray-700 mb-1">Нет объектов</p>

            <p className="text-sm-mobile text-gray-500 mb-4">

              {filter === 'all' ? 'Создайте первый объект, чтобы начать' : 'Нет объектов с таким статусом'}

            </p>

            {filter === 'all' && (

              <BigButton variant="primary" size="md" onClick={() => navigate('/object/new')}>

                ➕ Создать объект

              </BigButton>

            )}

          </div>

        ) : (

          filteredObjects.map((obj) => (

            <ObjectCard

              key={obj.id}

              object={obj}

              onClick={() => {
                haptic('light')
                navigate(obj.isSideJob ? `/side-job/${obj.id}` : `/object/${obj.id}`)
              }}

            />

          ))

        )}

      </div>

    </div>

  )

}


