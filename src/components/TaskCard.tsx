import React from 'react'
import { CheckCircle2, Clock, AlertTriangle, Circle } from 'lucide-react'
import type { Task, TaskStatus } from '@types'

interface TaskCardProps {
  task: Task
  onStatusChange?: (status: TaskStatus) => void
  onClick?: () => void
}

const statusConfig = {
  pending: { label: 'Ожидает', icon: Circle, color: 'text-gray-400', bgColor: 'bg-gray-50' },
  in_progress: { label: 'В работе', icon: Clock, color: 'text-primary-600', bgColor: 'bg-primary-50' },
  review: { label: 'На проверке', icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  done: { label: 'Готово', icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  rejected: { label: 'На доработке', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
} as const

const priorityConfig = {
  low: { label: 'Низкий', color: 'bg-gray-200 text-gray-700' },
  medium: { label: 'Средний', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'Высокий', color: 'bg-amber-100 text-amber-700' },
  urgent: { label: 'Срочно!', color: 'bg-red-100 text-red-700 animate-pulse' },
} as const

const nextStatus: Record<TaskStatus, TaskStatus> = {
  pending: 'in_progress',
  in_progress: 'review',
  review: 'done',
  done: 'pending',
  rejected: 'in_progress',
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, onClick }) => {
  const status = statusConfig[task.status]
  const priority = priorityConfig[task.priority]
  const StatusIcon = status.icon

  return (
    <div onClick={onClick} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform cursor-pointer">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onStatusChange?.(nextStatus[task.status])
          }}
          className={`flex-shrink-0 w-12 h-12 rounded-xl ${status.bgColor} flex items-center justify-center`}
          aria-label={status.label}
        >
          <StatusIcon size={24} className={status.color} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base-mobile font-semibold text-gray-900 truncate">{task.title}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs-mobile font-medium shrink-0 ${priority.color}`}>{priority.label}</span>
          </div>
          {task.room && <p className="text-sm-mobile text-gray-500 mb-1">📍 {task.room}</p>}
          {task.description && <p className="text-sm-mobile text-gray-600 line-clamp-2">{task.description}</p>}
          {task.estimated_hours != null && task.actual_hours != null && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs-mobile text-gray-500 mb-1">
                <span>Время: {task.actual_hours}ч / {task.estimated_hours}ч</span>
                <span>{Math.round((task.actual_hours / task.estimated_hours) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${task.actual_hours > task.estimated_hours ? 'bg-red-500' : 'bg-primary-500'}`}
                  style={{ width: `${Math.min((task.actual_hours / task.estimated_hours) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
