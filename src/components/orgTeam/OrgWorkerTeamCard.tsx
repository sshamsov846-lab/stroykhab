import React from 'react'
import { useNavigate } from 'react-router-dom'
import { formatMoney } from '@utils/workerPayrollCalc'
import { ACTIVITY_STATUS_LABELS, type OrgWorkerRow } from '@utils/orgTeamData'

interface Props {
  worker: OrgWorkerRow
}

export const OrgWorkerTeamCard: React.FC<Props> = ({ worker }) => {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(`/subcontractor/team/worker/${encodeURIComponent(worker.id)}`)}
      className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-left"
    >
      <div className="flex items-start gap-3">
        {worker.facePhoto ? (
          <img src={worker.facePhoto} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-primary-100" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-lg-mobile font-bold text-primary-600">
            {worker.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base-mobile font-bold text-gray-900 truncate">{worker.name}</p>
          <p className="text-xs-mobile font-mono text-primary-600">{worker.personalCode || 'М-XXXX'}</p>
          <p className="text-xs-mobile text-gray-500">
            {worker.specializationText} · {worker.typeLabel}
          </p>
          {worker.foremanName && (
            <p className="text-xs-mobile text-gray-500">Прораб: {worker.foremanName}</p>
          )}
          {worker.brigadeName && (
            <p className="text-xs-mobile text-amber-700">{worker.brigadeName}</p>
          )}
          <p className="text-xs-mobile font-medium mt-1">{ACTIVITY_STATUS_LABELS[worker.status]}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm-mobile font-bold text-emerald-700">{formatMoney(worker.totalEarned)}</p>
          <p className="text-[10px] text-gray-500">заработано</p>
          {worker.balance > 0 && (
            <p className="text-[10px] text-amber-700 mt-0.5">к выплате {formatMoney(worker.balance)}</p>
          )}
        </div>
      </div>
      {(worker.currentObjectName || worker.currentTaskTitle) && (
        <div className="mt-3 pt-3 border-t border-gray-50 text-xs-mobile text-gray-600">
          {worker.currentObjectName && <p>📍 {worker.currentObjectName}</p>}
          {worker.currentTaskTitle && <p className="text-primary-600 truncate">{worker.currentTaskTitle}</p>}
        </div>
      )}
    </button>
  )
}
