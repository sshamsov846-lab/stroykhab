import React from 'react'
import { ChevronRight, Building2, Home, DoorOpen, Layers, KeyRound } from 'lucide-react'

interface ClientBlockCardProps {
  title: string
  subtitle?: string
  progress?: number
  meta?: string
  icon?: 'object' | 'house' | 'entrance' | 'floor' | 'apartment'
  tags?: string[]
  onClick: () => void
}

const icons = {
  object: Building2,
  house: Home,
  entrance: DoorOpen,
  floor: Layers,
  apartment: KeyRound,
}

export const ClientBlockCard: React.FC<ClientBlockCardProps> = ({
  title,
  subtitle,
  progress,
  meta,
  icon = 'object',
  tags,
  onClick,
}) => {
  const Icon = icons[icon]
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
          <Icon size={22} className="text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base-mobile font-bold text-gray-900">{title}</h3>
            <ChevronRight size={20} className="text-gray-300 shrink-0" />
          </div>
          {subtitle && <p className="text-sm-mobile text-gray-500 mt-0.5">{subtitle}</p>}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs-mobile rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {progress != null && (
            <div className="mt-2">
              <div className="flex justify-between text-xs-mobile text-gray-500 mb-1">
                <span>{meta}</span>
                <span className="font-semibold text-primary-600">{progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
            </div>
          )}
          {!progress && meta && <p className="text-xs-mobile text-gray-400 mt-2">{meta}</p>}
        </div>
      </div>
    </button>
  )
}
