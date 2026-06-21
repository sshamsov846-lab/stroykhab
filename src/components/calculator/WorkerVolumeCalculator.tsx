import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Calculator,
  Download,
  FileSpreadsheet,
  History,
  ImagePlus,
  Layers,
  Paperclip,
  Plus,
  Receipt,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@store/userStore'
import { useWorkCalculatorStore } from '@store/workCalculatorStore'
import type { CalculatorAttachmentType, CalculatorCatalogItem, CalculatorGroupId, CalculatorLine } from '@/types/workCalculator'
import {
  CALCULATOR_GROUP_LABELS,
  CALCULATOR_STATUS_LABELS,
  VOLUME_UNIT_OPTIONS,
} from '@/types/workCalculator'
import type { SpecializationId } from '@/constants/specializations'
import { CALCULATOR_WORK_SPECS, calculatorSpecLabel } from '@/constants/calculatorSpecs'
import { resolveUnitRateForCatalogItem, unitLabel } from '@utils/calculatorRates'
import { computeGroupTotals, computeSpecTotals, lineFromCatalogItem, normalizeLine } from '@utils/calculatorTotals'
import { importCalculatorFile } from '@utils/calculatorExcelImport'
import { importRatesFromFile } from '@utils/calculatorRateImport'
import { formatMoney } from '@utils/workerPayrollCalc'
import { downloadCalculatorReportExcel } from '@utils/calculatorReportExcel'
import { BigButton } from '@components/BigButton'
import { CalculatorLineRow } from '@components/calculator/CalculatorLineRow'
import type { VolumeUnit } from '@/types/workerPayroll'

interface Props {
  taskId: string
  objectId: string
  workerId: string
  workerName: string
}

