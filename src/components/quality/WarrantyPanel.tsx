import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Shield, AlertCircle } from 'lucide-react'
import { useQualityAcceptanceStore } from '@store/qualityAcceptanceStore'

interface Props {
  actId: string
  objectId: string
  taskId: string
  workLabel: string
}

export const WarrantyPanel: React.FC<Props> = ({ actId, objectId, taskId, workLabel }) => {
  const act = useQualityAcceptanceStore((s) => s.getAct(actId))
  const isUnderWarranty = useQualityAcceptanceStore((s) => s.isUnderWarranty(actId))
  const createClaim = useQualityAcceptanceStore((s) => s.createWarrantyClaim)
  const [description, setDescription] = useState('')
  const [showForm, setShowForm] = useState(false)

  if (!act) return null

  const expired = !isUnderWarranty

  return (
    <div className={`rounded-2xl p-4 border space-y-3 ${expired ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-center gap-2">
        <Shield size={18} className={expired ? 'text-gray-500' : 'text-blue-700'} />
        <p className="text-sm-mobile font-semibold text-gray-900">Гарантия</p>
      </div>
      <p className="text-xs-mobile text-gray-700">
        {expired
          ? `Гарантия истекла ${new Date(act.warrantyUntil).toLocaleDateString('ru-RU')}`
          : `Действует до ${new Date(act.warrantyUntil).toLocaleDateString('ru-RU')} (${act.warrantyMonths} мес.)`}
      </p>

      {!expired && (
        <>
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full py-2.5 rounded-xl bg-white border border-blue-200 text-blue-800 text-sm-mobile font-medium flex items-center justify-center gap-2"
            >
              <AlertCircle size={16} /> Вызвать на исправление по гарантии
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Опишите брак или дефект…"
                className="w-full px-3 py-2 rounded-xl border border-blue-200 text-sm-mobile resize-none bg-white"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = createClaim({ actId, objectId, taskId, workLabel, description })
                    if (!id) {
                      toast.error('Укажите описание')
                      return
                    }
                    toast.success('Заявка по гарантии создана')
                    setDescription('')
                    setShowForm(false)
                  }}
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm-mobile font-medium"
                >
                  Отправить
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-blue-200 text-sm-mobile"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
