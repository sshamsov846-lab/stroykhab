import React from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { MapPin, Calendar, Wallet, Users, HardHat } from 'lucide-react'
import { SIDE_JOB_TYPE_LABELS } from '@utils/sideJob'
import type { ConstructionObject, ObjectStatus } from '@types'

interface ObjectCardProps {
  object: ConstructionObject
  onClick?: () => void
}

const statusConfig: Record<ObjectStatus, { label: string; color: string; textColor: string }> = {
  new: { label: 'Новый', color: 'bg-amber-500', textColor: 'text-amber-700' },
  active: { label: 'В работе', color: 'bg-emerald-500', textColor: 'text-emerald-700' },
  delayed: { label: 'Просрочен', color: 'bg-red-500', textColor: 'text-red-700' },
  done: { label: 'Завершён', color: 'bg-gray-500', textColor: 'text-gray-700' },
  planning: { label: 'Планирование', color: 'bg-amber-500', textColor: 'text-amber-700' },
  paused: { label: 'Пауза', color: 'bg-gray-400', textColor: 'text-gray-600' },
  completed: { label: 'Завершён', color: 'bg-gray-500', textColor: 'text-gray-700' },
}

export const ObjectCard: React.FC<ObjectCardProps> = ({ object, onClick }) => {
  const status = statusConfig[object.status] ?? statusConfig.active
  const isSideJob = !!object.isSideJob
  const budgetPercent = object.budget_total > 0 ? Math.round((object.budget_spent / object.budget_total) * 100) : 0
  const isOverBudget = budgetPercent > 100
  const startLabel = object.start_date
    ? format(new Date(object.start_date), 'dd MMM', { locale: ru })
    : '—'

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer ${
        isSideJob ? 'border-2 border-amber-300 bg-amber-50/40' : 'border border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {isSideJob && (
            <span className="inline-flex items-center gap-1 text-xs-mobile font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mb-1">
              <HardHat size={12} /> Подработка
              {object.sideJobType ? ` · ${SIDE_JOB_TYPE_LABELS[object.sideJobType]}` : ''}
            </span>
          )}
          <h3 className="text-lg-mobile font-bold text-gray-900 truncate">{object.name}</h3>
          <div className="flex items-center gap-1 mt-1 text-sm-mobile text-gray-500">
            <MapPin size={14} />
            <span className="truncate">{object.address}</span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs-mobile font-medium ${status.color} bg-opacity-20 ${status.textColor}`}>
          {status.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-sm-mobile mb-1">
          <div className="flex items-center gap-1 text-gray-600">
            <Wallet size={14} />
            <span>Бюджет</span>
          </div>
          <span className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
            {object.budget_spent.toLocaleString('ru-RU')} / {object.budget_total.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-primary-500'}`}
            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
          />
        </div>
        {isOverBudget && <p className="text-xs-mobile text-red-600 mt-1">⚠️ Перерасход {budgetPercent - 100}%</p>}
        {object.progress != null && (
          <p className="text-xs-mobile text-gray-500 mt-1">Прогресс работ: {object.progress}%</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm-mobile text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>{startLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users size={14} />
          <span className="truncate max-w-[140px]">
            {isSideJob ? 'Ваши мастера' : (object.client_name || 'Заказчик')}
          </span>
        </div>
      </div>
    </div>
  )
}
