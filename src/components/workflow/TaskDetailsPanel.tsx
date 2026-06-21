import React, { useState, useEffect } from 'react'
import { Calendar, FileText, Flame, AlertTriangle } from 'lucide-react'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { isTaskOverdue, isTaskDueToday } from '@utils/taskDeadlines'

interface Props {
  taskId: string
  canEdit: boolean
}

export const TaskDetailsPanel: React.FC<Props> = ({ taskId, canEdit }) => {
  const task = useProjectWorkflowStore((s) => s.tasks[taskId])
  const updateDetails = useProjectWorkflowStore((s) => s.updateTaskDetails)

  const [description, setDescription] = useState(task?.description ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')

  useEffect(() => {
    setDescription(task?.description ?? '')
    setDueDate(task?.dueDate ?? '')
  }, [task?.description, task?.dueDate])

  if (!task) return null

  const overdue = isTaskOverdue(task)
  const dueToday = isTaskDueToday(task)

  const save = () => {
    updateDetails(taskId, {
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
    })
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-primary-600" />
        <p className="text-sm-mobile font-semibold text-gray-900">Описание и срок</p>
      </div>

      {canEdit ? (
        <>
          <div>
            <label className="text-xs-mobile font-medium text-gray-600">Описание работы</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={save}
              rows={3}
              placeholder="Что сделать, объём, особенности…"
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile resize-none"
            />
          </div>
          <div>
            <label className="text-xs-mobile font-medium text-gray-600 flex items-center gap-1">
              <Calendar size={14} /> Срок выполнения
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value)
                updateDetails(taskId, { dueDate: e.target.value || undefined })
              }}
              className={`mt-1 w-full px-3 py-2.5 rounded-xl border text-sm-mobile ${
                overdue ? 'border-red-300 bg-red-50' : dueToday ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
              }`}
            />
          </div>
        </>
      ) : (
        <>
          {task.description ? (
            <p className="text-sm-mobile text-gray-700">{task.description}</p>
          ) : (
            <p className="text-sm-mobile text-gray-400">Описание не указано</p>
          )}
          {task.dueDate && (
            <p className={`text-sm-mobile flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : dueToday ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
              {dueToday && <Flame size={14} />}
              {overdue && !dueToday && <AlertTriangle size={14} />}
              <Calendar size={14} />
              Срок: {new Date(task.dueDate).toLocaleDateString('ru-RU')}
              {overdue && ' · просрочено'}
              {dueToday && !overdue && ' · горит сегодня'}
            </p>
          )}
        </>
      )}
    </div>
  )
}
