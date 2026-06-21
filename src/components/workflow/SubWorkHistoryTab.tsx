import React from 'react'
import { History } from 'lucide-react'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { STATUS_LABELS } from '@api/clientView'

interface Props {
  taskId: string
  subWorkId: string
}

export const SubWorkHistoryTab: React.FC<Props> = ({ taskId, subWorkId }) => {
  const subWorks = useProjectWorkflowStore((s) => s.getTaskSubWorks(taskId))
  const sub = subWorks.find((s) => s.id === subWorkId)
  const entries = sub?.history ?? []

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
        <History size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm-mobile text-gray-500">История под-работы пока пуста</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isRedo = entry.action === 'redo'
        const isAccept = entry.action === 'accept'
        return (
          <div
            key={entry.id}
            className={
              isRedo
                ? 'bg-red-50 rounded-2xl p-4 border-2 border-red-200'
                : isAccept
                  ? 'bg-emerald-50 rounded-2xl p-4 border border-emerald-200'
                  : 'bg-white rounded-2xl p-4 border border-gray-100'
            }
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={`text-sm-mobile font-semibold ${isRedo ? 'text-red-800' : 'text-gray-900'}`}>
                {entry.action === 'status' && 'Статус'}
                {entry.action === 'photo' && 'Фото'}
                {entry.action === 'before_close_photo' && '📷 Фото до закрытия'}
                {entry.action === 'accept' && '✅ Принято'}
                {entry.action === 'redo' && '🔄 Переделка'}
                {entry.action === 'comment' && 'Комментарий'}
              </p>
              <time className="text-xs-mobile text-gray-400 shrink-0">
                {new Date(entry.at).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
            <p className="text-xs-mobile text-gray-600">{entry.authorName}</p>
            {entry.oldStatus && entry.newStatus && (
              <p className="text-sm-mobile mt-1">
                {STATUS_LABELS[entry.oldStatus]} → {STATUS_LABELS[entry.newStatus]}
              </p>
            )}
            {entry.reason && <p className="text-sm-mobile text-red-700 mt-1">{entry.reason}</p>}
            {entry.text && <p className="text-sm-mobile text-gray-700 mt-1">{entry.text}</p>}
          </div>
        )
      })}
    </div>
  )
}
