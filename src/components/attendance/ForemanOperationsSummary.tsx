import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Flame, AlertTriangle, PauseCircle, Clock, ChevronRight } from 'lucide-react'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useAttendanceStore } from '@store/attendanceStore'
import { getOverdueTasks, getDueTodayTasks } from '@utils/taskDeadlines'
import { DOWNTIME_REASONS } from '@/types/attendance'
import { formatDurationMs } from '@utils/timesheetCalc'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import type { ConstructionObject } from '@types'

interface Props {
  objects: ConstructionObject[]
}

export const ForemanOperationsSummary: React.FC<Props> = ({ objects }) => {
  const navigate = useNavigate()
  const tasks = useProjectWorkflowStore((s) => s.tasks)
  const presentToday = useAttendanceStore((s) => s.getPresentToday())
  const activeDowntimes = useAttendanceStore((s) => s.getActiveDowntimes())
  const getDowntimeMs = useAttendanceStore((s) => s.getDowntimeMs)

  const objectIds = new Set(objects.map((o) => o.id))
  const overdueTasks = getOverdueTasks(tasks, objectIds)
  const dueTodayTasks = getDueTodayTasks(tasks, objectIds)

  const hasContent =
    presentToday.length > 0 ||
    overdueTasks.length > 0 ||
    dueTodayTasks.length > 0 ||
    activeDowntimes.length > 0

  if (!hasContent) return null

  return (
    <div className="px-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm-mobile font-semibold text-gray-900">Сводка сегодня</p>
        <button
          type="button"
          onClick={() => navigate('/timesheet')}
          className="text-xs-mobile text-primary-600 font-medium flex items-center gap-0.5"
        >
          <Clock size={14} /> Табель
        </button>
      </div>

      {presentToday.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-emerald-700" />
            <p className="text-sm-mobile font-semibold text-emerald-900">На объекте ({presentToday.length})</p>
          </div>
          <div className="space-y-1">
            {presentToday.slice(0, 6).map((c) => (
              <p key={c.id} className="text-xs-mobile text-emerald-800">
                {c.workerName} · {c.objectName}
              </p>
            ))}
            {presentToday.length > 6 && (
              <p className="text-xs-mobile text-emerald-600">+ ещё {presentToday.length - 6}</p>
            )}
          </div>
        </div>
      )}

      {dueTodayTasks.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={18} className="text-orange-600" />
            <p className="text-sm-mobile font-semibold text-orange-900">Горит сегодня ({dueTodayTasks.length})</p>
          </div>
          <div className="space-y-2">
            {dueTodayTasks.slice(0, 4).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/workflow/${t.id}`)}
                className="w-full flex items-center justify-between text-left text-xs-mobile text-orange-900 bg-white/60 rounded-lg px-2 py-1.5"
              >
                <span className="truncate">{t.title || WORK_TYPE_LABELS[t.workType]}</span>
                <ChevronRight size={14} className="shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {overdueTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-red-600" />
            <p className="text-sm-mobile font-semibold text-red-900">Просрочено ({overdueTasks.length})</p>
          </div>
          <div className="space-y-2">
            {overdueTasks.slice(0, 4).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/workflow/${t.id}`)}
                className="w-full flex items-center justify-between text-left text-xs-mobile text-red-900 bg-white/60 rounded-lg px-2 py-1.5"
              >
                <span className="truncate">
                  {t.title || WORK_TYPE_LABELS[t.workType]}
                  {t.dueDate && ` · до ${new Date(t.dueDate).toLocaleDateString('ru-RU')}`}
                </span>
                <ChevronRight size={14} className="shrink-0" />
              </button>
            ))}
            {overdueTasks.length > 4 && (
              <p className="text-xs-mobile text-red-700">+ ещё {overdueTasks.length - 4} задач</p>
            )}
          </div>
        </div>
      )}

      {activeDowntimes.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <PauseCircle size={18} className="text-red-700" />
            <p className="text-sm-mobile font-semibold text-red-900">Простои ({activeDowntimes.length})</p>
          </div>
          <div className="space-y-2">
            {activeDowntimes.slice(0, 4).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => navigate(`/workflow/${d.taskId}`)}
                className="w-full text-left bg-white/70 rounded-lg px-2 py-1.5"
              >
                <p className="text-xs-mobile font-medium text-red-900 truncate">{d.taskTitle}</p>
                <p className="text-[10px] text-red-700">
                  {DOWNTIME_REASONS[d.reason]}
                  {d.reasonText ? `: ${d.reasonText}` : ''}
                  {' · '}
                  {formatDurationMs(getDowntimeMs(d.taskId))}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
