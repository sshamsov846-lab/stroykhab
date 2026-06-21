import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { usePaymentActStore } from '@store/paymentActStore'
import { useUserStore } from '@store/userStore'
import { PAYMENT_ACT_STATUS_LABELS } from '@/types/paymentAct'
import { formatMoney } from '@utils/workerPayrollCalc'
import { getCurrentUserKey } from '@utils/notificationFilter'
import { PaymentActEditorPanel, PaymentActReviewPanel } from '@components/paymentAct/PaymentActPanels'
import { NotificationBell } from '@components/NotificationBell'

export const PaymentActsPage: React.FC = () => {
  const { id: objectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const role = useUserStore((s) => s.role)
  const contractorId = useUserStore((s) => s.contractorId)
  const acts = usePaymentActStore((s) => (objectId ? s.getActsForObject(objectId) : []))
  const foremanKey = getCurrentUserKey()

  const visible = acts.filter((a) => {
    if (role === 'foreman') return a.foremanUserKey === foremanKey || !a.foremanUserKey
    if (role === 'subcontractor') return a.orgId === contractorId
    if (role === 'client') return true
    if (role === 'worker') return a.workerReport?.submittedByUserKey === foremanKey
    return false
  })

  return (
    <div className="p-4 pb-24 min-h-screen bg-gray-50">
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl-mobile font-bold text-gray-900">Акты на оплату</h1>
          <p className="text-xs-mobile text-gray-500">{visible.length} документов</p>
        </div>
        <NotificationBell />
      </div>

      {visible.length === 0 && (
        <p className="text-sm-mobile text-gray-500 text-center py-12">Пока нет актов на оплату</p>
      )}

      <div className="space-y-4">
        {visible.map((act) => (
          <div key={act.id}>
            {role === 'foreman' && (
              <PaymentActEditorPanel act={act} />
            )}
            {(role === 'subcontractor' || role === 'client') && (
              <PaymentActReviewPanel act={act} role={role} />
            )}
            {role === 'worker' && (
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-sm-mobile font-semibold flex items-center gap-2">
                  <FileText size={16} /> {act.actNumber}
                </p>
                <p className="text-xs-mobile text-gray-500">{PAYMENT_ACT_STATUS_LABELS[act.status]}</p>
                <p className="text-sm-mobile font-bold text-primary-600 mt-1">{formatMoney(act.workerTotal)}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
