import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { useTelegram } from '@hooks/useTelegram'
import { getObjects } from '@api/supabase'
import { filterObjectsForRole } from '@utils/sideJob'
import { formatProgressLabel } from '@utils/clientHomeHelpers'
import type { ConstructionObject } from '@types'

export const ClientObjects: React.FC = () => {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [objects, setObjects] = useState<ConstructionObject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getObjects()
      .then((data) => setObjects(filterObjectsForRole(data, 'client')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-30">
        <h1 className="text-xl-mobile font-bold text-gray-900">Объекты</h1>
        <p className="text-sm-mobile text-gray-500">{objects.length} проектов</p>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)
        ) : objects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">Нет объектов</p>
            <button
              type="button"
              onClick={() => { haptic('light'); navigate('/client/object/new') }}
              className="text-primary-600 font-medium"
            >
              Создать первый объект
            </button>
          </div>
        ) : (
          objects.map((obj) => (
            <button
              key={obj.id}
              type="button"
              onClick={() => { haptic('light'); navigate(`/client/${obj.id}`) }}
              className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base-mobile font-bold text-gray-900 truncate">{obj.name}</h3>
                  <p className="text-sm-mobile text-gray-500 truncate">{obj.address}</p>
                  <div className="flex gap-3 mt-2 text-xs-mobile text-gray-500">
                    <span>{formatProgressLabel(obj.progress)}</span>
                    <span>{obj.budget_total.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${obj.progress ?? 0}%` }}
                    />
                  </div>
                </div>
                <ChevronRight size={22} className="text-gray-300 shrink-0" />
              </div>
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => { haptic('medium'); navigate('/client/object/new') }}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 bg-primary-600 text-white px-5 py-3.5 rounded-full shadow-lg shadow-primary-600/30 active:scale-95 transition-transform"
      >
        <Plus size={22} strokeWidth={2.5} />
        <span className="text-sm-mobile font-semibold">Добавить объект</span>
      </button>
    </div>
  )
}
