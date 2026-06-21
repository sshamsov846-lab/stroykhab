import React, { useEffect, useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import {

  ChevronRight,

  Wallet,

  Settings,

  Plus,

  AlertTriangle,

  CheckCircle2,

  CalendarClock,

  Clock,

} from 'lucide-react'

import { useTelegram } from '@hooks/useTelegram'

import { useUserStore } from '@store/userStore'

import { getObjects } from '@api/supabase'

import { filterObjectsForRole } from '@utils/sideJob'

import { useAuditLogStore } from '@store/auditLogStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useNotificationStore } from '@store/notificationStore'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'
import { filterNotificationsForUser } from '@utils/notificationFilter'
import { buildPhotoReportsFromWorkflow, buildFinanceRecordsFromPayroll } from '@utils/workflowClientData'

import { NotificationBell } from '@components/NotificationBell'

import { PhotoReportFeed } from '@components/client/PhotoReportFeed'

import {

  buildAttentionItems,

  buildTodayActivity,

  formatObjectSubtitle,

  formatProgressLabel,

  getUpcomingPaymentsThisMonth,

  RECENT_OBJECTS_LIMIT,

} from '@utils/clientHomeHelpers'

import type { ConstructionObject } from '@types'



const ATTENTION_STYLE = {
  budget: 'border-red-300 bg-red-50',
  overdue: 'border-orange-200 bg-orange-50',
} as const



export const ClientHome: React.FC = () => {

  const navigate = useNavigate()

  const { haptic } = useTelegram()

  const fullName = useUserStore((s) => s.fullName)

  const workflowTasks = useProjectWorkflowStore((s) => s.tasks)
  const payrollRecords = useWorkerPayrollStore((s) => s.records)
  const payrollAccounts = useWorkerPayrollStore((s) => s.accounts)
  const allNotifications = useNotificationStore((s) => s.notifications)

  const auditEntries = useAuditLogStore((s) => s.entries)

  const [objects, setObjects] = useState<ConstructionObject[]>([])

  const [loading, setLoading] = useState(true)



  useEffect(() => {

    getObjects()
      .then((data) => setObjects(filterObjectsForRole(data, 'client')))
      .finally(() => setLoading(false))

  }, [])



  const totalBudget = objects.reduce((s, o) => s + o.budget_total, 0)

  const totalSpent = objects.reduce((s, o) => s + o.budget_spent, 0)

  const avgProgress = objects.length

    ? Math.round(objects.reduce((s, o) => s + (o.progress ?? 0), 0) / objects.length)

    : 0



  const recentObjects = objects.slice(0, RECENT_OBJECTS_LIMIT)

  const totalCount = objects.length



  const attentionItems = useMemo(() => buildAttentionItems(objects), [objects])

  const photoReports = useMemo(
    () => buildPhotoReportsFromWorkflow(Object.values(workflowTasks)),
    [workflowTasks],
  )

  const financeRecords = useMemo(
    () => buildFinanceRecordsFromPayroll(payrollRecords, payrollAccounts, workflowTasks),
    [payrollRecords, payrollAccounts, workflowTasks],
  )

  const upcomingPayments = useMemo(() => {
    const planned = financeRecords.filter((r) => r.status === 'planned')
    const byObject = new Map<string, import('@utils/clientHomeHelpers').UpcomingPaymentGroup>()
    for (const r of planned) {
      const key = r.objectId || r.objectName
      const item = { id: r.id, title: r.title, amount: r.amount, date: r.date }
      const existing = byObject.get(key)
      if (existing) {
        existing.amount += r.amount
        existing.items.push(item)
      } else {
        byObject.set(key, {
          objectId: r.objectId,
          objectName: r.objectName,
          amount: r.amount,
          items: [item],
        })
      }
    }
    return getUpcomingPaymentsThisMonth([...byObject.values()])
  }, [financeRecords])

  const userNotifications = useMemo(
    () => filterNotificationsForUser(allNotifications),
    [allNotifications],
  )

  const todayActivity = useMemo(
    () => buildTodayActivity(auditEntries, photoReports, userNotifications),
    [auditEntries, photoReports, userNotifications],
  )



  const monthLabel = new Date().toLocaleDateString('ru-RU', { month: 'long' })



  return (

    <div className="pb-24">

      <div className="bg-primary-600 text-white px-4 pt-6 pb-8 rounded-b-3xl">

        <div className="flex items-start justify-between gap-2">

          <div className="min-w-0">

            <p className="text-sm-mobile text-primary-100">Добро пожаловать</p>

            <h1 className="text-2xl-mobile font-bold mt-1 truncate" lang="ru">

              {fullName || 'Заказчик'}

            </h1>

          </div>

          <div className="flex gap-1 shrink-0">

            <NotificationBell variant="onPrimary" />

            <button

              type="button"

              onClick={() => navigate('/settings')}

              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20"

              aria-label="Настройки"

            >

              <Settings size={20} className="text-white" />

            </button>

          </div>

        </div>



        <div className="grid grid-cols-2 gap-3 mt-5">

          <div className="bg-white/15 rounded-2xl p-3 backdrop-blur">

            <p className="text-xs-mobile text-primary-100">Прогресс</p>

            <p className="text-xl-mobile font-bold">{formatProgressLabel(avgProgress)}</p>

          </div>

          <div className="bg-white/15 rounded-2xl p-3 backdrop-blur">

            <p className="text-xs-mobile text-primary-100">Объектов</p>

            <p className="text-xl-mobile font-bold">{totalCount}</p>

          </div>

        </div>

      </div>



      <div className="px-4 -mt-4 space-y-5">

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">

          <div className="flex items-center gap-2 mb-2">

            <Wallet size={18} className="text-primary-600" />

            <span className="text-sm-mobile font-medium text-gray-700">Общий бюджет</span>

          </div>

          <p className="text-xl-mobile font-bold text-gray-900">

            {totalSpent.toLocaleString('ru-RU')} / {totalBudget.toLocaleString('ru-RU')} ₽

          </p>

          <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">

            <div

              className="h-full bg-primary-500 rounded-full"

              style={{ width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}%` }}

            />

          </div>

          <button

            type="button"

            onClick={() => { haptic('light'); navigate('/finances') }}

            className="text-sm-mobile text-primary-600 font-medium mt-2"

          >

            Подробнее в «Финансы» →

          </button>

        </div>



        <section>

          <h2 className="text-base-mobile font-semibold text-gray-900 mb-3">Требует внимания</h2>

          {attentionItems.length === 0 ? (

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">

              <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />

              <p className="text-sm-mobile text-emerald-800 font-medium">Всё под контролем ✅</p>

            </div>

          ) : (

            <div className="space-y-2">

              {attentionItems.map((item) => (

                <button

                  key={item.id}

                  type="button"

                  onClick={() => {

                    haptic('light')

                    if (item.objectId) navigate(`/client/${item.objectId}`)

                  }}

                  className={`w-full text-left rounded-2xl p-3 border flex gap-3 ${ATTENTION_STYLE[item.kind]}`}

                >

                  <AlertTriangle

                    size={18}

                    className={item.kind === 'budget' ? 'text-red-600 shrink-0 mt-0.5' : 'text-amber-600 shrink-0 mt-0.5'}

                  />

                  <div className="flex-1 min-w-0">

                    <p className={`text-sm-mobile font-semibold truncate ${item.kind === 'budget' ? 'text-red-900' : 'text-gray-900'}`}>

                      {item.title}

                    </p>

                    <p className="text-xs-mobile text-gray-600 mt-0.5 line-clamp-2">{item.subtitle}</p>

                  </div>

                  <ChevronRight size={16} className="text-gray-400 shrink-0 self-center" />

                </button>

              ))}

            </div>

          )}

        </section>



        {(upcomingPayments.total > 0 || upcomingPayments.groups.length > 0) && (

          <section>

            <div className="flex items-center justify-between mb-3">

              <h2 className="text-base-mobile font-semibold text-gray-900">Ближайшие платежи</h2>

              <button

                type="button"

                onClick={() => { haptic('light'); navigate('/finances') }}

                className="text-sm-mobile text-primary-600"

              >

                Все

              </button>

            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">

              <div className="flex items-center gap-2">

                <CalendarClock size={18} className="text-amber-600" />

                <p className="text-sm-mobile text-gray-600">

                  В {monthLabel}:{' '}

                  <span className="font-bold text-gray-900">{upcomingPayments.total.toLocaleString('ru-RU')} ₽</span>

                </p>

              </div>

              {upcomingPayments.groups.map((g) => (

                <div key={g.objectId} className="flex items-center justify-between gap-2 text-sm-mobile">

                  <span className="text-gray-700 truncate">{g.objectName}</span>

                  <span className="font-semibold text-amber-700 shrink-0">{g.amount.toLocaleString('ru-RU')} ₽</span>

                </div>

              ))}

            </div>

          </section>

        )}



        {upcomingPayments.total === 0 && (

          <section>

            <h2 className="text-base-mobile font-semibold text-gray-900 mb-3">Ближайшие платежи</h2>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">

              <CalendarClock size={24} className="mx-auto text-gray-300 mb-2" />

              <p className="text-sm-mobile text-gray-500">В этом месяце предстоящих платежей нет</p>

            </div>

          </section>

        )}



        <section>

          <div className="flex items-center justify-between mb-3 gap-2">

            <h2 className="text-base-mobile font-semibold text-gray-900">Недавние объекты</h2>

            <div className="flex items-center gap-2 shrink-0">

              {totalCount > RECENT_OBJECTS_LIMIT && (

                <span className="text-xs-mobile text-gray-400">

                  Показаны {Math.min(RECENT_OBJECTS_LIMIT, totalCount)} из {totalCount}

                </span>

              )}

              <button type="button" onClick={() => navigate('/objects')} className="text-sm-mobile text-primary-600">

                Все

              </button>

            </div>

          </div>

          {loading ? (

            <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />

          ) : recentObjects.length === 0 ? (

            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">

              <p className="text-sm-mobile text-gray-500 mb-3">Создайте первый объект</p>

              <button

                type="button"

                onClick={() => { haptic('light'); navigate('/client/object/new') }}

                className="text-sm-mobile text-primary-600 font-medium"

              >

                + Создать объект

              </button>

            </div>

          ) : (

            <div className="space-y-2">

              {recentObjects.map((obj) => (

                <button

                  key={obj.id}

                  type="button"

                  onClick={() => { haptic('light'); navigate(`/client/${obj.id}`) }}

                  className="w-full flex items-center gap-3 bg-white rounded-2xl p-3 border border-gray-100 text-left"

                >

                  <div className="flex-1 min-w-0">

                    <p className="font-semibold text-gray-900 truncate">{obj.name}</p>

                    <p className="text-xs-mobile text-gray-500">{formatObjectSubtitle(obj)}</p>

                  </div>

                  <ChevronRight size={18} className="text-gray-300" />

                </button>

              ))}

            </div>

          )}

        </section>



        {todayActivity.length > 0 && (

          <section>

            <h2 className="text-base-mobile font-semibold text-gray-900 mb-3">Сегодня</h2>

            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">

              {todayActivity.map((item) => (

                <div key={item.id} className="flex gap-3 p-3 text-sm-mobile">

                  <Clock size={16} className="text-gray-400 shrink-0 mt-0.5" />

                  <div className="flex-1 min-w-0">

                    <span className="text-xs-mobile text-gray-400">{item.time}</span>

                    <p className="text-gray-800 truncate">{item.text}</p>

                  </div>

                </div>

              ))}

            </div>

          </section>

        )}



        <section>

          <h2 className="text-base-mobile font-semibold text-gray-900 mb-3">Последние фотоотчёты</h2>

          <PhotoReportFeed reports={photoReports} horizontal limit={6} />

        </section>

      </div>



      <button

        type="button"

        onClick={() => { haptic('medium'); navigate('/client/object/new') }}

        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 bg-primary-600 text-white px-5 py-3.5 rounded-full shadow-lg shadow-primary-600/30 active:scale-95 transition-transform"

        aria-label="Создать объект"

      >

        <Plus size={22} strokeWidth={2.5} />

        <span className="text-sm-mobile font-semibold">Создать объект</span>

      </button>

    </div>

  )

}


