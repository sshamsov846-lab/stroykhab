import React, { useRef } from 'react'
import { Camera, X, ImageIcon } from 'lucide-react'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

interface Props {
  taskId: string
  subWorkId: string
  canEdit: boolean
  required?: boolean
}

export const SubWorkPhotosPanel: React.FC<Props> = ({ taskId, subWorkId, canEdit, required }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const subWorks = useProjectWorkflowStore((s) => s.getTaskSubWorks(taskId))
  const sub = subWorks.find((s) => s.id === subWorkId)
  const addPhoto = useProjectWorkflowStore((s) => s.addSubWorkPhoto)
  const removePhoto = useProjectWorkflowStore((s) => s.removeSubWorkPhoto)

  const photos = sub?.workPhotos ?? []

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon size={18} className="text-primary-600" />
          <p className="text-sm-mobile font-semibold text-gray-900">Фото результата</p>
        </div>
        {required && photos.length === 0 && (
          <span className="text-xs-mobile text-red-600 font-medium">Обязательно</span>
        )}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url) => (
            <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img src={url} alt="" className="w-full h-full object-cover" />
              {canEdit && (
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
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 flex flex-col items-center gap-1 text-gray-500"
          >
            <Camera size={24} />
            <span className="text-sm-mobile">Добавить фото</span>
          </button>
        </>
      )}

      {!canEdit && photos.length === 0 && (
        <p className="text-sm-mobile text-gray-500">Мастер ещё не прикрепил фото</p>
      )}
    </div>
  )
}
