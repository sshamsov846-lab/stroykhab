import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, MapPin, Filter } from 'lucide-react'
import { SubcontractorHeader } from '@components/subcontractor/SubcontractorHeader'
import { useUserStore } from '@store/userStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useObjectStore } from '@store/objectStore'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { STATUS_COLORS, STATUS_LABELS } from '@api/clientView'
import type { TaskStatus } from '@types'

type StatusFilter = 'all' | TaskStatus | 'unassigned'

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'pending', label: 'Ожидают' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'review', label: 'На проверке' },
  { id: 'rejected', label: 'Переделка' },
  { id: 'done', label: 'Готово' },
  { id: 'unassigned', label: 'Без мастера' },
]

export const SubcontractorTasks: React.FC = () => {
  const navigate = useNavigate()
  const contractorId = useUserStore((s) => s.contractorId)
  const allTasks = useProjectWorkflowStore((s) =>
    Object.values(s.tasks).filter((t) => t.contractorId === contractorId && !t.isSideJob),
  )
  const workers = useObjectStore((s) => s.getContractorWorkers(contractorId))
  const assignments = useObjectStore((s) => s.contractorWorkerAssignments)
  const assignWorker = useObjectStore((s) => s.assignContractorWorkerToTask)

  const [filter, setFilter] = useState<StatusFilter>('all')

  const stats = useMemo(() => ({
    total: allTasks.length,
    inProgress: allTasks.filter((t) => t.status === 'in_progress').length,
    review: allTasks.filter((t) => t.status === 'review').length,
    unassigned: allTasks.filter((t) => !assignments[t.id]).length,
  }), [allTasks, assignments])

  const filtered = useMemo(() => {
    return allTasks.filter((t) => {
      if (filter === 'unassigned') return !assignments[t.id]
      if (filter === 'all') return true
      return t.status === filter
    })
  }, [allTasks, filter, assignments])

  const workerName = (workerId?: string) =>
    workers.find((w) => w.id === workerId)?.name ?? '—'

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <SubcontractorHeader title="Задачи" subtitle="Контроль работ мастеров" />

      <div className="px-4 -mt-2 mb-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Всего', value: stats.total },
            { label: 'В работе', value: stats.inProgress },
            { label: 'Проверка', value: stats.review },
            { label: 'Без мастера', value: stats.unassigned },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-2 text-center border border-gray-100 shadow-sm">
              <p className="text-lg-mobile font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-500 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm-mobile font-medium text-gray-700">Фильтр</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs-mobile font-medium transition-colors ${
                filter === f.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm-mobile text-gray-500 text-center py-12">
            {allTasks.length === 0
              ? 'Прораб ещё не назначил работы вашей организации'
              : 'Нет задач по выбранному фильтру'}
          </p>
        )}

        {filtered.map((task) => {
          const assignedId = assignments[task.id]
          return (
            <div key={task.id} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-xs-mobile text-primary-600">{WORK_TYPE_LABELS[task.workType]}</p>
                  <h4 className="text-base-mobile font-semibold text-gray-900">{task.title}</h4>
                  <div className="flex items-center gap-1 text-xs-mobile text-gray-400 mt-1">
                    <MapPin size={12} />
                    {task.section} · под. {task.entrance} · эт. {task.floor}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs-mobile shrink-0 ${STATUS_COLORS[task.status]}`}>
                  {STATUS_LABELS[task.status]}
                </span>
              </div>

              <div className="mb-3">
                <label className="text-xs-mobile font-medium text-gray-600">Мастер</label>
                <select
                  value={assignedId || ''}
                  onChange={(e) => assignWorker(task.id, e.target.value || null)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
                >
                  <option value="">— не назначен —</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                {assignedId && (
                  <p className="text-xs-mobile text-gray-500 mt-1">
                    Назначен: {workerName(assignedId)}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate(`/workflow/${task.id}`)}
                className="w-full flex items-center justify-between text-primary-600 text-sm-mobile font-medium py-1"
              >
                Детали и история
                <ChevronRight size={18} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
