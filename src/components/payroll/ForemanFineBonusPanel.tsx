import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { MinusCircle, PlusCircle } from 'lucide-react'
import { useForemanPayrollStore } from '@store/foremanPayrollStore'
import { useUserStore } from '@store/userStore'
import {
  FINE_REASON_LABELS,
  BONUS_REASON_LABELS,
  type FineReason,
  type BonusReason,
} from '@/types/workerPayroll'

interface Props {
  foremanId: string
}

export const ForemanFineBonusPanel: React.FC<Props> = ({ foremanId }) => {
  const fullName = useUserStore((s) => s.fullName)
  const addFine = useForemanPayrollStore((s) => s.addFine)
  const addBonus = useForemanPayrollStore((s) => s.addBonus)

  const [mode, setMode] = useState<'fine' | 'bonus' | null>(null)
  const [amount, setAmount] = useState('')
  const [fineReason, setFineReason] = useState<FineReason>('defect')
  const [bonusReason, setBonusReason] = useState<BonusReason>('quality')
  const [comment, setComment] = useState('')

  const submit = () => {
    const sum = Number(amount.replace(/\s/g, ''))
    if (!sum || sum <= 0) {
      toast.error('Введите сумму')
      return
    }
    const issuedBy = fullName || 'Организация'
    if (mode === 'fine') {
      addFine(foremanId, { amount: sum, reason: fineReason, issuedBy, comment: comment.trim() || undefined })
      toast.success('Штраф выписан прорабу')
    } else if (mode === 'bonus') {
      addBonus(foremanId, { amount: sum, reason: bonusReason, issuedBy, comment: comment.trim() || undefined })
      toast.success('Премия начислена прорабу')
    }
    setAmount('')
    setComment('')
    setMode(null)
  }

  if (!mode) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('fine')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 bg-red-50 text-red-800 text-sm-mobile font-semibold"
        >
          <MinusCircle size={18} /> Штраф
        </button>
        <button
          type="button"
          onClick={() => setMode('bonus')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-800 text-sm-mobile font-semibold"
        >
          <PlusCircle size={18} /> Премия
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <p className="text-sm-mobile font-semibold text-gray-900">
        {mode === 'fine' ? 'Выписать штраф прорабу' : 'Выдать премию прорабу'}
      </p>
      {mode === 'fine' ? (
        <select
          value={fineReason}
          onChange={(e) => setFineReason(e.target.value as FineReason)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
        >
          {(Object.entries(FINE_REASON_LABELS) as [FineReason, string][]).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      ) : (
        <select
          value={bonusReason}
          onChange={(e) => setBonusReason(e.target.value as BonusReason)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
        >
          {(Object.entries(BONUS_REASON_LABELS) as [BonusReason, string][]).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      )}
      <input
        type="number"
        placeholder="Сумма, ₽"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
      />
      <input
        type="text"
        placeholder="Комментарий (необязательно)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          className={`flex-1 py-3 rounded-xl text-white text-sm-mobile font-semibold ${
            mode === 'fine' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={() => setMode(null)}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm-mobile font-medium"
        >
          Отмена
        </button>
      </div>
    </div>
  )
}
