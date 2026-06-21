import React, { useMemo, useState } from 'react'
import { Camera, Send, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { useUserStore } from '@store/userStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { usePaymentActStore } from '@store/paymentActStore'
import { getCurrentUserKey } from '@utils/notificationFilter'
import { presetsForSpecs } from '@/constants/volumeUnitsBySpec'
import type { WorkReportLineItem } from '@/types/paymentAct'
import type { WorkType } from '@types'
import type { VolumeUnit } from '@/types/workerPayroll'
import { BigButton } from '@components/BigButton'

interface Props {
  taskId: string
  canSubmit: boolean
}

function newLineId(): string {
  return `wl-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`
}

export const WorkerReportPanel: React.FC<Props> = ({ taskId, canSubmit }) => {
  const task = useProjectWorkflowStore((s) => s.tasks[taskId])
  const fullName = useUserStore((s) => s.fullName)
  const specializationIds = useUserStore((s) => s.specializationIds)
  const submitReport = usePaymentActStore((s) => s.submitWorkerReport)
  const existing = usePaymentActStore((s) => s.getActsForTask(taskId)[0])

  const unitPresets = useMemo(() => presetsForSpecs(specializationIds), [specializationIds])
  const defaultWorkType = (task?.workType ?? 'plaster') as WorkType

  const [lineItems, setLineItems] = useState<WorkReportLineItem[]>([
    {
      id: newLineId(),
      workType: defaultWorkType,
      label: WORK_TYPE_LABELS[defaultWorkType] || defaultWorkType,
      volume: 0,
      unit: unitPresets[0]?.unit ?? 'm2',
    },
  ])
  const [photos, setPhotos] = useState<string[]>([])
  const [note, setNote] = useState('')

  if (!task || !canSubmit) return null

  if (existing && existing.status !== 'returned') {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <p className="text-sm-mobile font-semibold text-gray-900">Отчёт отправлен</p>
        <p className="text-xs-mobile text-gray-500 mt-1">
          Акт {existing.actNumber} · статус: {existing.status}
        </p>
      </div>
    )
  }

  const addLine = () => {
    setLineItems([
      ...lineItems,
      {
        id: newLineId(),
        workType: defaultWorkType,
        label: WORK_TYPE_LABELS[defaultWorkType] || defaultWorkType,
        volume: 0,
        unit: unitPresets[0]?.unit ?? 'm2',
      },
    ])
  }

  const updateLine = (id: string, patch: Partial<WorkReportLineItem>) => {
    setLineItems(lineItems.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setPhotos([...photos, reader.result])
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSubmit = () => {
    const valid = lineItems.filter((l) => l.volume > 0)
    if (!valid.length) {
      toast.error('Укажите объём выполненных работ')
      return
    }
    if (!photos.length) {
      toast.error('Прикрепите фото выполненных работ')
      return
    }
    submitReport({
      taskId,
      lineItems: valid,
      photos,
      note: note.trim() || undefined,
      submittedBy: fullName || 'Мастер',
      submittedByUserKey: getCurrentUserKey(),
    })
    toast.success('Отчёт отправлен прорабу')
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <p className="text-sm-mobile font-semibold text-gray-900">Отчёт о выполненных работах</p>
      <p className="text-xs-mobile text-gray-500">Укажите объёмы в своих единицах и прикрепите фото</p>

      {lineItems.map((line) => (
        <div key={line.id} className="p-3 rounded-xl bg-gray-50 space-y-2">
          <input
            value={line.label}
            onChange={(e) => updateLine(line.id, { label: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
            placeholder="Что сделано"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step="0.1"
              value={line.volume || ''}
              onChange={(e) => updateLine(line.id, { volume: parseFloat(e.target.value) || 0 })}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
              placeholder="Объём"
            />
            <select
              value={line.unit}
              onChange={(e) => updateLine(line.id, { unit: e.target.value as VolumeUnit })}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
            >
              {unitPresets.map((p) => (
                <option key={p.unit} value={p.unit}>{p.label}</option>
              ))}
            </select>
            {lineItems.length > 1 && (
              <button type="button" onClick={() => setLineItems(lineItems.filter((l) => l.id !== line.id))}>
                <Trash2 size={18} className="text-red-500" />
              </button>
            )}
          </div>
        </div>
      ))}

      <button type="button" onClick={addLine} className="text-primary-600 text-sm-mobile flex items-center gap-1">
        <Plus size={16} /> Добавить позицию
      </button>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Комментарий прорабу"
        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile min-h-[60px]"
      />

      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover border" />
        ))}
        <label className="w-16 h-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center cursor-pointer">
          <Camera size={20} className="text-gray-400" />
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        </label>
      </div>

      <BigButton variant="primary" size="md" fullWidth onClick={handleSubmit}>
        <Send size={18} className="inline mr-2" />
        Отправить прорабу
      </BigButton>
    </div>
  )
}
