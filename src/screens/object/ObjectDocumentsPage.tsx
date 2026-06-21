import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Search,
  Plus,
  Download,
  ChevronDown,
  ChevronRight,
  Link2,
} from 'lucide-react'
import { useUserStore } from '@store/userStore'
import { useObjectDocumentStore } from '@store/objectDocumentStore'
import { getObjectById } from '@api/supabase'
import { DocumentUploadModal } from '@components/documents/DocumentUploadModal'
import { canViewDocument } from '@utils/objectDocumentAccess'
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_ACCESS_LABELS,
  formatFileSize,
  isPreviewableMime,
  type DocumentCategory,
  type ObjectDocument,
} from '@/types/objectDocuments'

export const ObjectDocumentsPage: React.FC = () => {
  const { id: objectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const role = useUserStore((s) => s.role)
  const fullName = useUserStore((s) => s.fullName)
  const allDocs = useObjectDocumentStore((s) => s.documents)

  const [objectName, setObjectName] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [versionDocId, setVersionDocId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<{ url: string; mime: string; name: string } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  React.useEffect(() => {
    if (!objectId) return
    getObjectById(objectId).then((o) => setObjectName(o?.name ?? 'Объект'))
  }, [objectId])

  const visibleDocs = useMemo(() => {
    if (!objectId) return []
    return allDocs
      .filter((d) => d.objectId === objectId)
      .filter((d) => canViewDocument(d, role, fullName))
      .filter((d) => categoryFilter === 'all' || d.category === categoryFilter)
      .filter((d) => !search.trim() || d.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [allDocs, objectId, role, fullName, categoryFilter, search])

  const byCategory = useMemo(() => {
    const map = new Map<DocumentCategory, ObjectDocument[]>()
    for (const d of visibleDocs) {
      const list = map.get(d.category) ?? []
      list.push(d)
      map.set(d.category, list)
    }
    return map
  }, [visibleDocs])

  const downloadFile = (url: string, fileName: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
  }

  if (!objectId) return null

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg-mobile font-bold truncate">Документы</h1>
            <p className="text-xs-mobile text-gray-500 truncate">{objectName}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-600 text-white"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as DocumentCategory | 'all')}
          className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200 text-xs-mobile"
        >
          <option value="all">Все категории</option>
          {(Object.entries(DOCUMENT_CATEGORY_LABELS) as [DocumentCategory, string][]).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      <div className="p-4 space-y-4">
        {visibleDocs.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileText size={48} className="mx-auto text-gray-300" />
            <p className="text-sm-mobile text-gray-500">Документов пока нет</p>
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="text-primary-600 text-sm-mobile font-medium"
            >
              Загрузить первый документ
            </button>
          </div>
        ) : (
          [...byCategory.entries()].map(([cat, docs]) => (
            <section key={cat} className="space-y-2">
              <p className="text-xs-mobile font-semibold text-gray-500 uppercase">
                {DOCUMENT_CATEGORY_LABELS[cat]} ({docs.length})
              </p>
              {docs.map((doc) => {
                const latest = doc.versions[doc.versions.length - 1]
                const open = expandedId === doc.id
                return (
                  <div key={doc.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : doc.id)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <FileText size={20} className="text-primary-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm-mobile font-semibold text-gray-900 truncate">
                            {doc.title}
                            {doc.versions.length > 1 && (
                              <span className="text-primary-600 font-normal"> · v{latest.versionNumber}</span>
                            )}
                          </p>
                          {doc.description && (
                            <p className="text-xs-mobile text-gray-500 mt-0.5 line-clamp-2">{doc.description}</p>
                          )}
                          <p className="text-xs-mobile text-gray-400 mt-1">
                            {latest.uploadedBy} · {new Date(latest.uploadedAt).toLocaleDateString('ru-RU')} · {formatFileSize(latest.fileSize)}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Доступ: {DOCUMENT_ACCESS_LABELS[doc.access]}
                          </p>
                          {doc.taskTitle && (
                            <p className="text-xs-mobile text-primary-600 flex items-center gap-1 mt-1">
                              <Link2 size={12} /> {doc.taskTitle}
                            </p>
                          )}
                        </div>
                        {open ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                      </div>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
                        <div className="flex gap-2">
                          {isPreviewableMime(latest.mimeType) && (
                            <button
                              type="button"
                              onClick={() => setPreviewUrl({ url: latest.fileUrl, mime: latest.mimeType, name: latest.fileName })}
                              className="flex-1 py-2 bg-primary-50 text-primary-700 rounded-lg text-xs-mobile font-medium"
                            >
                              Просмотр
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => downloadFile(latest.fileUrl, latest.fileName)}
                            className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs-mobile font-medium flex items-center justify-center gap-1"
                          >
                            <Download size={14} /> Скачать
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVersionDocId(doc.id)}
                          className="w-full py-2 text-primary-600 text-xs-mobile font-medium"
                        >
                          + Загрузить новую версию
                        </button>
                        {doc.versions.length > 1 && (
                          <div className="space-y-1 pt-2">
                            <p className="text-[10px] text-gray-500 uppercase">История версий</p>
                            {[...doc.versions].reverse().map((v) => (
                              <div key={v.id} className="flex items-center justify-between text-xs-mobile py-1">
                                <span>v{v.versionNumber} · {new Date(v.uploadedAt).toLocaleDateString('ru-RU')}</span>
                                <button
                                  type="button"
                                  onClick={() => downloadFile(v.fileUrl, v.fileName)}
                                  className="text-primary-600"
                                >
                                  Скачать
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          ))
        )}
      </div>

      {showUpload && (
        <DocumentUploadModal objectId={objectId} onClose={() => setShowUpload(false)} />
      )}
      {versionDocId && (
        <DocumentUploadModal
          objectId={objectId}
          existingDocumentId={versionDocId}
          onClose={() => setVersionDocId(null)}
        />
      )}

      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 text-white">
            <p className="text-sm-mobile truncate flex-1">{previewUrl.name}</p>
            <button type="button" onClick={() => setPreviewUrl(null)} className="ml-2 px-3 py-1 bg-white/20 rounded-lg text-sm">
              Закрыть
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            {previewUrl.mime.startsWith('image/') ? (
              <img src={previewUrl.url} alt="" className="max-w-full max-h-full object-contain" />
            ) : (
              <iframe src={previewUrl.url} title={previewUrl.name} className="w-full h-full min-h-[70vh] bg-white rounded-lg" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
