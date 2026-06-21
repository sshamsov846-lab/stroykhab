import React from 'react'
import { ChevronRight } from 'lucide-react'
import { progressBarClass, progressDotClass } from '@utils/hierarchyProgress'

interface Props {
  title: string
  subtitle?: string
  percent: number
  onClick: () => void
  disabled?: boolean
}

export const HierarchyProgressCard: React.FC<Props> = ({
  title,
  subtitle,
  percent,
  onClick,
  disabled,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="w-full bg-white rounded-2xl p-4 border border-gray-100 text-left active:scale-[0.98] disabled:opacity-50"
  >
    <div className="flex items-start gap-3">
      <span
        className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${progressDotClass(percent)}`}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base-mobile font-bold text-gray-900">{title}</p>
          <span className="text-sm-mobile font-semibold text-gray-600 shrink-0">{percent}%</span>
        </div>
        {subtitle && <p className="text-sm-mobile text-gray-500 mt-0.5">{subtitle}</p>}
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full rounded-full transition-all ${progressBarClass(percent)}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>
      {!disabled && <ChevronRight size={20} className="text-gray-300 shrink-0 mt-0.5" />}
    </div>
  </button>
)
