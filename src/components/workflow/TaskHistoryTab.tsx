import React from 'react'
import { AlertTriangle, History } from 'lucide-react'
import { useAuditLogStore, formatAuditRole } from '@store/auditLogStore'

interface Props {
  taskId: string
}

export const TaskHistoryTab: React.FC<Props> = ({ taskId }) => {
  const entries = useAuditLogStore((s) =>
    s.entries
      .filter((e) => e.taskId === taskId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  )

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
        <History size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm-mobile text-gray-500">История изменений пока пуста</p>
        <p className="text-xs-mobile text-gray-400 mt-1">
          Здесь фиксируются статус, чертёж, описание и назначение мастера
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isImportant = entry.important ?? entry.field === 'blueprint'
        return (
          <div
            key={entry.id}
            className={
              isImportant
                ? 'bg-red-50 rounded-2xl p-4 border-2 border-red-300 shadow-sm'
                : 'bg-white rounded-2xl p-4 border border-gray-100'
            }
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isImportant && (
                    <AlertTriangle size={14} className="text-red-600 shrink-0" aria-hidden />
                  )}
                  <p
                    className={
                      isImportant
                        ? 'text-sm-mobile font-bold text-red-800'
                        : 'text-sm-mobile font-semibold text-gray-900'
                    }
                  >
                    {entry.fieldLabel}
                  </p>
                  {isImportant && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                      Важно
                    </span>
                  )}
                </div>
                <p className="text-xs-mobile text-gray-600 mt-0.5">
                  {entry.userName} · {formatAuditRole(entry.userRole)}
                </p>
              </div>
              <time
                className={
                  isImportant
                    ? 'text-xs-mobile text-red-600 shrink-0 font-medium'
                    : 'text-xs-mobile text-gray-400 shrink-0'
                }
              >
                {new Date(entry.createdAt).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
            <div className="flex items-center gap-2 text-sm-mobile flex-wrap">
              <span
                className={
                  isImportant
                    ? 'px-2 py-1 rounded-lg bg-red-100/80 text-red-800 line-through decoration-red-400'
                    : 'px-2 py-1 rounded-lg bg-gray-100 text-gray-600 line-through decoration-gray-400'
                }
              >
                {entry.oldValue || '—'}
              </span>
              <span className={isImportant ? 'text-red-500' : 'text-gray-400'}>→</span>
              <span
                className={
                  isImportant
                    ? 'px-2 py-1 rounded-lg bg-red-200 text-red-900 font-semibold'
                    : 'px-2 py-1 rounded-lg bg-primary-50 text-primary-800 font-medium'
                }
              >
                {entry.newValue || '—'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
