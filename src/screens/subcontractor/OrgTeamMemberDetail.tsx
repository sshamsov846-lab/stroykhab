import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Wallet } from 'lucide-react'
import { useUserStore } from '@store/userStore'
import { useOrganizationStore } from '@store/organizationStore'
import { WorkerAccountView } from '@components/payroll/WorkerAccountView'
import { ForemanOrgAccountView } from '@components/payroll/ForemanOrgAccountView'
import { PaymentHistoryPanel } from '@components/payroll/PaymentHistoryPanel'
import { workHistoryForForeman, workHistoryForWorker } from '@utils/orgTeamData'
import { foremanIdFromPhone } from '@utils/foremanId'
import { formatMoney } from '@utils/workerPayrollCalc'
import { VOLUME_UNIT_LABELS } from '@/types/workerPayroll'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'
import { useForemanPayrollStore } from '@store/foremanPayrollStore'
export const OrgTeamMemberDetail: React.FC = () => {
  const { memberType, memberId } = useParams<{ memberType: 'foreman' | 'worker'; memberId: string }>()
  const navigate = useNavigate()
  const contractorId = useUserStore((s) => s.contractorId) ?? ''

  const decodedId = memberId ? decodeURIComponent(memberId) : ''

  const foremanMember = useOrganizationStore((s) =>
    memberType === 'foreman'
      ? s.getForemenForContractor(contractorId).find((f) => f.userKey === decodedId)
      : undefined,
  )

  const workerAccounts = useWorkerPayrollStore((s) => s.accounts)
  const workerAccount = memberType === 'worker' ? workerAccounts[decodedId] : undefined

  const workHistory = useMemo(() => {
    if (!contractorId || !memberType || !decodedId) return []
    if (memberType === 'worker') return workHistoryForWorker(decodedId, contractorId)
    return workHistoryForForeman(decodedId, contractorId)
  }, [memberType, decodedId, contractorId])

  if (!memberType || !decodedId) {
    return <div className="p-4 text-gray-500">Не найдено</div>
  }

  const title = memberType === 'foreman'
    ? foremanMember?.fullName ?? 'Прораб'
    : workerAccount?.workerName ?? 'Мастер'

  const foremanPayrollId = foremanMember ? foremanIdFromPhone(foremanMember.phone) : decodedId
  const foremanAccount = useForemanPayrollStore((s) => s.accounts[foremanPayrollId])

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg-mobile font-bold truncate">{title}</h1>
          <p className="text-xs-mobile text-gray-500">{memberType === 'foreman' ? 'Прораб' : 'Мастер'}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {memberType === 'worker' && (
          <WorkerAccountView
            workerId={decodedId}
            workerName={workerAccount?.workerName ?? title}
            canGiveAdvance={false}
          />
        )}

        {memberType === 'foreman' && foremanMember && (
          <ForemanOrgAccountView
            foremanId={foremanPayrollId}
            foremanName={foremanMember.fullName}
            canManage={false}
          />
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm-mobile font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList size={18} className="text-primary-600" />
            История работ
          </p>
          {workHistory.length === 0 ? (
            <p className="text-xs-mobile text-gray-500">Пока нет выполненных задач в системе</p>
          ) : (
            workHistory.map((row) => (
              <div key={row.taskId} className="p-3 rounded-xl bg-gray-50 space-y-1">
                <p className="text-sm-mobile font-medium text-gray-900">{row.title}</p>
                <p className="text-xs-mobile text-gray-500">{row.objectName}</p>
                {row.completedAt && (
                  <p className="text-xs-mobile text-gray-400">
                    {new Date(row.completedAt).toLocaleDateString('ru-RU')}
                  </p>
                )}
                <div className="flex justify-between text-xs-mobile">
                  {row.volume != null && row.volumeUnit && (
                    <span>{row.volume} {VOLUME_UNIT_LABELS[row.volumeUnit]}</span>
                  )}
                  {row.amount != null && (
                    <span className="font-medium text-emerald-700">{formatMoney(row.amount)}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {memberType === 'worker' && workerAccount && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm-mobile font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Wallet size={18} className="text-primary-600" />
              История ЗП
            </p>
            <PaymentHistoryPanel accounts={workerAccounts} workerId={decodedId} />
          </div>
        )}

        {memberType === 'foreman' && foremanAccount && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <p className="text-sm-mobile font-semibold text-gray-900 flex items-center gap-2 mb-2">
              <Wallet size={18} className="text-primary-600" />
              История ЗП
            </p>
            {foremanAccount.accruals.map((a) => (
              <div key={a.id} className="flex justify-between text-sm-mobile py-1 border-b border-gray-50">
                <span className="truncate flex-1">{a.taskTitle}</span>
                <span className="font-medium text-emerald-700 ml-2">{formatMoney(a.amount)}</span>
              </div>
            ))}
            {foremanAccount.advances.map((a) => (
              <div key={a.id} className="flex justify-between text-sm-mobile py-1 text-gray-600">
                <span>Аванс {a.date}</span>
                <span>−{formatMoney(a.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
