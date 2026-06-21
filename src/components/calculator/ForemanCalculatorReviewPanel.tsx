import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, ChevronRight, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkCalculatorStore } from '@store/workCalculatorStore'
import { CALCULATOR_GROUP_LABELS, CALCULATOR_STATUS_LABELS } from '@/types/workCalculator'
import { computeGroupTotals } from '@utils/calculatorTotals'
import { unitLabel } from '@utils/calculatorRates'
import { formatMoney } from '@utils/workerPayrollCalc'
import { downloadCalculatorReportExcel } from '@utils/calculatorReportExcel'
import { ForemanCalculatorActions } from '@components/calculator/ForemanCalculatorActions'

interface Props {
  taskId: string
}

export const ForemanCalculatorReviewPanel: React.FC<Props> = ({ taskId }) => {
  const navigate = useNavigate()
  const calculators = useWorkCalculatorStore((s) => s.getCalculatorsForTask(taskId))
  const submitted = calculators.filter((c) => c.status !== 'draft' || c.lines.length > 0)

  if (!submitted.length) return null

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm-mobile font-semibold text-gray-900 flex items-center gap-2">
            <Calculator size={18} className="text-primary-600" />
            Калькуляторы мастеров
          </p>
          <p className="text-xs-mobile text-gray-500 mt-1">
            Объёмы и расценки для проверки и формирования акта
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/foreman/calculator-reports')}
          className="text-xs-mobile text-primary-600 flex items-center gap-0.5 shrink-0"
        >
          Все отчёты
          <ChevronRight size={14} />
        </button>
      </div>

      {submitted.map((calc) => {
        const groupTotals = computeGroupTotals(calc.lines)
        return (
          <div key={calc.id} className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 flex justify-between items-center">
              <div>
                <p className="text-sm-mobile font-medium text-gray-900">{calc.workerName}</p>
                <p className="text-xs-mobile text-gray-500">
                  {CALCULATOR_STATUS_LABELS[calc.status]}
                  {calc.submittedAt ? ` · ${new Date(calc.submittedAt).toLocaleString('ru-RU')}` : ''}
                </p>
              </div>
              <span className="text-sm-mobile font-bold text-primary-700">{formatMoney(calc.grandTotal)}</span>
            </div>

            {calc.lines.map((line) => (
              <div key={line.id} className="px-3 py-2 border-t border-gray-50 flex justify-between gap-2 text-sm-mobile">
                <div className="min-w-0">
                  <p className="text-gray-900 truncate">{line.label}</p>
                  <p className="text-xs-mobile text-gray-400">
                    {line.quantity} {unitLabel(line.unit)} × {formatMoney(line.unitRate)}
                  </p>
                </div>
                <span className="font-medium whitespace-nowrap">{formatMoney(line.amount)}</span>
              </div>
            ))}

            {groupTotals.length > 1 && (
              <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2 space-y-1">
                {groupTotals.map((g) => (
                  <div key={g.groupId} className="flex justify-between text-xs-mobile text-gray-600">
                    <span>{CALCULATOR_GROUP_LABELS[g.groupId]}</span>
                    <span>{formatMoney(g.total)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="px-3 py-3 border-t border-gray-100 space-y-2">
              <button
                type="button"
                onClick={() => {
                  downloadCalculatorReportExcel(calc)
                  toast.success('Excel сохранён')
                }}
                className="w-full text-sm-mobile text-primary-600 flex items-center justify-center gap-1 py-2"
              >
                <Download size={14} />
                Скачать Excel
              </button>
              <ForemanCalculatorActions calc={calc} compact />
            </div>
          </div>
        )
      })}
    </div>
  )
}
