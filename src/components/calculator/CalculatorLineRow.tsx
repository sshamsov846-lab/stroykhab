import React from 'react'
import { Trash2 } from 'lucide-react'
import type { CalculatorLine } from '@/types/workCalculator'
import { CALCULATOR_GROUP_LABELS } from '@/types/workCalculator'
import { calculatorSpecLabel } from '@/constants/calculatorSpecs'
import { unitLabel } from '@utils/calculatorRates'
import { formatMoney } from '@utils/workerPayrollCalc'
import { normalizeLine } from '@utils/calculatorTotals'

interface Props {
  line: CalculatorLine
  onChange: (line: CalculatorLine) => void
  onRemove: () => void
}

export const CalculatorLineRow: React.FC<Props> = ({ line, onChange, onRemove }) => {
  const patch = (p: Partial<CalculatorLine>) => onChange(normalizeLine({ ...line, ...p }))

  const isVolume = line.inputMode === 'area_thickness'

  return (
    <div className="p-3 rounded-xl bg-gray-50 space-y-2 border border-gray-100">
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="text-sm-mobile font-medium text-gray-900">{line.label}</p>
          <p className="text-xs-mobile text-gray-400">
            {calculatorSpecLabel(line.specializationId)} · {CALCULATOR_GROUP_LABELS[line.groupId]} · {unitLabel(line.unit)}
          </p>
        </div>
        <button type="button" onClick={onRemove} aria-label="Удалить">
          <Trash2 size={16} className="text-red-500" />
        </button>
      </div>

      {isVolume ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs-mobile text-gray-500">Площадь, м²</label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={line.areaM2 || ''}
                onChange={(e) => patch({ areaM2: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm-mobile"
              />
            </div>
            <div>
              <label className="text-xs-mobile text-gray-500">Толщина, мм</label>
              <input
                type="number"
                min={0}
                step="1"
                value={line.thicknessMm || ''}
                onChange={(e) => patch({ thicknessMm: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm-mobile"
              />
            </div>
          </div>
          {line.unit === 'm3' && (line.computedVolumeM3 ?? 0) > 0 && (
            <p className="text-xs-mobile text-primary-600">Объём: {line.computedVolumeM3} м³</p>
          )}
        </>
      ) : (
        <div>
          <label className="text-xs-mobile text-gray-500">Кол-во</label>
          <input
            type="number"
            min={0}
            step="0.1"
            value={line.quantity || ''}
            onChange={(e) => patch({ quantity: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm-mobile"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs-mobile text-gray-500">Расценка</label>
          <input
            type="number"
            min={0}
            step="1"
            value={line.unitRate || ''}
            onChange={(e) => patch({ unitRate: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm-mobile"
          />
        </div>
        <div>
          <label className="text-xs-mobile text-gray-500">Сумма</label>
          <div className="px-2 py-2 rounded-lg bg-white border border-gray-200 text-sm-mobile font-semibold text-gray-900">
            {formatMoney(line.amount)}
          </div>
        </div>
      </div>
    </div>
  )
}
