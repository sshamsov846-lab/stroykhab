import React from 'react'
import { Users } from 'lucide-react'
import { useAttendanceStore } from '@store/attendanceStore'

interface Props {
  objectId: string
}

export const ObjectPresentPanel: React.FC<Props> = ({ objectId }) => {
  const present = useAttendanceStore((s) => s.getPresentOnObject(objectId))

  if (!present.length) return null

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Users size={18} className="text-emerald-700" />
        <p className="text-sm-mobile font-semibold text-emerald-900">На объекте сегодня</p>
      </div>
      <div className="space-y-1">
        {present.map((c) => (
          <p key={c.id} className="text-xs-mobile text-emerald-800">
            {c.workerName}
            {' · с '}
            {new Date(c.arrivedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </p>
        ))}
      </div>
    </div>
  )
}
