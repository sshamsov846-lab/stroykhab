import React, { useRef } from 'react'
import { Camera, X, ShieldAlert } from 'lucide-react'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { WORK_TYPE_LABELS } from '@api/hierarchy'

interface Props {
  taskId: string
  subWorkId: string
  canEdit: boolean
  required?: boolean
  hiddenCoveredBy?: import('@types').WorkType
}

export const SubWorkBeforeClosePhotosPanel: React.FC<Props> = ({
  taskId,
  subWorkId,
  canEdit,
  required,
  hiddenCoveredBy,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const subWorks = useProjectWorkflowStore((s) => s.getTaskSubWorks(taskId))
  const sub = subWorks.find((s) => s.id === subWorkId)
  const addPhoto = useProjectWorkflowStore((s) => s.addSubWorkBeforeClosePhoto)
  const removePhoto = useProjectWorkflowStore((s) => s.removeSubWorkBeforeClosePhoto)

  const photos = sub?.beforeClosePhotos ?? []
  const coveredLabel = hiddenCoveredBy ? WORK_TYPE_LABELS[hiddenCoveredBy] || hiddenCoveredBy : 'следующим этапом'

  return (
    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-3">
      <div className="flex items-start gap-2">
        <ShieldAlert size={18} className="text-amber-700 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm-mobile font-semibold text-amber-900">Фото ДО закрытия</p>
            {required && photos.length === 0 && (
              <span className="text-xs-mobile text-red-600 font-medium shrink-0">Обязательно</span>
            )}
          </div>
          <p className="text-xs-mobile text-amber-800 mt-1">
            Скрытая работа — сфотографируйте до {coveredLabel}. Фото сохраняется навсегда для гарантии.
          </p>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url) => (
            <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-white">
              <img src={url} alt="" className="w-full h-full object-cover" />
              {canEdit && sub?.status !== 'done' && (
                <button
                  type="button"
                  onClick={() => removePhoto(taskId, subWorkId, url)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white"
                  aria-label="Удалить фото"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files
              if (!files) return
              for (const f of Array.from(files)) {
                addPhoto(taskId, subWorkId, URL.createObjectURL(f))
              }
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-amber-300 rounded-xl py-4 flex flex-col items-center gap-1 text-amber-800 bg-white/60"
          >
            <Camera size={24} />
            <span className="text-sm-mobile font-medium">Сфотографировать до закрытия</span>
          </button>
        </>
      )}

      {!canEdit && photos.length === 0 && (
        <p className="text-sm-mobile text-amber-800">Мастер ещё не прикрепил фото до закрытия</p>
      )}
    </div>
  )
}
