import React from 'react'
import { Download, Paperclip } from 'lucide-react'
import type { TaskWorkCalculator } from '@/types/workCalculator'
import { CALCULATOR_GROUP_LABELS, CALCULATOR_STATUS_LABELS } from '@/types/workCalculator'
import { computeGroupTotals, computeSpecTotals } from '@utils/calculatorTotals'
import { unitLabel } from '@utils/calculatorRates'
import { downloadCalculatorReportExcel } from '@utils/calculatorReportExcel'
import { formatMoney } from '@utils/workerPayrollCalc'
import { BigButton } from '@components/BigButton'

interface Props {
  calc: TaskWorkCalculator
  showDownload?: boolean
  onDownload?: () => void
  footer?: React.ReactNode
}

export const CalculatorReportDetail: React.FC<Props> = ({
  calc,
  showDownload = true,
  onDownload,
  footer,
}) => {
  const groupTotals = computeGroupTotals(calc.lines)
  const specTotals = computeSpecTotals(calc.lines)
  const dateStr = new Date(calc.submittedAt ?? calc.updatedAt).toLocaleDateString('ru-RU')

  const handleDownload = () => {
    downloadCalculatorReportExcel(calc)
    onDownload?.()
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-100 p-3 bg-gray-50 space-y-1 text-sm-mobile">
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Объект</span>
          <span className="font-medium text-gray-900 text-right">{calc.objectName}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Зона</span>
          <span className="text-gray-900 text-right">{calc.zoneLabel}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Мастер</span>
          <span className="text-gray-900 text-right">
            {calc.workerName}
            {calc.workerCode ? ` · ${calc.workerCode}` : ''}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Специализация</span>
          <span className="text-gray-900 text-right">{calc.specializationLabel}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Дата</span>
          <span className="text-gray-900">{dateStr}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Статус</span>
          <span className="font-medium text-primary-700">{CALCULATOR_STATUS_LABELS[calc.status]}</span>
        </div>
        {calc.returnReason && (
          <p className="text-xs-mobile text-red-600 pt-1">Причина возврата: {calc.returnReason}</p>
        )}
      </div>

      {calc.lines.map((line) => (
        <div key={line.id} className="px-3 py-2 border border-gray-100 rounded-xl flex justify-between gap-2 text-sm-mobile">
          <div className="min-w-0">
            <p className="text-gray-900">{line.label}</p>
            <p className="text-xs-mobile text-gray-400">
              {line.quantity} {unitLabel(line.unit)} × {formatMoney(line.unitRate)}
            </p>
          </div>
          <span className="font-medium whitespace-nowrap">{formatMoney(line.amount)}</span>
        </div>
      ))}

      {specTotals.length > 1 && (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <p className="text-xs-mobile font-semibold text-gray-500 px-3 py-2 bg-gray-50">По специализациям</p>
          {specTotals.map((s) => (
            <div key={s.specializationId} className="flex justify-between px-3 py-2 border-t border-gray-50 text-sm-mobile">
              <span className="text-gray-700">{s.label}</span>
              <span>{formatMoney(s.total)}</span>
            </div>
          ))}
        </div>
      )}

      {groupTotals.length > 1 && (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <p className="text-xs-mobile font-semibold text-gray-500 px-3 py-2 bg-gray-50">По группам</p>
          {groupTotals.map((g) => (
            <div key={g.groupId} className="flex justify-between px-3 py-2 border-t border-gray-50 text-sm-mobile">
              <span className="text-gray-700">{CALCULATOR_GROUP_LABELS[g.groupId]}</span>
              <span>{formatMoney(g.total)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between px-3 py-3 rounded-xl bg-primary-50 border border-primary-100 text-sm-mobile font-bold">
        <span>Общий итог</span>
        <span className="text-primary-700">{formatMoney(calc.grandTotal)}</span>
      </div>

      {calc.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {calc.attachments.map((att) =>
            att.fileUrl && att.mimeType.startsWith('image/') ? (
              <img key={att.id} src={att.fileUrl} alt={att.fileName} className="w-16 h-16 rounded-lg object-cover border" />
            ) : (
              <div key={att.id} className="flex items-center gap-1 text-xs-mobile text-gray-500">
                <Paperclip size={12} />
                {att.fileName}
              </div>
            ),
          )}
        </div>
      )}

      {showDownload && (
        <BigButton variant="secondary" size="md" fullWidth onClick={handleDownload}>
          <Download size={18} className="inline mr-2" />
          Скачать Excel
        </BigButton>
      )}

      {footer}
    </div>
  )
}
