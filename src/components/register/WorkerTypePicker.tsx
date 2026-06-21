import React from 'react'
import type { WorkerEmploymentType } from '@/types/person'
import { WORKER_TYPE_HINTS, WORKER_TYPE_LABELS } from '@/types/person'

interface Props {
  value: WorkerEmploymentType
  onChange: (v: WorkerEmploymentType) => void
}

export const WorkerTypePicker: React.FC<Props> = ({ value, onChange }) => (
  <div className="space-y-2">
    <p className="text-sm-mobile font-semibold text-gray-900">Тип мастера</p>
    {(['brigade', 'hourly'] as WorkerEmploymentType[]).map((type) => (
      <button
        key={type}
        type="button"
        onClick={() => onChange(type)}
        className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
          value === type ? 'border-primary-500 bg-primary-50' : 'border-gray-100 bg-gray-50'
        }`}
      >
        <p className="text-sm-mobile font-semibold text-gray-900">{WORKER_TYPE_LABELS[type]}</p>
        <p className="text-xs-mobile text-gray-500 mt-0.5">{WORKER_TYPE_HINTS[type]}</p>
      </button>
    ))}
  </div>
)
