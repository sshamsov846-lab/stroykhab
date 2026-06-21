import React from 'react'
import { useAcceptanceReportStore } from '@store/acceptanceReportStore'
import { formatAcceptanceReportLine } from '@utils/subWorkProgress'

interface Props {
  objectId: string
  limit?: number
}

export const AcceptanceReportPanel: React.FC<Props> = ({ objectId, limit = 20 }) => {
  const entries = useAcceptanceReportStore((s) => s.getEntriesForObject(objectId)).slice(0, limit)

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <p className="text-sm-mobile font-semibold text-gray-900">Отчёт приёмки</p>
        <p className="text-xs-mobile text-gray-500 mt-2">Записи появятся после приёмки или переделки под-работ</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <p className="text-sm-mobile font-semibold text-gray-900">Отчёт приёмки</p>
      {entries.map((e) => (
        <div
          key={e.id}
          className={`rounded-xl p-3 border ${
            e.action === 'redo' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'
          }`}
        >
          <p className={`text-sm-mobile font-medium ${e.action === 'redo' ? 'text-red-800' : 'text-gray-900'}`}>
            {formatAcceptanceReportLine(e.apartmentNumber, e.subWorkLabel, e.action, e.reason)}
          </p>
          <p className="text-xs-mobile text-gray-500 mt-1">
            {e.authorName} · {new Date(e.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ))}
    </div>
  )
}
