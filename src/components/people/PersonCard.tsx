import React from 'react'
import { Phone, UserPlus, ClipboardList } from 'lucide-react'
import { useAttendanceStore } from '@store/attendanceStore'
import { specializationLabels } from '@/constants/specializations'
import type { SpecializationId } from '@/constants/specializations'
import type { WorkerEmploymentType } from '@/types/person'
import { WORKER_TYPE_LABELS } from '@/types/person'

export interface PersonCardData {
  id: string
  name: string
  phone?: string
  facePhoto?: string
  personalCode?: string
  roleLabel: string
  specializationIds?: SpecializationId[]
  workerEmploymentType?: WorkerEmploymentType
  workerId?: string
}

interface Props {
  person: PersonCardData
  onAssignTask?: () => void
  onAddToObject?: () => void
  onRemove?: () => void
  showStatus?: boolean
}

function statusForWorker(workerId?: string): { label: string; color: string } {
  if (!workerId) return { label: '🔘 не на смене', color: 'text-gray-500' }
  const active = useAttendanceStore.getState().checkIns.find((c) => c.workerId === workerId && !c.leftAt)
  return active
    ? { label: '🟢 на объекте', color: 'text-emerald-600' }
    : { label: '🔘 не на смене', color: 'text-gray-500' }
}

export const PersonCard: React.FC<Props> = ({
  person,
  onAssignTask,
  onAddToObject,
  onRemove,
  showStatus = true,
}) => {
  const status = showStatus ? statusForWorker(person.workerId) : null

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start gap-3">
        {person.facePhoto ? (
          <img
            src={person.facePhoto}
            alt={person.name}
            className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-primary-100"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <span className="text-lg-mobile font-bold text-primary-600">
              {person.name.trim().charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base-mobile font-bold text-gray-900 truncate">{person.name}</p>
          <p className="text-sm-mobile text-primary-600 font-medium">{person.roleLabel}</p>
          {person.specializationIds?.length ? (
            <p className="text-xs-mobile text-gray-500 mt-0.5">
              {specializationLabels(person.specializationIds)}
            </p>
          ) : null}
          {person.workerEmploymentType && (
            <p className="text-xs-mobile text-amber-700 mt-0.5">
              {WORKER_TYPE_LABELS[person.workerEmploymentType]}
            </p>
          )}
          {person.personalCode && (
            <p className="text-xs-mobile font-mono text-gray-400 mt-1">{person.personalCode}</p>
          )}
          {status && (
            <p className={`text-xs-mobile mt-1 font-medium ${status.color}`}>{status.label}</p>
          )}
        </div>
        {person.phone && (
          <a
            href={`tel:${person.phone}`}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shrink-0"
          >
            <Phone size={18} />
          </a>
        )}
      </div>

      {(onAssignTask || onAddToObject || onRemove) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
          {onAssignTask && (
            <button
              type="button"
              onClick={onAssignTask}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary-50 text-primary-700 text-xs-mobile font-medium"
            >
              <ClipboardList size={14} /> Назначить задачу
            </button>
          )}
          {onAddToObject && (
            <button
              type="button"
              onClick={onAddToObject}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-50 text-gray-700 text-xs-mobile font-medium"
            >
              <UserPlus size={14} /> На объект
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="px-3 py-2 rounded-lg text-red-600 text-xs-mobile font-medium hover:bg-red-50"
            >
              Убрать
            </button>
          )}
        </div>
      )}
    </div>
  )
}
