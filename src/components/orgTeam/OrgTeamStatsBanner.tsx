import React from 'react'
import { formatMoney } from '@utils/workerPayrollCalc'
import type { OrgTeamSummary } from '@utils/orgTeamData'

interface Props {
  summary: OrgTeamSummary
}

export const OrgTeamStatsBanner: React.FC<Props> = ({ summary }) => (
  <div className="grid grid-cols-2 gap-2">
    <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
      <p className="text-[10px] text-gray-500 uppercase">Прорабов</p>
      <p className="text-xl-mobile font-bold text-primary-600">{summary.foremanCount}</p>
    </div>
    <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
      <p className="text-[10px] text-gray-500 uppercase">Мастеров</p>
      <p className="text-xl-mobile font-bold text-gray-900">{summary.workerCount}</p>
    </div>
    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
      <p className="text-[10px] text-emerald-700 uppercase">На объектах</p>
      <p className="text-xl-mobile font-bold text-emerald-800">{summary.onObjectsNow}</p>
    </div>
    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-center">
      <p className="text-[10px] text-amber-700 uppercase">Фонд ЗП</p>
      <p className="text-sm-mobile font-bold text-amber-900">{formatMoney(summary.payrollFundPeriod)}</p>
    </div>
  </div>
)
