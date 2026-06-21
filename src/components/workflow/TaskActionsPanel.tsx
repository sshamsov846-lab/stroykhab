import React from 'react'
import toast from 'react-hot-toast'
import { Play, Send, CheckCircle2 } from 'lucide-react'
import { BigButton } from '@components/BigButton'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import type { TaskStatus } from '@types'

interface Props {
  taskId: string
  status: TaskStatus
  isAssignedWorker: boolean
  isForeman: boolean
  materialWaitActive?: boolean
  downtimeActive?: boolean
  downtimeLabel?: string
}

export const TaskActionsPanel: React.FC<Props> = ({
  taskId,
  status,
  isAssignedWorker,
  isForeman,
  materialWaitActive,
  downtimeActive,
  downtimeLabel,
}) => {
  const updateStatus = useProjectWorkflowStore((s) => s.updateTaskStatus)
  const submitForReview = useProjectWorkflowStore((s) => s.submitForReview)
  const canStart = useProjectWorkflowStore((s) => s.canStartTask)
  const getBlockingReason = useProjectWorkflowStore((s) => s.getBlockingReason)

  const blockReason = getBlockingReason(taskId)

  const handleSubmitReview = () => {
    const result = submitForReview(taskId)
    if (!result.ok) {
      toast.error(result.error || 'Не удалось отправить')
      return
    }
    toast.success('Отправлено на проверку')
  }

  if (isAssignedWorker) {
    if (materialWaitActive || downtimeActive) {
      return (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-sm-mobile text-red-800 text-center">
          Работа на паузе{downtimeLabel ? `: ${downtimeLabel}` : materialWaitActive ? ' — ждём материал' : ''}. Продолжите, когда условия будут выполнены.
        </div>
      )
    }
    if (status === 'pending' || status === 'rejected') {
      return (
        <BigButton
          variant="primary"
          size="lg"
          fullWidth
          icon={<Play size={18} />}
          disabled={!canStart(taskId)}
          onClick={() => updateStatus(taskId, 'in_progress')}
        >
          {status === 'rejected' ? 'Продолжить переделку' : canStart(taskId) ? 'Начать работу' : blockReason || 'Недоступно'}
        </BigButton>
      )
    }
    if (status === 'in_progress') {
      return (
        <BigButton
          variant="primary"
          size="lg"
          fullWidth
          icon={<Send size={18} />}
          onClick={handleSubmitReview}
        >
          Отправить на проверку
        </BigButton>
      )
    }
    if (status === 'review') {
      return (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm-mobile text-amber-900 text-center">
          Ожидает проверки прорабом
        </div>
      )
    }
    if (status === 'done') {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-center gap-2 text-emerald-800">
          <CheckCircle2 size={18} />
          <span className="text-sm-mobile font-medium">Работа принята</span>
        </div>
      )
    }
  }

  if (isForeman && status === 'review') {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm-mobile text-amber-900 text-center">
        Заполните чек-лист качества ниже для приёмки
      </div>
    )
  }

  if (isForeman && status === 'done') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-center gap-2 text-emerald-800">
        <CheckCircle2 size={18} />
        <span className="text-sm-mobile font-medium">Работа принята</span>
      </div>
    )
  }

  return null
}
