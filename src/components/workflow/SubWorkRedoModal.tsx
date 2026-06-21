import React, { useState } from 'react'
import { X } from 'lucide-react'
import { BigButton } from '@components/BigButton'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
}

export const SubWorkRedoModal: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const [reason, setReason] = useState('')

  if (!open) return null

  const handleSubmit = () => {
    const trimmed = reason.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setReason('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg-mobile font-bold">Причина переделки</h2>
          <button type="button" onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={22} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm-mobile text-gray-500">Опишите, что нужно исправить. Без причины отправить нельзя.</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile resize-none"
            placeholder="Например: радиатор установлен не по уровню"
          />
          <BigButton variant="danger" size="lg" fullWidth disabled={!reason.trim()} onClick={handleSubmit}>
            Отправить на переделку
          </BigButton>
        </div>
      </div>
    </div>
  )
}
