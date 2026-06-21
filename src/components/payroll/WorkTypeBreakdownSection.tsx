import React from 'react'
import type { WorkTypeVolumeRow } from '@utils/payrollReports'
import { formatMoney } from '@utils/workerPayrollCalc'

interface Props {
  rows: WorkTypeVolumeRow[]
  title?: string
}

export const WorkTypeBreakdownSection: React.FC<Props> = ({ rows, title = 'По видам работ' }) => {
  if (rows.length === 0) return null

  return (
    <section>
      <h3 className="text-sm-mobile font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm-mobile">
          <thead>
            <tr className="bg-gray-50 text-left text-xs-mobile text-gray-500">
              <th className="px-3 py-2 font-medium">Вид работ</th>
              <th className="px-3 py-2 font-medium text-right">Объём</th>
              <th className="px-3 py-2 font-medium text-right">Начислено</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.workType} className="border-t border-gray-100">
                <td className="px-3 py-2.5 text-gray-900">{r.label}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">
                  {r.volume > 0 ? `${r.volume} ${r.unitLabel}` : `${r.taskCount} задач`}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                  {formatMoney(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
