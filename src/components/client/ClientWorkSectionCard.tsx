import React, { useState } from 'react'
import { Play, Image as ImageIcon } from 'lucide-react'
import type { ClientWorkSection } from '@api/clientView'
import { STATUS_LABELS, STATUS_COLORS, WORK_TYPE_LABELS } from '@api/clientView'

interface ClientWorkSectionCardProps {
  section: ClientWorkSection
}

export const ClientWorkSectionCard: React.FC<ClientWorkSectionCardProps> = ({ section }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-center justify-between gap-2"
      >
        <div>
          <p className="text-base-mobile font-bold text-gray-900">{WORK_TYPE_LABELS[section.type]}</p>
          <p className="text-sm-mobile text-gray-500">{section.organization}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs-mobile font-medium shrink-0 ${STATUS_COLORS[section.status]}`}>
          {STATUS_LABELS[section.status]}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-50">
          {section.tasks.map((task) => (
            <div key={task.id} className="pt-3">
              <p className="text-sm-mobile font-semibold text-gray-900">{task.title}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs-mobile ${STATUS_COLORS[task.status]}`}>
                {STATUS_LABELS[task.status]}
              </span>

              {task.done_note && (
                <div className="mt-2 p-2.5 bg-emerald-50 rounded-xl">
                  <p className="text-xs-mobile font-medium text-emerald-800">✓ Сделано</p>
                  <p className="text-xs-mobile text-emerald-700 mt-0.5">{task.done_note}</p>
                </div>
              )}
              {task.remaining_note && (
                <div className="mt-2 p-2.5 bg-amber-50 rounded-xl">
                  <p className="text-xs-mobile font-medium text-amber-800">○ Осталось</p>
                  <p className="text-xs-mobile text-amber-700 mt-0.5">{task.remaining_note}</p>
                </div>
              )}

              {task.media.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs-mobile text-gray-500 mb-2">Фото и видео от мастеров</p>
                  <div className="grid grid-cols-3 gap-2">
                    {task.media.map((m) => (
                      <div key={m.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        {m.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Play size={24} className="text-white" />
                          </div>
                        ) : (
                          <img src={m.url} alt={m.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                        )}
                        <span className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/50 text-white text-[10px] text-center truncate">
                          {m.caption}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {task.media.length === 0 && task.status === 'pending' && (
                <div className="mt-2 flex items-center gap-2 text-gray-400">
                  <ImageIcon size={16} />
                  <span className="text-xs-mobile">Фото появятся после начала работ</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
