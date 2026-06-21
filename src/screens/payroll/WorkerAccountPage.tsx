import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useUserStore } from '@store/userStore'
import { WorkerAccountView } from '@components/payroll/WorkerAccountView'
import { workerNameById } from '@utils/workerPayrollCalc'

export const WorkerAccountPage: React.FC = () => {
  const { workerId } = useParams<{ workerId: string }>()
  const navigate = useNavigate()
  const role = useUserStore((s) => s.role)

  if (!workerId) {
    return <div className="p-4 text-gray-500">Мастер не найден</div>
  }

  const name = workerNameById(workerId)
  const canGiveAdvance = role === 'foreman' || role === 'subcontractor'

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg-mobile font-bold flex-1 truncate">Счёт мастера</h1>
      </div>
      <div className="p-4">
        <WorkerAccountView
          workerId={workerId}
          workerName={name}
          canGiveAdvance={canGiveAdvance}
        />
      </div>
    </div>
  )
}
