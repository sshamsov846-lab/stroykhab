import React, { useRef, useState } from 'react'
import { FileSpreadsheet, Download, Upload, FileText, Image as ImageIcon, Trash2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { BigButton } from '@components/BigButton'
import { downloadExcelProjectTemplate } from '@utils/excelProjectTemplate'
import {
  buildSectionsFromExcelRows,
  isExcelProjectFile,
  isProjectAttachmentFile,
  parseExcelProjectFile,
  readFileAsDataUrl,
} from '@utils/excelProjectParser'
import type { ExcelApartmentRow, ExcelProjectPreview, PendingProjectAttachment } from '@/types/projectExcel'
import type { WizardSectionDraft } from '@/types/objectStructure'
import type { WorkTemplateId } from '@/types/objectStructure'
import type { WizardHouseZoneOptions } from '@/types/buildingZones'
import { pluralWithCount, PLURAL } from '@utils/russianPlural'

export type StructureInputMode = 'manual' | 'excel'

interface Props {
  mode: StructureInputMode
  onModeChange: (mode: StructureInputMode) => void
  excelApplied: boolean
  excelPreview: ExcelProjectPreview | null
  excelFileName: string
  attachments: PendingProjectAttachment[]
  onExcelApplied: (params: {
    rows: ExcelApartmentRow[]
    preview: ExcelProjectPreview
    fileName: string
    fileUrl: string
    mimeType: string
    fileSize: number
    sections: WizardSectionDraft[]
  }) => void
  onExcelCleared: () => void
  onAttachmentAdded: (file: PendingProjectAttachment) => void
  onAttachmentRemoved: (id: string) => void
  workTemplate: WorkTemplateId
  zoneOptions: WizardHouseZoneOptions
}

export const ProjectUploadBlock: React.FC<Props> = ({
  mode,
  onModeChange,
  excelApplied,
  excelPreview,
  excelFileName,
  attachments,
  onExcelApplied,
  onExcelCleared,
  onAttachmentAdded,
  onAttachmentRemoved,
  workTemplate,
  zoneOptions,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingPreview, setPendingPreview] = useState<ExcelProjectPreview | null>(null)
  const [pendingRows, setPendingRows] = useState<ExcelApartmentRow[]>([])
  const [pendingFile, setPendingFile] = useState<{ name: string; url: string; mime: string; size: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = async (file: File) => {
    if (!isProjectAttachmentFile(file)) {
      toast.error('Поддерживаются Excel (.xlsx, .csv), PDF и изображения')
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 12 МБ)')
      return
    }

    setLoading(true)
    try {
      const fileUrl = await readFileAsDataUrl(file)

      if (isExcelProjectFile(file)) {
        const { rows, preview } = await parseExcelProjectFile(file)
        if (preview.errors.length) {
          toast.error(preview.errors[0])
          return
        }
        if (!rows.length) {
          toast.error('В файле нет квартир')
          return
        }
        setPendingRows(rows)
        setPendingPreview(preview)
        setPendingFile({ name: file.name, url: fileUrl, mime: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: file.size })
        return
      }

      const kind = file.type === 'application/pdf' ? 'attachment' : 'attachment'
      onAttachmentAdded({
        id: `pf-${Date.now()}`,
        fileName: file.name,
        fileUrl,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        kind,
        description: file.type === 'application/pdf' ? 'Проект объекта (смотреть прорабу)' : 'Чертёж / фото проекта',
      })
      toast.success('Файл добавлен как вложение')
    } catch {
      toast.error('Не удалось прочитать файл')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const confirmExcel = () => {
    if (!pendingPreview || !pendingRows.length || !pendingFile) return
    const sections = buildSectionsFromExcelRows(pendingRows, workTemplate, zoneOptions)
    onExcelApplied({
      rows: pendingRows,
      preview: pendingPreview,
      fileName: pendingFile.name,
      fileUrl: pendingFile.url,
      mimeType: pendingFile.mime,
      fileSize: pendingFile.size,
      sections,
    })
    setPendingPreview(null)
    setPendingRows([])
    setPendingFile(null)
    toast.success('Зоны созданы из Excel')
  }

  const displayPreview = pendingPreview ?? (excelApplied ? excelPreview : null)

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
      <div>
        <h3 className="text-base-mobile font-semibold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-primary-600" />
          Загрузить проект объекта
        </h3>
        <p className="text-xs-mobile text-gray-500 mt-1">
          Excel — автоматически создаст квартиры и зоны. PDF и чертежи — вложение для прораба и организации.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onModeChange('excel')}
          className={`px-3 py-2 rounded-xl text-sm-mobile border ${
            mode === 'excel' ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-gray-200'
          }`}
        >
          Из Excel
        </button>
        <button
          type="button"
          onClick={() => onModeChange('manual')}
          className={`px-3 py-2 rounded-xl text-sm-mobile border ${
            mode === 'manual' ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-gray-200'
          }`}
        >
          Вручную
        </button>
      </div>

      {mode === 'excel' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              downloadExcelProjectTemplate()
              toast.success('Шаблон скачан')
            }}
            className="inline-flex items-center gap-2 text-sm-mobile text-primary-600 font-medium"
          >
            <Download size={16} />
            Скачать шаблон Excel
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
          />

          <BigButton
            variant="secondary"
            size="md"
            fullWidth
            icon={<Upload size={16} />}
            isLoading={loading}
            onClick={() => inputRef.current?.click()}
          >
            Выбрать файл проекта
          </BigButton>

          {displayPreview && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-2 text-sm-mobile">
              <p className="font-semibold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 size={16} />
                {pendingPreview ? 'Превью перед созданием' : 'Загружено из Excel'}
              </p>
              {excelFileName && excelApplied && !pendingPreview && (
                <p className="text-xs-mobile text-emerald-800">{excelFileName}</p>
              )}
              <p>
                Найдено:{' '}
                <span className="font-semibold">
                  {pluralWithCount(displayPreview.apartmentCount, PLURAL.apartment)}
                </span>
                , общая площадь{' '}
                <span className="font-semibold">{Math.round(displayPreview.totalApartmentArea).toLocaleString('ru-RU')} м²</span>
              </p>
              <p className="text-xs-mobile text-emerald-800">
                {displayPreview.entrances.length} подъезд(ов) · {displayPreview.totalRooms} комнат · {displayPreview.totalKitchens} кухонь
              </p>
              {displayPreview.warnings.map((w) => (
                <p key={w} className="text-xs-mobile text-amber-800">{w}</p>
              ))}
              {pendingPreview && (
                <BigButton variant="primary" size="sm" fullWidth onClick={confirmExcel}>
                  Создать зоны из Excel
                </BigButton>
              )}
              {excelApplied && !pendingPreview && (
                <button
                  type="button"
                  onClick={onExcelCleared}
                  className="text-xs-mobile text-red-600 underline"
                >
                  Сбросить и загрузить другой файл
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <p className="text-xs-mobile text-gray-500 bg-gray-50 rounded-xl p-3">
          Заполните подъезды и этажи вручную ниже — как раньше.
        </p>
      )}

      <div className="border-t border-gray-100 pt-3 space-y-2">
        <p className="text-sm-mobile font-medium text-gray-800">Вложения проекта (PDF, чертежи, фото)</p>
        <p className="text-xs-mobile text-gray-500">Проект объекта (смотреть прорабу) — не распознаётся автоматически</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm-mobile text-primary-600 flex items-center gap-1"
        >
          <Upload size={14} /> Добавить PDF или изображение
        </button>
        {attachments.length > 0 && (
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 text-sm-mobile">
                {a.mimeType === 'application/pdf' ? (
                  <FileText size={16} className="text-red-500 shrink-0" />
                ) : (
                  <ImageIcon size={16} className="text-blue-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{a.fileName}</p>
                  <p className="text-xs-mobile text-gray-500">{a.description ?? 'Вложение'}</p>
                </div>
                <button type="button" onClick={() => onAttachmentRemoved(a.id)} className="p-1 text-gray-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
