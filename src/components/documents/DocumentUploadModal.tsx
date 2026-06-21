import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Upload, X } from 'lucide-react'
import { BigButton } from '@components/BigButton'
import { useUserStore } from '@store/userStore'
import { useObjectDocumentStore } from '@store/objectDocumentStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_ACCESS_LABELS,
  type DocumentCategory,
  type DocumentAccessScope,
} from '@/types/objectDocuments'
import type { AppRole } from '@store/userStore'

const ROLE_OPTIONS: { id: AppRole; label: string }[] = [
  { id: 'client', label: 'Заказчик' },
  { id: 'foreman', label: 'Прораб' },
  { id: 'subcontractor', label: 'Организация' },
  { id: 'worker', label: 'Мастер' },
]

interface Props {
  objectId: string
  existingDocumentId?: string
  defaultTitle?: string
  defaultCategory?: DocumentCategory
  defaultTaskId?: string
  onClose: () => void
  onDone?: () => void
}

export const DocumentUploadModal: React.FC<Props> = ({
  objectId,
  existingDocumentId,
  defaultTitle = '',
  defaultCategory = 'project',
  defaultTaskId,
  onClose,
  onDone,
}) => {
  const fullName = useUserStore((s) => s.fullName)
  const role = useUserStore((s) => s.role)
  const uploadDocument = useObjectDocumentStore((s) => s.uploadDocument)
  const addVersion = useObjectDocumentStore((s) => s.addVersion)
  const tasks = useProjectWorkflowStore((s) =>
    Object.values(s.tasks).filter((t) => t.objectId === objectId),
  )

  const [title, setTitle] = useState(defaultTitle)
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory)
  const [description, setDescription] = useState('')
  const [access, setAccess] = useState<DocumentAccessScope>('all')
  const [allowedRoles, setAllowedRoles] = useState<AppRole[]>(['foreman', 'subcontractor'])
  const [taskId, setTaskId] = useState(defaultTaskId ?? '')
  const [fileData, setFileData] = useState<{
    fileName: string
    fileUrl: string
    mimeType: string
    fileSize: number
  } | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 8 МБ)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setFileData({
        fileName: file.name,
        fileUrl: String(reader.result),
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      })
    }
    reader.readAsDataURL(file)
  }

  const toggleRole = (r: AppRole) => {
    setAllowedRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    )
  }

  const handleSubmit = () => {
    if (!fileData) {
      toast.error('Выберите файл')
      return
    }
    if (!existingDocumentId && !title.trim()) {
      toast.error('Укажите название')
      return
    }
    if (access === 'roles' && allowedRoles.length === 0) {
      toast.error('Выберите хотя бы одну роль')
      return
    }

    const task = taskId ? tasks.find((t) => t.id === taskId) : undefined

    if (existingDocumentId) {
      addVersion({
        documentId: existingDocumentId,
        ...fileData,
        uploadedBy: fullName,
        uploadedByRole: role,
        note: description.trim() || undefined,
      })
      toast.success('Новая версия сохранена')
    } else {
      uploadDocument({
        objectId,
        title: title.trim(),
        category,
        description: description.trim() || undefined,
        access,
        allowedRoles: access === 'roles' ? allowedRoles : undefined,
        taskId: task?.id,
        taskTitle: task?.title,
        ...fileData,
        uploadedBy: fullName,
        uploadedByRole: role,
      })
      toast.success('Документ загружен')
    }
    onDone?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-4 space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-base-mobile font-bold text-gray-900">
            {existingDocumentId ? 'Новая версия' : 'Загрузить документ'}
          </p>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {!existingDocumentId && (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название документа"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
            >
              {(Object.entries(DOCUMENT_CATEGORY_LABELS) as [DocumentCategory, string][]).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
            <select
              value={access}
              onChange={(e) => setAccess(e.target.value as DocumentAccessScope)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
            >
              {(Object.entries(DOCUMENT_ACCESS_LABELS) as [DocumentAccessScope, string][]).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
            {access === 'roles' && (
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    className={`px-3 py-1.5 rounded-full text-xs-mobile font-medium ${
                      allowedRoles.includes(r.id) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
            >
              <option value="">Без привязки к задаче</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title} — {t.house}</option>
              ))}
            </select>
          </>
        )}

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание (необязательно)"
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
        />

        <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer">
          <Upload size={28} className="text-gray-400" />
          <span className="text-sm-mobile text-gray-600">PDF, Excel, изображения и др.</span>
          <input type="file" className="hidden" onChange={handleFile} />
          {fileData && (
            <p className="text-xs-mobile text-primary-600 font-medium">{fileData.fileName}</p>
          )}
        </label>

        <BigButton variant="primary" size="lg" fullWidth onClick={handleSubmit}>
          {existingDocumentId ? 'Сохранить версию' : 'Загрузить'}
        </BigButton>
        <BigButton variant="ghost" size="lg" fullWidth onClick={onClose}>
          Отмена
        </BigButton>
      </div>
    </div>
  )
}
