import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { ObjectStatus } from '@types'

interface HierarchyCardProps {
  title: string
  subtitle?: string
  progress: number
  status?: ObjectStatus
  meta?: string
  badge?: string
  onClick?: () => void
}

const statusLabel: Partial<Record<ObjectStatus, string>> = {
  new: 'Новый',
  active: 'В работе',
  delayed: 'Просрочен',
  done: 'Готово',
}

export const HierarchyCard: React.FC<HierarchyCardProps> = ({
  title,
  subtitle,
  progress,
  status = 'active',
  meta,
  badge,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
  >
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base-mobile font-bold text-gray-900 truncate">{title}</h3>
          {badge && (
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs-mobile rounded-full shrink-0">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm-mobile text-gray-500 truncate mt-0.5">{subtitle}</p>}
      </div>
      <ChevronRight size={20} className="text-gray-300 shrink-0 mt-1" />
    </div>

    <div className="flex items-center justify-between text-xs-mobile text-gray-500 mb-1">
      <span>{statusLabel[status] || status}</span>
      <span className="font-semibold text-primary-600">{progress}%</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary-500 rounded-full transition-all"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
    {meta && <p className="text-xs-mobile text-gray-400 mt-2">{meta}</p>}
  </button>
)
