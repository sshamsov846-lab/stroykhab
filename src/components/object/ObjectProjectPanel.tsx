import React, { useMemo } from 'react'
import { FileSpreadsheet, FileText, Download, Building2, Layers } from 'lucide-react'
import { useClientPortalStore } from '@store/clientPortalStore'
import { useObjectDocumentStore } from '@store/objectDocumentStore'
import { useUserStore } from '@store/userStore'
import { canViewDocument } from '@utils/objectDocumentAccess'
import { formatFileSize, isPreviewableMime } from '@/types/objectDocuments'
import { pluralWithCount, PLURAL } from '@utils/russianPlural'

interface Props {
  objectId: string
}

export const ObjectProjectPanel: React.FC<Props> = ({ objectId }) => {
  const role = useUserStore((s) => s.role)
  const fullName = useUserStore((s) => s.fullName)
  const structure = useClientPortalStore((s) => s.customStructures[objectId])
  const allDocs = useObjectDocumentStore((s) => s.documents)

  const projectDocs = useMemo(
    () =>
      allDocs.filter(
        (d) =>
          d.objectId === objectId
          && (d.category === 'project' || d.category === 'blueprints')
          && canViewDocument(d, role, fullName),
      ),
    [allDocs, objectId, role, fullName],
  )

  const summary = structure?.excelImport?.summary
  const plotSotkas = structure?.wizardMeta?.plotAreaSotkas

  if (!structure && projectDocs.length === 0) return null

  const download = (url: string, fileName: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.rel = 'noopener'
    a.click()
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <h3 className="text-base-mobile font-semibold text-gray-900 flex items-center gap-2">
        <FileSpreadsheet size={18} className="text-primary-600" />
        Проект объекта
      </h3>
      <p className="text-xs-mobile text-gray-500">Зоны, площади и вложения от заказчика</p>

      {summary && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 space-y-2 text-sm-mobile">
          <p className="font-semibold text-primary-900">Сводка по проекту</p>
          <div className="grid grid-cols-2 gap-1 text-xs-mobile">
            <span>{pluralWithCount(summary.apartmentCount, PLURAL.apartment)}</span>
            <span>{summary.totalRooms} комнат</span>
            <span>{summary.totalKitchens} кухонь</span>
            <span>{Math.round(summary.totalApartmentArea).toLocaleString('ru-RU')} м² всего</span>
          </div>
          {summary.entrances.map((e) => (
            <p key={e.entrance} className="text-xs-mobile text-gray-700 flex items-center gap-1">
              <Building2 size={12} />
              Подъезд {e.entrance}: {e.apartments} кв., {Math.round(e.totalArea)} м²
            </p>
          ))}
          {summary.floors.length > 0 && summary.floors.length <= 8 && (
            <div className="pt-1 border-t border-primary-100 space-y-0.5">
              {summary.floors.map((f) => (
                <p key={`${f.entrance}-${f.floor}`} className="text-[11px] text-gray-600 flex items-center gap-1">
                  <Layers size={10} />
                  П.{f.entrance} эт.{f.floor}: {f.apartmentCount} кв., этаж {Math.round(f.floorArea)} м²
                </p>
              ))}
            </div>
          )}
          {plotSotkas && plotSotkas > 0 && (
            <p className="text-xs-mobile text-gray-700">
              Участок: {plotSotkas} сот. ({(plotSotkas / 100).toFixed(2)} га)
            </p>
          )}
        </div>
      )}

      {!summary && structure && (
        <div className="text-sm-mobile text-gray-600">
          {pluralWithCount(structure.summary.apartments, PLURAL.apartment)} · {structure.summary.zones} зон
        </div>
      )}

      {projectDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs-mobile font-medium text-gray-600">Файлы проекта</p>
          {projectDocs.map((doc) => {
            const v = doc.versions[doc.versions.length - 1]
            if (!v) return null
            return (
              <div key={doc.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                {v.mimeType === 'application/pdf' ? (
                  <FileText size={18} className="text-red-500 shrink-0" />
                ) : (
                  <FileSpreadsheet size={18} className="text-emerald-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm-mobile font-medium truncate">{doc.title}</p>
                  <p className="text-xs-mobile text-gray-500">
                    {v.fileName} · {formatFileSize(v.fileSize)}
                  </p>
                  {doc.description && (
                    <p className="text-xs-mobile text-primary-700 mt-0.5">{doc.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isPreviewableMime(v.mimeType) && v.fileUrl.startsWith('data:')) {
                      window.open(v.fileUrl, '_blank', 'noopener,noreferrer')
                    } else {
                      download(v.fileUrl, v.fileName)
                    }
                  }}
                  className="shrink-0 p-2 rounded-lg text-primary-600 hover:bg-primary-50"
                  title="Скачать / открыть"
                >
                  <Download size={18} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