function newLineId(): string {
  return `cl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function attachmentTypeForFile(file: File, purpose: 'rate' | 'project'): CalculatorAttachmentType {
  const name = file.name.toLowerCase()
  const mime = file.type
  if (purpose === 'rate') {
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return 'rate_file'
    if (mime.includes('pdf') || name.endsWith('.pdf')) return 'rate_pdf'
    return 'rate_photo'
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return 'excel'
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'project_pdf'
  return 'project_image'
}

export const WorkerVolumeCalculator: React.FC<Props> = ({ taskId, objectId, workerId, workerName }) => {
  const navigate = useNavigate()
  const specializationIds = useUserStore((s) => s.specializationIds)

  const getOrCreate = useWorkCalculatorStore((s) => s.getOrCreateCalculator)
  const updateLines = useWorkCalculatorStore((s) => s.updateLines)
  const addAttachment = useWorkCalculatorStore((s) => s.addAttachment)
  const removeAttachment = useWorkCalculatorStore((s) => s.removeAttachment)
  const addCustomCatalogItem = useWorkCalculatorStore((s) => s.addCustomCatalogItem)
  const getCatalogBySpec = useWorkCalculatorStore((s) => s.getCatalogBySpec)
  const importPersonalRates = useWorkCalculatorStore((s) => s.importPersonalRates)
  const submitCalculator = useWorkCalculatorStore((s) => s.submitCalculator)
  const calc = useWorkCalculatorStore((s) => s.getCalculatorByTask(taskId, workerId))

  const [selectedSpec, setSelectedSpec] = useState<SpecializationId | null>(
    specializationIds[0] ?? null,
  )
  const [showAllWorks, setShowAllWorks] = useState(false)
  const [lines, setLines] = useState<CalculatorLine[]>([])
  const [selectedCatalogId, setSelectedCatalogId] = useState('')
  const [showCatalog, setShowCatalog] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customUnit, setCustomUnit] = useState<VolumeUnit>('lm')
  const [customGroup, setCustomGroup] = useState<CalculatorGroupId>('other')
  const [customRate, setCustomRate] = useState('')
  const initRef = useRef(false)

  const catalog = useMemo(
    () => (selectedSpec ? getCatalogBySpec(selectedSpec) : []),
    [getCatalogBySpec, selectedSpec],
  )

  const catalogByGroup = useMemo(() => {
    const map = new Map<CalculatorGroupId, CalculatorCatalogItem[]>()
    for (const item of catalog) {
      const list = map.get(item.groupId) || []
      list.push(item)
      map.set(item.groupId, list)
    }
    return map
  }, [catalog])

  useEffect(() => {
    getOrCreate({ taskId, objectId, workerId, workerName })
  }, [getOrCreate, taskId, objectId, workerId, workerName])

  useEffect(() => {
    if (calc && !initRef.current) {
      setLines(calc.lines)
      initRef.current = true
    } else if (calc) {
      setLines(calc.lines)
    }
  }, [calc?.lines, calc?.updatedAt])

  const persistLines = (next: CalculatorLine[]) => {
    setLines(next)
    updateLines(taskId, workerId, next)
  }

  const applyPersonalRates = (nextLines: CalculatorLine[]) =>
    nextLines.map((l) => {
      if (!l.catalogItemId) return l
      const item = getCatalogBySpec('all').find((c) => c.id === l.catalogItemId)
      if (!item) return l
      const rate = resolveUnitRateForCatalogItem(item, workerId)
      return rate > 0 ? normalizeLine({ ...l, unitRate: rate }) : l
    })

  const groupTotals = useMemo(() => computeGroupTotals(lines), [lines])
  const specTotals = useMemo(() => computeSpecTotals(lines), [lines])
  const grandTotal = calc?.grandTotal ?? 0

  const addFromCatalog = () => {
    const item = catalog.find((c) => c.id === selectedCatalogId)
    if (!item) {
      toast.error('Выберите позицию из справочника')
      return
    }
    const unitRate = resolveUnitRateForCatalogItem(item, workerId)
    const line = lineFromCatalogItem(item, unitRate, newLineId())
    persistLines([...lines, line])
    setSelectedCatalogId('')
    setShowCatalog(false)
    toast.success('Позиция добавлена')
  }

  const addCustomLine = () => {
    const label = customLabel.trim()
    if (!label) {
      toast.error('Укажите название позиции')
      return
    }
    if (!selectedSpec) {
      toast.error('Выберите специализацию')
      return
    }
    const unitRate = parseFloat(customRate.replace(',', '.')) || 0
    const customItem = addCustomCatalogItem({
      specializationId: selectedSpec,
      groupId: customGroup,
      label,
      unit: customUnit,
      defaultRate: unitRate || undefined,
    })
    const line = lineFromCatalogItem(customItem, unitRate, newLineId())
    persistLines([...lines, line])
    setCustomLabel('')
    setCustomRate('')
    setShowCustom(false)
    toast.success('Позиция добавлена в справочник')
  }

  const handleProjectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const name = file.name.toLowerCase()
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')

    if (isExcel) {
      try {
        const { lines: imported, errors } = await importCalculatorFile(file)
        if (imported.length) persistLines([...lines, ...imported])
        if (errors.length) toast.error(`Импорт: ${imported.length} поз., пропущено ${errors.length}`)
        else if (imported.length) toast.success(`Загружено позиций: ${imported.length}`)
        else toast.error(errors[0] || 'Не удалось прочитать таблицу')
      } catch {
        toast.error('Ошибка чтения Excel')
      }
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      addAttachment(taskId, workerId, {
        type: attachmentTypeForFile(file, 'project'),
        fileName: file.name,
        fileUrl: reader.result,
        mimeType: file.type || 'application/octet-stream',
      })
      toast.success(isExcel ? 'Проект прикреплён' : 'Файл проекта сохранён')
    }
    reader.readAsDataURL(file)
  }

  const handleRateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const name = file.name.toLowerCase()
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')

    if (isExcel) {
      try {
        const { rows, errors } = await importRatesFromFile(file)
        if (!rows.length) {
          toast.error(errors[0] || 'Не удалось прочитать расценки')
          return
        }
        importPersonalRates(workerId, rows)
        persistLines(applyPersonalRates(lines))
        toast.success(`Загружено расценок: ${rows.length}`)
      } catch {
        toast.error('Ошибка чтения файла расценок')
      }
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      addAttachment(taskId, workerId, {
        type: attachmentTypeForFile(file, 'rate'),
        fileName: file.name,
        fileUrl: reader.result,
        mimeType: file.type || 'application/octet-stream',
      })
      if (!isExcel) toast.success('Расценка прикреплена — введите цены вручную')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    const result = submitCalculator(taskId, workerId)
    if (!result.ok) toast.error(result.reason || 'Не удалось отправить')
    else toast.success('Отчёт отправлен прорабу')
  }

  const handleDownload = () => {
    if (!calc?.lines.length) {
      toast.error('Нет данных для скачивания')
      return
    }
    downloadCalculatorReportExcel(calc)
    toast.success('Excel сохранён')
  }

  const statusLabel = calc ? CALCULATOR_STATUS_LABELS[calc.status] : 'Черновик'

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm-mobile font-semibold text-gray-900 flex items-center gap-2">
            <Calculator size={18} className="text-primary-600" />
            Калькулятор объёмов
          </p>
          <p className="text-xs-mobile text-gray-500 mt-1">
            Все специализации · {statusLabel}
            {selectedSpec ? ` · ${calculatorSpecLabel(selectedSpec)}` : ''}
          </p>
        </div>
        <span className="text-sm-mobile font-bold text-primary-700 whitespace-nowrap">
          {formatMoney(grandTotal)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setShowAllWorks(!showAllWorks)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary-50 border border-primary-100 text-sm-mobile font-medium text-primary-800"
      >
        <span className="flex items-center gap-2">
          <Layers size={16} />
          Все работы
        </span>
        {showAllWorks ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showAllWorks && (
        <div className="grid grid-cols-2 gap-2">
          {CALCULATOR_WORK_SPECS.map((spec) => (
            <button
              key={spec.id}
              type="button"
              onClick={() => {
                setSelectedSpec(spec.id)
                setShowAllWorks(false)
                toast.success(spec.label)
              }}
              className={`p-3 rounded-xl border text-left text-sm-mobile ${
                selectedSpec === spec.id
                  ? 'border-primary-500 bg-primary-50 font-semibold text-primary-800'
                  : 'border-gray-100 bg-gray-50 text-gray-800'
              }`}
            >
              <span className="mr-1">{spec.emoji}</span>
              {spec.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!selectedSpec}
          onClick={() => setShowCatalog(!showCatalog)}
          className="text-primary-600 text-sm-mobile flex items-center gap-1 px-3 py-2 rounded-lg bg-primary-50 disabled:opacity-40"
        >
          <Plus size={16} />
          Из справочника
          {showCatalog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          type="button"
          disabled={!selectedSpec}
          onClick={() => setShowCustom(!showCustom)}
          className="text-gray-700 text-sm-mobile flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-50 disabled:opacity-40"
        >
          <Plus size={16} />
          Своя позиция
        </button>
        <label className="text-gray-700 text-sm-mobile flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-50 cursor-pointer">
          <FileSpreadsheet size={16} />
          Загрузить проект
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.pdf,image/*"
            className="hidden"
            onChange={handleProjectUpload}
          />
        </label>
        <label className="text-gray-700 text-sm-mobile flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-50 cursor-pointer">
          <Receipt size={16} />
          Расценка (фото/файл)
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.pdf,image/*"
            className="hidden"
            onChange={handleRateUpload}
          />
        </label>
        {calc && calc.lines.length > 0 && (
          <button
            type="button"
            onClick={handleDownload}
            className="text-gray-700 text-sm-mobile flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-50"
          >
            <Download size={16} />
            Скачать Excel
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/worker/calculators')}
          className="text-gray-700 text-sm-mobile flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-50"
        >
          <History size={16} />
          История
        </button>
      </div>

      {!selectedSpec && (
        <p className="text-xs-mobile text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
          Нажмите «Все работы» и выберите специализацию
        </p>
      )}

      {showCatalog && selectedSpec && (
        <div className="p-3 rounded-xl bg-gray-50 space-y-2">
          <select
            value={selectedCatalogId}
            onChange={(e) => setSelectedCatalogId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
          >
            <option value="">Выберите позицию…</option>
            {[...catalogByGroup.entries()].map(([groupId, items]) => (
              <optgroup key={groupId} label={CALCULATOR_GROUP_LABELS[groupId]}>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} ({unitLabel(item.unit)})
                    {resolveUnitRateForCatalogItem(item, workerId) > 0
                      ? ` · ${formatMoney(resolveUnitRateForCatalogItem(item, workerId))}`
                      : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <BigButton variant="secondary" size="sm" fullWidth onClick={addFromCatalog}>
            Добавить позицию
          </BigButton>
        </div>
      )}

      {showCustom && selectedSpec && (
        <div className="p-3 rounded-xl bg-gray-50 space-y-2">
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Название работы / материала"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
          />
          <div className="flex gap-2">
            <select
              value={customGroup}
              onChange={(e) => setCustomGroup(e.target.value as CalculatorGroupId)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
            >
              {Object.entries(CALCULATOR_GROUP_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            <select
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value as VolumeUnit)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
            >
              {VOLUME_UNIT_OPTIONS.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>
          <input
            type="number"
            min={0}
            value={customRate}
            onChange={(e) => setCustomRate(e.target.value)}
            placeholder="Расценка за единицу"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
          />
          <BigButton variant="secondary" size="sm" fullWidth onClick={addCustomLine}>
            Добавить в калькулятор
          </BigButton>
        </div>
      )}

      {lines.length === 0 && (
        <p className="text-xs-mobile text-gray-400 text-center py-4">
          Выберите специализацию и добавьте позиции
        </p>
      )}

      {lines.map((line) => (
        <CalculatorLineRow
          key={line.id}
          line={line}
          onChange={(updated) => persistLines(lines.map((l) => (l.id === updated.id ? updated : l)))}
          onRemove={() => persistLines(lines.filter((l) => l.id !== line.id))}
        />
      ))}

      {(specTotals.length > 0 || groupTotals.length > 0) && (
        <div className="rounded-xl border border-gray-100 overflow-hidden space-y-0">
          {specTotals.length > 1 && (
            <>
              <p className="text-xs-mobile font-semibold text-gray-500 px-3 py-2 bg-gray-50">По специализациям</p>
              {specTotals.map((s) => (
                <div key={s.specializationId} className="flex justify-between px-3 py-2 border-t border-gray-50 text-sm-mobile">
                  <span className="text-gray-700">{s.label}</span>
                  <span className="font-medium">{formatMoney(s.total)}</span>
                </div>
              ))}
            </>
          )}
          {groupTotals.length > 0 && (
            <>
              <p className="text-xs-mobile font-semibold text-gray-500 px-3 py-2 bg-gray-50 border-t border-gray-100">По группам</p>
              {groupTotals.map((g) => (
                <div key={g.groupId} className="flex justify-between px-3 py-2 border-t border-gray-50 text-sm-mobile">
                  <span className="text-gray-700">{g.label}</span>
                  <span className="font-medium">{formatMoney(g.total)}</span>
                </div>
              ))}
            </>
          )}
          <div className="flex justify-between px-3 py-3 border-t-2 border-primary-100 bg-primary-50 text-sm-mobile font-bold">
            <span>Общий итог</span>
            <span className="text-primary-700">{formatMoney(grandTotal)}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs-mobile font-semibold text-gray-500">Вложения</p>
        <div className="flex flex-wrap gap-2">
          {calc?.attachments.map((att) => (
            <div key={att.id} className="relative group">
              {att.fileUrl && att.mimeType.startsWith('image/') ? (
                <img src={att.fileUrl} alt={att.fileName} className="w-16 h-16 rounded-lg object-cover border" />
              ) : (
                <div className="w-16 h-16 rounded-lg border bg-gray-50 flex flex-col items-center justify-center p-1">
                  <Paperclip size={14} className="text-gray-400" />
                  <span className="text-[9px] text-gray-500 truncate w-full text-center">{att.fileName}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(taskId, workerId, att.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
          <label className="w-16 h-16 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer gap-0.5">
            <ImagePlus size={16} className="text-gray-400" />
            <span className="text-[8px] text-gray-400 text-center">Фото</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleRateUpload} />
          </label>
        </div>
      </div>

      <BigButton variant="primary" size="md" fullWidth onClick={handleSubmit}>
        <Send size={18} className="inline mr-2" />
        Отправить отчёт прорабу
      </BigButton>
    </div>
  )
}
