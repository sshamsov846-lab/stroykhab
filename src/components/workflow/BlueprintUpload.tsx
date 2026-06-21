import React, { useRef } from 'react'
import { FileText, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import type { WorkType } from '@types'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

interface BlueprintUploadProps {
  objectId: string
  workType?: WorkType
  apartmentKey?: string
  taskId?: string
  label?: string
}

export const BlueprintUpload: React.FC<BlueprintUploadProps> = ({
  objectId,
  workType,
  apartmentKey,
  taskId,
  label = 'Загрузить чертёж (PDF / изображение)',
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadBlueprint = useProjectWorkflowStore((s) => s.uploadBlueprint)
  const blueprint = taskId ? useProjectWorkflowStore((s) => s.getBlueprintForTask(taskId)) : undefined

  return (
    <div className="border border-gray-100 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-primary-600" />
        <span className="text-sm-mobile font-medium text-gray-900">{label}</span>
      </div>
      {blueprint && (
        <div className="text-xs-mobile text-gray-500">
          v{blueprint.version} · {blueprint.fileName}
          {blueprint.version > 1 && <span className="text-red-600 font-medium"> · обновлён</span>}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const bp = uploadBlueprint({ objectId, file, workType, apartmentKey, taskId })
          toast.success(bp.version > 1 ? 'Чертёж обновлён — требуется подтверждение' : 'Чертёж загружен')
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 text-primary-600 text-sm-mobile font-medium"
      >
        <Upload size={16} />
        {blueprint ? 'Заменить файл' : 'Выбрать файл'}
      </button>
      {blueprint && blueprint.mimeType.startsWith('image/') && (
        <img src={blueprint.fileUrl} alt="" className="rounded-lg max-h-40 object-cover w-full" />
      )}
      {blueprint && blueprint.mimeType === 'application/pdf' && (
        <a href={blueprint.fileUrl} target="_blank" rel="noreferrer" className="text-sm-mobile text-primary-600 underline">
          Открыть PDF
        </a>
      )}
    </div>
  )
}
