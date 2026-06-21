import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Users, FolderOpen } from 'lucide-react'
import { formatMoney } from '@utils/workerPayrollCalc'
import { ACTIVITY_STATUS_LABELS, type OrgForemanRow, type OrgWorkerRow } from '@utils/orgTeamData'

function MiniWorkerLine({ w, onClick }: { w: OrgWorkerRow; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-left">
      {w.facePhoto ? (
        <img src={w.facePhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
          {w.name.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm-mobile font-medium truncate">{w.name}</p>
        <p className="text-xs-mobile text-gray-500 truncate">
          {w.specializationText} · {ACTIVITY_STATUS_LABELS[w.status]}
        </p>
        {w.currentTaskTitle && (
          <p className="text-xs-mobile text-primary-600 truncate">{w.currentTaskTitle}</p>
        )}
      </div>
    </button>
  )
}

interface Props {
  foreman: OrgForemanRow
}

export const OrgForemanTeamCard: React.FC<Props> = ({ foreman }) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const goDetail = () => navigate(`/subcontractor/team/foreman/${encodeURIComponent(foreman.userKey)}`)
  const goWorker = (id: string) => navigate(`/subcontractor/team/worker/${encodeURIComponent(id)}`)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button type="button" onClick={goDetail} className="w-full p-4 text-left">
        <div className="flex items-start gap-3">
          {foreman.facePhoto ? (
            <img src={foreman.facePhoto} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-primary-100" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-lg-mobile font-bold text-primary-600">
              {foreman.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base-mobile font-bold text-gray-900 truncate">{foreman.name}</p>
            <p className="text-xs-mobile font-mono text-primary-600">{foreman.personalCode || 'ПР-XXXX'}</p>
            <p className="text-xs-mobile text-gray-500">{foreman.specializationText}</p>
            <p className="text-xs-mobile font-medium mt-1">{ACTIVITY_STATUS_LABELS[foreman.status]}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm-mobile font-bold text-emerald-700">{formatMoney(foreman.totalEarned)}</p>
            <p className="text-[10px] text-gray-500">заработано</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs-mobile text-gray-600">
          <div>
            <span className="text-gray-400">Объекты: </span>
            {foreman.currentObjects.length
              ? foreman.currentObjects.map((o) => o.name).join(', ')
              : '—'}
          </div>
          <div className="text-right">
            <Users size={12} className="inline mr-1" />
            {foreman.masterCount} мастеров
          </div>
        </div>
      </button>

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-center gap-1 py-2 text-sm-mobile text-primary-600 font-medium border-t border-gray-50"
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {open ? 'Скрыть команду' : 'Показать команду'}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
          {foreman.brigades.map((b) => (
            <div key={b.id} className="space-y-1">
              <div className="flex items-center gap-2 text-sm-mobile font-semibold text-gray-800">
                <FolderOpen size={16} className="text-amber-600" />
                {b.name} ({b.memberUserKeys.length} чел.)
              </div>
              {foreman.brigadeWorkers
                .filter((w) => w.brigadeId === b.id)
                .map((w) => (
                  <MiniWorkerLine key={w.id} w={w} onClick={() => goWorker(w.id)} />
                ))}
            </div>
          ))}
          {foreman.soloWorkers.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs-mobile font-semibold text-gray-500 uppercase">Одиночки</p>
              {foreman.soloWorkers.map((w) => (
                <MiniWorkerLine key={w.id} w={w} onClick={() => goWorker(w.id)} />
              ))}
            </div>
          )}
          {foreman.masterCount === 0 && (
            <p className="text-xs-mobile text-gray-400 text-center py-2">Пока нет мастеров под прорабом</p>
          )}
        </div>
      )}
    </div>
  )
}
