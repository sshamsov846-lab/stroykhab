import React, { useMemo, useState } from 'react'
import { FileText, Download, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@store/userStore'
import { useObjectDocumentStore } from '@store/objectDocumentStore'
import { canViewDocument } from '@utils/objectDocumentAccess'
import { formatFileSize, isPreviewableMime } from '@/types/objectDocuments'

interface Props {
  objectId: string
  taskId: string
}

export const TaskDocumentsPanel: React.FC<Props> = ({ objectId, taskId }) => {
  const navigate = useNavigate()
  const role = useUserStore((s) => s.role)
  const fullName = useUserStore((s) => s.fullName)
  const allDocs = useObjectDocumentStore((s) => s.documents)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const docs = useMemo(
    () =>
      allDocs
        .filter((d) => d.objectId === objectId && (d.taskId === taskId || !d.taskId))
        .filter((d) => canViewDocument(d, role, fullName))
        .filter((d) => d.taskId === taskId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [allDocs, objectId, taskId, role, fullName],
  )

  if (docs.length === 0) return null

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm-mobile font-semibold text-gray-900 flex items-center gap-2">
          <FileText size={18} className="text-primary-600" />
          Документы задачи
        </p>
        <button
          type="button"
          onClick={() => navigate(`/object/${objectId}/documents`)}
          className="text-xs-mobile text-primary-600 flex items-center gap-0.5"
        >
          Все <ChevronRight size={14} />
        </button>
      </div>
      {docs.map((doc) => {
        const latest = doc.versions[doc.versions.length - 1]
        return (
          <div key={doc.id} className="p-3 rounded-xl bg-gray-50 space-y-2">
            <p className="text-sm-mobile font-medium text-gray-900">
              {doc.title}
              {doc.versions.length > 1 && ` (v${latest.versionNumber})`}
            </p>
            <p className="text-xs-mobile text-gray-500">
              {latest.fileName} · {formatFileSize(latest.fileSize)}
            </p>
            <div className="flex gap-2">
              {isPreviewableMime(latest.mimeType) && (
                <button
                  type="button"
                  onClick={() => setPreviewUrl(latest.fileUrl)}
                  className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-xs-mobile font-medium"
                >
                  Просмотр
                </button>
              )}
              <a
                href={latest.fileUrl}
                download={latest.fileName}
                className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-xs-mobile font-medium text-center flex items-center justify-center gap-1"
              >
                <Download size={14} /> Скачать
              </a>
            </div>
          </div>
        )
      })}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
