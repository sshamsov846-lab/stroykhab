import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Users } from 'lucide-react'
import { useAttendanceStore } from '@store/attendanceStore'
import { useObjectStore } from '@store/objectStore'
import { getObjects } from '@api/supabase'
import type { ConstructionObject } from '@types'

export const TimesheetPage: React.FC = () => {
  const navigate = useNavigate()
  const getTimesheet = useAttendanceStore((s) => s.getTimesheet)
  const teamMembers = useObjectStore((s) => s.teamMembers)
  const [objects, setObjects] = useState<ConstructionObject[]>([])
  const [filterObjectId, setFilterObjectId] = useState('')
  const [filterWorkerId, setFilterWorkerId] = useState('')

  React.useEffect(() => {
    getObjects().then((data) => setObjects(data || []))
  }, [])

  const rows = useMemo(
    () =>
      getTimesheet({
        objectId: filterObjectId || undefined,
        workerId: filterWorkerId || undefined,
      }),
    [getTimesheet, filterObjectId, filterWorkerId],
  )

  const totalsByWorker = useMemo(() => {
    const map = new Map<string, { name: string; hours: number; days: number }>()
    for (const r of rows) {
      const t = map.get(r.workerId) || { name: r.workerName, hours: 0, days: 0 }
      t.hours += r.hours
      t.days += r.days
      map.set(r.workerId, t)
    }
    return [...map.entries()].sort((a, b) => b[1].hours - a[1].hours)
  }, [rows])

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-lg-mobile font-bold">Табель</h1>
          <p className="text-xs-mobile text-gray-500">Часы и дни по объектам</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          <p className="text-sm-mobile font-semibold text-gray-900">Фильтры</p>
          <select
            value={filterObjectId}
            onChange={(e) => setFilterObjectId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
          >
            <option value="">Все объекты</option>
            {objects.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select
            value={filterWorkerId}
            onChange={(e) => setFilterWorkerId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
          >
            <option value="">Все мастера</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {totalsByWorker.length > 0 && (
          <div className="bg-primary-50 rounded-2xl p-4 border border-primary-100">
            <div className="flex items-center gap-2 mb-3">
              <Users size={18} className="text-primary-600" />
              <p className="text-sm-mobile font-semibold text-primary-900">Сводка по мастерам</p>
            </div>
            <div className="space-y-2">
              {totalsByWorker.map(([id, t]) => (
                <div key={id} className="flex justify-between text-sm-mobile">
                  <span className="text-gray-800">{t.name}</span>
                  <span className="font-medium text-primary-800">
                    {t.hours.toFixed(1)} ч · {t.days} дн.
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <Clock size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm-mobile text-gray-600">Записей табеля пока нет</p>
            <p className="text-xs-mobile text-gray-400 mt-1">Мастера отмечают «Пришёл» / «Ушёл» на объекте</p>
          </div>
        ) : (
          rows.map((row) => (
            <div key={`${row.date}-${row.objectId}-${row.workerId}`} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-sm-mobile font-semibold text-gray-900">{row.workerName}</p>
                  <p className="text-xs-mobile text-gray-500">{row.objectName}</p>
                  <p className="text-xs-mobile text-gray-400 mt-0.5">
                    {new Date(row.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base-mobile font-bold text-gray-900">{row.hours.toFixed(1)} ч</p>
                  <p className="text-xs-mobile text-gray-500">{row.days} дн.</p>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {row.sessions.map((s, i) => (
                  <p key={i} className="text-xs-mobile text-gray-500">
                    {new Date(s.arrivedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    {' — '}
                    {s.leftAt
                      ? new Date(s.leftAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                      : 'на объекте'}
                  </p>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
