import React, { useState } from 'react'
import { CheckCircle2, FileText, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useWorkCalculatorStore } from '@store/workCalculatorStore'
import { getCurrentUserKey } from '@utils/notificationFilter'
import { resolveCurrentForemanName } from '@utils/foremanId'
import { BigButton } from '@components/BigButton'
import type { TaskWorkCalculator } from '@/types/workCalculator'

interface Props {
  calc: TaskWorkCalculator
  compact?: boolean
}

export const ForemanCalculatorActions: React.FC<Props> = ({ calc, compact }) => {
  const navigate = useNavigate()
  const acceptCalculator = useWorkCalculatorStore((s) => s.acceptCalculator)
  const returnCalculator = useWorkCalculatorStore((s) => s.returnCalculator)
  const useCalculatorForAct = useWorkCalculatorStore((s) => s.useCalculatorForAct)
  const foremanUserKey = getCurrentUserKey()
  const foremanName = resolveCurrentForemanName()
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnReason, setReturnReason] = useState('')

  const canReview = calc.status === 'submitted' || calc.status === 'returned'

  const handleAccept = () => {
    const r = acceptCalculator(calc.id, foremanUserKey)
    if (!r.ok) toast.error(r.reason || 'Ошибка')
    else toast.success('Отчёт принят')
  }

  const handleReturn = () => {
    const r = returnCalculator(calc.id, returnReason, foremanUserKey)
    if (!r.ok) toast.error(r.reason || 'Ошибка')
    else {
      toast.success('Отчёт возвращён мастеру')
      setReturnOpen(false)
      setReturnReason('')
    }
  }

  const handleAct = () => {
    const r = useCalculatorForAct(calc.id, foremanName)
    if (!r.ok) {
      toast.error(r.reason || 'Не удалось создать акт')
      return
    }
    toast.success('Акт сформирован из отчёта')
    if (r.actId) navigate(`/object/${calc.objectId}/payment-acts`)
  }

  if (calc.status === 'accepted' && calc.paymentActId) {
    return (
      <BigButton
        variant="secondary"
        size={compact ? 'sm' : 'md'}
        fullWidth
        onClick={() => navigate(`/object/${calc.objectId}/payment-acts`)}
      >
        <FileText size={16} className="inline mr-2" />
        Открыть акт
      </BigButton>
    )
  }

  return (
    <div className="space-y-2">
      {canReview && (
        <>
          <BigButton variant="primary" size={compact ? 'sm' : 'md'} fullWidth onClick={handleAccept}>
            <CheckCircle2 size={16} className="inline mr-2" />
            Принять
          </BigButton>
          <BigButton variant="secondary" size={compact ? 'sm' : 'md'} fullWidth onClick={handleAct}>
            <FileText size={16} className="inline mr-2" />
            Использовать для акта
          </BigButton>
          {!returnOpen ? (
            <button
              type="button"
              onClick={() => setReturnOpen(true)}
              className="w-full text-sm-mobile text-red-600 flex items-center justify-center gap-1 py-2"
            >
              <RotateCcw size={14} />
              Вернуть на уточнение
            </button>
          ) : (
            <div className="space-y-2 p-3 rounded-xl bg-red-50 border border-red-100">
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Причина возврата"
                className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm-mobile min-h-[60px]"
              />
              <div className="flex gap-2">
                <BigButton variant="danger" size="sm" fullWidth onClick={handleReturn}>
                  Отправить
                </BigButton>
                <BigButton variant="ghost" size="sm" fullWidth onClick={() => setReturnOpen(false)}>
                  Отмена
                </BigButton>
              </div>
            </div>
          )}
        </>
      )}
      {calc.status === 'accepted' && !calc.paymentActId && (
        <BigButton variant="secondary" size={compact ? 'sm' : 'md'} fullWidth onClick={handleAct}>
          <FileText size={16} className="inline mr-2" />
          Сформировать акт
        </BigButton>
      )}
    </div>
  )
}
