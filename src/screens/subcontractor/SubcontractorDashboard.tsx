import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Layers, KeyRound, Copy, Check, Building2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { SubcontractorHeader } from '@components/subcontractor/SubcontractorHeader'
import { useUserStore } from '@store/userStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useObjectStore } from '@store/objectStore'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { getCurrentUserKey } from '@utils/notificationFilter'
import { getAccessibleObjects } from '@utils/accessibleObjects'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { STATUS_COLORS, STATUS_LABELS } from '@api/clientView'
import type { WorkType } from '@types'

export const SubcontractorDashboard: React.FC = () => {
  const navigate = useNavigate()
  const contractorId = useUserStore((s) => s.contractorId)
  const org = useProjectWorkflowStore((s) => s.contractors.find((c) => c.id === contractorId))
  const [copied, setCopied] = useState(false)
  const tasks = useProjectWorkflowStore((s) =>
    Object.values(s.tasks).filter((t) => t.contractorId === contractorId),
  )
  const contractorWorkerAssignments = useObjectStore((s) => s.contractorWorkerAssignments)
  const accessMembers = useObjectAccessStore((s) => s.members)
  const userKey = getCurrentUserKey()
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const refresh = () => {
      void (async () => {
        await Promise.all([
          useObjectAccessStore.persist.rehydrate(),
          useObjectStore.persist.rehydrate(),
        ])
        setRefreshKey((k) => k + 1)
      })()
    }
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const myObjects = useMemo(
    () => getAccessibleObjects(userKey, 'subcontractor'),
    [userKey, accessMembers, refreshKey],
  )

  const activeTasks = tasks.filter((t) => t.status !== 'done')
  const assignedCount = activeTasks.filter((t) => contractorWorkerAssignments[t.id]).length

  const byWorkType = useMemo(() => {
    const map = new Map<WorkType, { total: number; active: number; review: number }>()
    for (const t of tasks) {
      const cur = map.get(t.workType) ?? { total: 0, active: 0, review: 0 }
      cur.total++
      if (t.status !== 'done') cur.active++
      if (t.status === 'review') cur.review++
      map.set(t.workType, cur)
    }
    return [...map.entries()].sort((a, b) => b[1].active - a[1].active)
  }, [tasks])

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <SubcontractorHeader title="Мои работы" />

      <div className="px-4 -mt-2 mb-4 flex gap-3">
        <div className="flex-1 bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
          <p className="text-2xl-mobile font-bold text-primary-600">{activeTasks.length}</p>
          <p className="text-xs-mobile text-gray-500">активных</p>
        </div>
        <div className="flex-1 bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
          <p className="text-2xl-mobile font-bold text-emerald-600">{assignedCount}</p>
          <p className="text-xs-mobile text-gray-500">мастерам</p>
        </div>
        <div className="flex-1 bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
          <p className="text-2xl-mobile font-bold text-amber-600">
            {tasks.filter((t) => t.status === 'review').length}
          </p>
          <p className="text-xs-mobile text-gray-500">на проверке</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        <button
          type="button"
          onClick={() => navigate('/export')}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm-mobile font-semibold flex items-center justify-center gap-2"
        >
          <Download size={18} /> Экспорт данных
        </button>

        <button
          type="button"
          onClick={() => navigate('/connect')}
          className="w-full bg-primary-600 text-white rounded-xl p-4 text-sm-mobile font-semibold flex items-center justify-center gap-2"
        >
          <KeyRound size={18} /> Подключиться к объекту по коду
        </button>

        {org?.inviteCode && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs-mobile text-gray-500 flex items-center gap-1">
                  <KeyRound size={14} /> Код вашей организации
                </p>
                <p className="text-xl-mobile font-bold text-primary-700">{org.inviteCode}</p>
                <p className="text-xs-mobile text-gray-400 mt-1">
                  Для прорабов и мастеров при регистрации. К объекту подключайтесь кодом от заказчика.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(org.inviteCode!)
                    setCopied(true)
                    toast.success('Код скопирован')
                    setTimeout(() => setCopied(false), 2000)
                  } catch {
                    toast.error('Не удалось скопировать')
                  }
                }}
                className="shrink-0 p-2 rounded-lg bg-primary-50 text-primary-600"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>
        )}

        {!contractorId && (
          <p className="text-sm-mobile text-amber-700 bg-amber-50 p-4 rounded-xl">
            Организация не выбрана. Выйдите и зарегистрируйтесь заново.
          </p>
        )}

        {myObjects.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-1">
              <Building2 size={20} className="text-gray-600" />
              <h2 className="text-base-mobile font-semibold text-gray-900">Мои объекты</h2>
            </div>
            {myObjects.map((obj) => (
              <button
                key={obj.id}
                type="button"
                onClick={() => navigate(`/client/${obj.id}`)}
                className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-base-mobile font-semibold text-gray-900 truncate">{obj.name}</p>
                    {obj.client_name && (
                      <p className="text-xs-mobile text-gray-500">Заказчик: {obj.client_name}</p>
                    )}
                    <p className="text-sm-mobile text-gray-500 mt-0.5">{obj.address}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 shrink-0" />
                </div>
              </button>
            ))}
          </>
        )}

        {contractorId && tasks.length === 0 && myObjects.length === 0 && (
          <p className="text-sm-mobile text-gray-500 text-center py-12">
            Заказчик ещё не добавил вашу организацию на объект. Когда добавит — объект появится здесь автоматически.
          </p>
        )}

        {byWorkType.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-1">
              <Layers size={20} className="text-gray-600" />
              <h2 className="text-base-mobile font-semibold text-gray-900">По видам работ</h2>
            </div>
            {byWorkType.map(([wt, stat]) => (
              <button
                key={wt}
                type="button"
                onClick={() => navigate('/subcontractor/tasks')}
                className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base-mobile font-semibold text-gray-900">{WORK_TYPE_LABELS[wt]}</p>
                    <p className="text-sm-mobile text-gray-500 mt-0.5">
                      {stat.active} активных · {stat.review} на проверке · {stat.total} всего
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 shrink-0" />
                </div>
              </button>
            ))}
          </>
        )}

        {activeTasks.slice(0, 5).map((task) => (
          <div key={task.id} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm-mobile font-medium text-gray-900 truncate">{task.title}</p>
                <p className="text-xs-mobile text-gray-500">{WORK_TYPE_LABELS[task.workType]}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs-mobile shrink-0 ${STATUS_COLORS[task.status]}`}>
                {STATUS_LABELS[task.status]}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/workflow/${task.id}`)}
              className="mt-2 text-primary-600 text-sm-mobile font-medium flex items-center gap-1"
            >
              Открыть <ChevronRight size={16} />
            </button>
          </div>
        ))}

        {activeTasks.length > 5 && (
          <button
            type="button"
            onClick={() => navigate('/subcontractor/tasks')}
            className="w-full py-3 text-primary-600 text-sm-mobile font-medium"
          >
            Все задачи ({activeTasks.length}) →
          </button>
        )}
      </div>
    </div>
  )
}
