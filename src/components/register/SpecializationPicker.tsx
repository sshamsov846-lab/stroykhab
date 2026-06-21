import React from 'react'
import type { SpecializationId } from '@/constants/specializations'
import { SPECIALIZATION_OPTIONS } from '@/constants/specializations'
import { useTelegram } from '@hooks/useTelegram'

interface Props {
  value: SpecializationId[]
  onChange: (ids: SpecializationId[]) => void
}

export const SpecializationPicker: React.FC<Props> = ({ value, onChange }) => {
  const { haptic } = useTelegram()

  const toggle = (id: SpecializationId) => {
    haptic('selection')
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
      return
    }
    if (id === 'universal') {
      onChange(['universal'])
      return
    }
    onChange([...value.filter((v) => v !== 'universal'), id])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {SPECIALIZATION_OPTIONS.map((opt) => {
        const selected = value.includes(opt.id)
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={`px-3 py-2 rounded-xl text-sm-mobile border transition-all ${
              selected
                ? 'border-primary-500 bg-primary-50 text-primary-800 font-medium'
                : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
