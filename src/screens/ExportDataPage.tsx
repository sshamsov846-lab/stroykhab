import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { BigButton } from '@components/BigButton'
import { useUserStore } from '@store/userStore'
import { useObjectStore } from '@store/objectStore'
import {
  availableExportTypes,
  runDataExport,
  EXPORT_TYPE_LABELS,
  EXPORT_FORMAT_LABELS,
  type ExportDataType,
  type ExportFormat,
  type ExportFilters,
} from '@utils/dataExport'

export const ExportDataPage: React.FC = () => {
  const navigate = useNavigate()
  const role = useUserStore((s) => s.role)
  const userObjects = useObjectStore((s) => s.userObjects)

  const types = availableExportTypes(role)
  const [exportType, setExportType] = useState<ExportDataType>(types[0])
  const [format, setFormat] = useState<ExportFormat>('xlsx')
  const [filters, setFilters] = useState<ExportFilters>({})
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      await runDataExport(exportType, format, filters)
      toast.success('Выгрузка готова')
    } catch (e) {
      console.error(e)
      toast.error('Не удалось выгрузить данные')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-lg-mobile font-bold">Экспорт данных</h1>
          <p className="text-xs-mobile text-gray-500">Выгрузка ваших данных</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 flex gap-3">
          <FileSpreadsheet size={24} className="text-primary-600 shrink-0" />
          <p className="text-sm-mobile text-primary-900">
            Данные принадлежат вам. Выгрузите таблицы для Excel, 1С, CRM или сохраните резервную копию.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm-mobile font-semibold text-gray-900">Что выгрузить</p>
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setExportType(t)}
              className={`w-full text-left p-3 rounded-xl border-2 ${
                exportType === t ? 'border-primary-500 bg-primary-50' : 'border-gray-100'
              }`}
            >
              <p className="text-sm-mobile font-medium text-gray-900">{EXPORT_TYPE_LABELS[t]}</p>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm-mobile font-semibold text-gray-900">Формат</p>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
          >
            {(Object.entries(EXPORT_FORMAT_LABELS) as [ExportFormat, string][]).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm-mobile font-semibold text-gray-900">Фильтры</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
              placeholder="С"
            />
            <input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
              placeholder="По"
            />
          </div>
          {userObjects.length > 0 && (
            <select
              value={filters.objectId ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, objectId: e.target.value || undefined }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
            >
              <option value="">Все объекты</option>
              {userObjects.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}
          {(role === 'subcontractor' || role === 'foreman') && (
            <input
              value={filters.personFilter ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, personFilter: e.target.value || undefined }))}
              placeholder="Фильтр по имени прораба/мастера"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
            />
          )}
        </div>

        <BigButton
          variant="primary"
          size="lg"
          fullWidth
          icon={<Download size={18} />}
          isLoading={loading}
          onClick={handleExport}
        >
          {exportType === 'full' ? 'Выгрузить всё' : 'Выгрузить'}
        </BigButton>
      </div>
    </div>
  )
}
