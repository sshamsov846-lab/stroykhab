import React, { useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'
import { BigButton } from '@components/BigButton'
import type { RedoReason } from '@/types/workerPayroll'
import { REDO_REASON_LABELS } from '@/types/workerPayroll'

interface WorkerOption {
  id: string
  name: string
}

interface RedoModalProps {
  open: boolean
  taskTitle: string
  workers: WorkerOption[]
  currentWorkerId?: string
  onClose: () => void
  onSubmit: (photoUrl: string, comment: string, options: { reason: RedoReason; fixerWorkerId?: string }) => void
}

export const RedoModal: React.FC<RedoModalProps> = ({
  open,
  taskTitle,
  workers,
  currentWorkerId,
  onClose,
  onSubmit,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [reason, setReason] = useState<RedoReason>('own_fault')
  const [fixerWorkerId, setFixerWorkerId] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const handleSubmit = () => {
    if (!photoUrl) {
      setError('Прикрепите фото дефекта')
      return
    }
    if (comment.trim().length < 5) {
      setError('Опишите проблему (минимум 5 символов)')
      return
    }
    if (reason === 'other_fault' && !fixerWorkerId) {
      setError('Выберите мастера для исправления')
      return
    }
    onSubmit(photoUrl, comment.trim(), {
      reason,
      fixerWorkerId: reason === 'other_fault' ? fixerWorkerId : currentWorkerId,
    })
    setPhotoUrl(null)
    setComment('')
    setReason('own_fault')
    setFixerWorkerId('')
    setError('')
    onClose()
  }

  const otherWorkers = workers.filter((w) => w.id !== currentWorkerId)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg-mobile font-bold text-gray-900">Переделать работу</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm-mobile text-gray-600">{taskTitle}</p>

        <div>
          <p className="text-xs-mobile font-medium text-gray-600 mb-2">Причина переделки</p>
          <div className="space-y-2">
            {(['own_fault', 'other_fault'] as RedoReason[]).map((r) => (
              <label
                key={r}
                className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer ${
                  reason === r ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="redo-reason"
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="mt-1"
                />
                <span className="text-sm-mobile text-gray-800">{REDO_REASON_LABELS[r]}</span>
              </label>
            ))}
          </div>
        </div>

        {reason === 'other_fault' && (
          <div>
            <label className="text-xs-mobile font-medium text-gray-600">Мастер для исправления</label>
            <select
              value={fixerWorkerId}
              onChange={(e) => setFixerWorkerId(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
            >
              <option value="">— выберите мастера —</option>
              {otherWorkers.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <p className="text-xs-mobile text-gray-500 mt-1">Новому мастеру — оплата по часам из расценки</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) setPhotoUrl(URL.createObjectURL(f))
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 text-gray-500"
        >
          <Camera size={32} />
          {photoUrl ? 'Фото прикреплено ✓' : 'Сфотографировать дефект'}
        </button>
        {photoUrl && <img src={photoUrl} alt="" className="rounded-xl max-h-32 object-cover w-full" />}

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Опишите дефект"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile resize-none"
        />

        {error && <p className="text-sm-mobile text-red-600">{error}</p>}

        <BigButton variant="danger" size="lg" fullWidth onClick={handleSubmit}>
          На переделку
        </BigButton>
      </div>
    </div>
  )
}
