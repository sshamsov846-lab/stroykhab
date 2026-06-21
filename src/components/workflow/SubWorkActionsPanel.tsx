import React from 'react'

import toast from 'react-hot-toast'

import { Play, Send, CheckCircle2 } from 'lucide-react'

import { BigButton } from '@components/BigButton'

import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

import type { TaskStatus } from '@types'



interface Props {

  taskId: string

  subWorkId: string

  status: TaskStatus

  isAssignedWorker: boolean

}



export const SubWorkActionsPanel: React.FC<Props> = ({

  taskId,

  subWorkId,

  status,

  isAssignedWorker,

}) => {

  const updateSubWorkStatus = useProjectWorkflowStore((s) => s.updateSubWorkStatus)

  const submitSubWorkForReview = useProjectWorkflowStore((s) => s.submitSubWorkForReview)

  const canStart = useProjectWorkflowStore((s) => s.canStartSubWork)

  const getBlockingReason = useProjectWorkflowStore((s) => s.getSubWorkBlockingReason)



  const blockReason = getBlockingReason(taskId, subWorkId)



  const handleSubmitReview = () => {

    const result = submitSubWorkForReview(taskId, subWorkId)

    if (!result.ok) {

      toast.error(result.error || 'Не удалось отправить')

      return

    }

    toast.success('Отправлено на проверку')

  }



  if (!isAssignedWorker) {

    if (status === 'review') {

      return (

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm-mobile text-amber-900 text-center">

          Ожидает приёмки — заполните чек-лист ниже

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

    return null

  }



  if (status === 'pending' || status === 'rejected') {

    return (

      <BigButton

        variant="primary"

        size="lg"

        fullWidth

        icon={<Play size={18} />}

        disabled={!canStart(taskId, subWorkId)}

        onClick={() => updateSubWorkStatus(taskId, subWorkId, 'in_progress')}

      >

        {status === 'rejected' ? 'Продолжить переделку' : canStart(taskId, subWorkId) ? 'Начать работу' : blockReason || 'Недоступно'}

      </BigButton>

    )

  }

  if (status === 'in_progress') {

    return (

      <BigButton variant="primary" size="lg" fullWidth icon={<Send size={18} />} onClick={handleSubmitReview}>

        Отправить на проверку

      </BigButton>

    )

  }

  if (status === 'review') {

    return (

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm-mobile text-amber-900 text-center">

        Ожидает приёмки прорабом или заказчиком

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



  return null

}

