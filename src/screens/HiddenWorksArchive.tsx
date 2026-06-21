import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, ShieldAlert } from 'lucide-react'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { getObjectById } from '@api/supabase'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { collectHiddenWorksArchive, countPendingHiddenWorks } from '@utils/hiddenWorks'

export const HiddenWorksArchive: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const tasks = useProjectWorkflowStore((s) => s.tasks)
  const [objectName, setObjectName] = React.useState('')

  useEffect(() => {
    if (!id) return
    getObjectById(id).then((obj) => {
      if (obj) setObjectName(obj.name)
    })
  }, [id])

  if (!id) {
    return <div className="p-4 text-gray-500">Объект не найден</div>
  }

  const archive = collectHiddenWorksArchive(id, tasks)
  const pending = countPendingHiddenWorks(id, tasks)

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button
          type="button"
          onClick={() => navigate(`/object/${id}`)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
          aria-label="Назад"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs-mobile text-gray-500 truncate">{objectName || 'Объект'}</p>
          <h1 className="text-lg-mobile font-bold truncate">Скрытые работы</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert size={20} className="text-amber-700 shrink-0" />
            <div>
              <p className="text-sm-mobile font-semibold text-amber-900">Архив фотофиксации</p>
              <p className="text-xs-mobile text-amber-800 mt-1">
                Все принятые скрытые работы с фото до закрытия — под стяжкой, штукатуркой и отделкой.
                Хранится для гарантии и при спорах.
              </p>
              {pending > 0 && (
                <p className="text-xs-mobile font-medium text-red-700 mt-2">
                  Ожидают приёмки с фото: {pending}
                </p>
              )}
            </div>
          </div>
        </div>

        {archive.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <Camera size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm-mobile text-gray-600">Пока нет принятых скрытых работ</p>
            <p className="text-xs-mobile text-gray-400 mt-1">
              После приёмки с фото «до закрытия» записи появятся здесь
            </p>
          </div>
        ) : (
          archive.map((entry) => (
            <div
              key={`${entry.taskId}__${entry.subWorkId}`}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => navigate(`/workflow/${entry.taskId}/sub/${entry.subWorkId}`)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm-mobile font-semibold text-gray-900">{entry.subWorkLabel}</p>
                    <p className="text-xs-mobile text-gray-500 mt-0.5">
                      {entry.apartmentNumber} · {WORK_TYPE_LABELS[entry.workType] || entry.workType}
                    </p>
                    {entry.acceptedAt && (
                      <p className="text-xs-mobile text-gray-400 mt-1">
                        Принято: {new Date(entry.acceptedAt).toLocaleString('ru-RU')}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs-mobile bg-emerald-100 text-emerald-800">
                    <Camera size={12} />
                    {entry.beforeClosePhotos.length}
                  </span>
                </div>
              </button>
              <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                {entry.beforeClosePhotos.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-xl overflow-hidden bg-gray-100"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
