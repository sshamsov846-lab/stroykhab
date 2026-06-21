import React from 'react'
import { Wallet } from 'lucide-react'
import { useUserStore } from '@store/userStore'
import { resolveWorkerIdForUser } from '@utils/notificationFilter'
import { WorkerAccountView } from '@components/payroll/WorkerAccountView'
import { workerNameById } from '@utils/workerPayrollCalc'
import { NotificationBell } from '@components/NotificationBell'

export const WorkerMoney: React.FC = () => {
  const fullName = useUserStore((s) => s.fullName)
  const myWorkerId = resolveWorkerIdForUser(fullName || '')

  if (!myWorkerId) {
    return (
      <div className="pb-24 min-h-screen bg-gray-50">
        <div className="bg-primary-600 text-white px-4 pt-6 pb-8 rounded-b-3xl">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl-mobile font-bold">Мой счёт</h1>
              <p className="text-sm-mobile text-primary-100 mt-1">Личный счёт мастера</p>
            </div>
            <NotificationBell variant="onPrimary" />
          </div>
        </div>
        <div className="p-4">
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm-mobile text-gray-600">
              Попросите прораба или организацию назначить вас на задачи — тогда здесь появится ваш счёт
            </p>
          </div>
        </div>
      </div>
    )
  }

  const name = workerNameById(myWorkerId)

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-primary-600 text-white px-4 pt-6 pb-4 rounded-b-3xl">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl-mobile font-bold">Мой счёт</h1>
            <p className="text-sm-mobile text-primary-100 mt-1">{fullName || name}</p>
          </div>
          <NotificationBell variant="onPrimary" />
        </div>
      </div>
      <div className="p-4 -mt-2">
        <WorkerAccountView workerId={myWorkerId} workerName={name} canGiveAdvance={false} />
      </div>
    </div>
  )
}
