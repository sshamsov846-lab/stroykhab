import React from 'react'
import { STATUS_COLORS, STATUS_LABELS } from '@api/clientView'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { calcSubWorkProgress } from '@/types/subWorks'
import { Camera, ShieldAlert } from 'lucide-react'

interface Props {
  taskId: string
  workTypeLabel: string
  onSelect: (subWorkId: string) => void
}

export const SubWorkListPanel: React.FC<Props> = ({ taskId, workTypeLabel, onSelect }) => {
  const ensureTaskSubWorks = useProjectWorkflowStore((s) => s.ensureTaskSubWorks)
  const subWorks = useProjectWorkflowStore((s) => s.getTaskSubWorks(taskId))

  React.useEffect(() => {
    ensureTaskSubWorks(taskId)
  }, [taskId, ensureTaskSubWorks])

  const progress = calcSubWorkProgress(subWorks)

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <p className="text-sm-mobile font-semibold text-gray-900">{workTypeLabel}</p>
        <p className="text-xs-mobile text-gray-500 mt-1">
          Прогресс: {progress.done} из {progress.total} принято ({progress.percent}%)
        </p>
        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      <p className="text-xs-mobile text-gray-500">Под-работы</p>

      {subWorks.map((sub) => (
        <button
          key={sub.id}
          type="button"
          onClick={() => onSelect(sub.id)}
          className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left"
        >
          <div className="flex justify-between items-center gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm-mobile font-semibold text-gray-900">{sub.label}</p>
                {sub.isHiddenWork && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                    <ShieldAlert size={10} />
                    Скрытая
                  </span>
                )}
                {sub.isHiddenWork && sub.status === 'done' && (sub.beforeClosePhotos?.length ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                    <Camera size={10} />
                    {sub.beforeClosePhotos!.length}
                  </span>
                )}
              </div>
              {sub.description && <p className="text-xs-mobile text-gray-500 truncate">{sub.description}</p>}
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs-mobile shrink-0 ${STATUS_COLORS[sub.status]}`}>
              {STATUS_LABELS[sub.status]}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
