import React from 'react'
import toast from 'react-hot-toast'
import { Receipt, Check, X } from 'lucide-react'
import { useMaterialStore } from '@store/materialStore'
import { useUserStore } from '@store/userStore'
import {
  PAID_BY_LABELS,
  REIMBURSEMENT_STATUS_LABELS,
  type WorkflowMaterialRequest,
} from '@/types/materials'

interface Props {
  requests: WorkflowMaterialRequest[]
  objectName?: (id: string) => string
  canApprove?: boolean
}

export const MaterialReimbursementPanel: React.FC<Props> = ({
  requests,
  objectName,
  canApprove,
}) => {
  const fullName = useUserStore((s) => s.fullName)
  const approve = useMaterialStore((s) => s.approveReimbursement)
  const reject = useMaterialStore((s) => s.rejectReimbursement)

  const withReimbursement = requests.filter((r) => r.reimbursement)

  if (withReimbursement.length === 0) {
    return (
      <p className="text-sm-mobile text-gray-500 text-center py-8">
        Запросов на возмещение нет
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {withReimbursement.map((r) => {
        const reb = r.reimbursement!
        return (
          <div key={r.id} className="bg-white rounded-xl p-4 border border-gray-100 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm-mobile font-semibold text-gray-900">{r.name}</p>
                <p className="text-xs-mobile text-gray-500">
                  {r.purchasedBy ?? r.deliveredBy} · {objectName?.(r.objectId) ?? r.objectId}
                </p>
                <p className="text-xs-mobile text-gray-400">
                  Плательщик: {r.paymentPayer ? PAID_BY_LABELS[r.paymentPayer] : '—'}
                </p>
              </div>
              <span className={`text-xs-mobile px-2 py-0.5 rounded-full shrink-0 ${
                reb.status === 'pending' ? 'bg-amber-100 text-amber-800'
                  : reb.status === 'approved' ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
              }`}>
                {REIMBURSEMENT_STATUS_LABELS[reb.status]}
              </span>
            </div>
            <p className="text-lg-mobile font-bold text-gray-900">
              {reb.amount.toLocaleString('ru-RU')} ₽
            </p>
            {r.receiptPhotoUrl && (
              <img
                src={r.receiptPhotoUrl}
                alt="Чек"
                className="w-full max-h-40 object-contain rounded-lg border border-gray-100"
              />
            )}
            {r.purchaseDate && (
              <p className="text-xs-mobile text-gray-500 flex items-center gap-1">
                <Receipt size={12} />
                {new Date(r.purchaseDate).toLocaleDateString('ru-RU')}
                {r.deliveredQuantity != null && ` · ${r.deliveredQuantity} ${r.unit}`}
              </p>
            )}
            {canApprove && reb.status === 'pending' && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    approve(r.id, fullName)
                    toast.success('Возмещение подтверждено')
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm-mobile font-medium flex items-center justify-center gap-1"
                >
                  <Check size={16} /> Подтвердить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reject(r.id, fullName, 'Отклонено')
                    toast('Запрос отклонён')
                  }}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm-mobile font-medium flex items-center justify-center gap-1"
                >
                  <X size={16} /> Отклонить
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
