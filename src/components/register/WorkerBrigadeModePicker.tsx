import React from 'react'
import type { WorkerBrigadeMode } from '@/types/brigade'
import { BRIGADE_MODE_LABELS } from '@/types/brigade'

const HINTS: Record<WorkerBrigadeMode, string> = {
  solo: 'Работаете сами, получаете оплату на свой счёт',
  brigadier: 'Создаёте бригаду, получаете код БР-XXXX, делите деньги сами',
  member: 'Войдёте в бригаду по коду бригадира',
}

interface Props {
  value: WorkerBrigadeMode
  onChange: (v: WorkerBrigadeMode) => void
}

export const WorkerBrigadeModePicker: React.FC<Props> = ({ value, onChange }) => (
  <div className="space-y-2">
    <p className="text-sm-mobile font-semibold text-gray-900">Формат работы</p>
    {(['solo', 'brigadier'] as WorkerBrigadeMode[]).map((mode) => (
      <button
        key={mode}
        type="button"
        onClick={() => onChange(mode)}
        className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
          value === mode ? 'border-primary-500 bg-primary-50' : 'border-gray-100 bg-gray-50'
        }`}
      >
        <p className="text-sm-mobile font-semibold text-gray-900">{BRIGADE_MODE_LABELS[mode]}</p>
        <p className="text-xs-mobile text-gray-500 mt-0.5">{HINTS[mode]}</p>
      </button>
    ))}
  </div>
)
