import React, { useState, useMemo } from 'react'
import { User, Layers, Building, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { useObjectStore } from '@store/objectStore'
import { useUserStore } from '@store/userStore'
import { workerNameById } from '@utils/workerPayrollCalc'
import { filterWorkersForTask, foremanOrganizationId } from '@utils/workerFilters'
import { getWorkersOnObject } from '@utils/objectChain'
import { getCurrentUserKey } from '@utils/notificationFilter'
import { useBrigadeStore } from '@store/brigadeStore'
import { BrigadeFolderCard } from '@components/brigade/BrigadeFolderCard'
import { WORKER_TYPE_LABELS } from '@/types/person'
import type { WorkType } from '@types'

interface Props {
  taskId: string
  objectId: string
  workType: WorkType
  entrance: string
  floor: string
  isSideJob?: boolean
  contractorId?: string
  contractorName?: string
  canAssign: boolean
}

export const TaskAssigneePanel: React.FC<Props> = ({
  taskId,
  objectId,
  workType,
  entrance,
  floor,
  isSideJob,
  contractorId,
  contractorName,
  canAssign,
}) => {
  const assignedBrigadeId = useObjectStore((s) => s.brigadeTaskAssignments[taskId])
  const assignedId = useObjectStore(
    (s) => s.contractorWorkerAssignments[taskId] || s.workerTaskAssignments[taskId],
  )
  const assignBrigade = useObjectStore((s) => s.assignBrigadeToTask)
  const bulkAssignBrigade = useObjectStore((s) => s.bulkAssignBrigadeByScope)
  const assignWorker = useObjectStore((s) => s.assignWorkerToTask)
  const assignContractorWorker = useObjectStore((s) => s.assignContractorWorkerToTask)
  const bulkAssignByScope = useObjectStore((s) => s.bulkAssignWorkerByScope)
  const accessMembers = useObjectStore((s) => s.teamMembers)
  const brigades = useBrigadeStore((s) => s.brigades)

  const foremanOrgId = foremanOrganizationId()
  const role = useUserStore((s) => s.role)

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'brigade' | 'solo'>('brigade')
  const [selectedBrigadeId, setSelectedBrigadeId] = useState('')
  const [selectedWorkerId, setSelectedWorkerId] = useState('')

  const foremanBrigades = useMemo(
    () => useBrigadeStore.getState().getBrigadesForForeman(getCurrentUserKey()),
    [brigades, accessMembers],
  )
  const assignedBrigade = useBrigadeStore((s) =>
    assignedBrigadeId ? s.getBrigade(assignedBrigadeId) : undefined,
  )

  const objectWorkers = useMemo(() => {
    const onObject = getWorkersOnObject(objectId)
    const pool = onObject.length > 0 ? onObject : useObjectStore.getState().teamMembers
    const solo = pool.filter((w) => w.workerEmploymentType !== 'brigade' || !w.userKey)
    return filterWorkersForTask(solo, workType, { isSideJob })
  }, [objectId, workType, isSideJob, accessMembers])

  const orgLabel = contractorName || (contractorId ? 'Подрядчик' : foremanOrgId ? 'Организация' : 'Прораб')

  const doAssignBrigade = (brigadeId: string, scope: 'task' | 'entrance' | 'floor') => {
    if (!brigadeId) return
    if (scope === 'task') assignBrigade(taskId, brigadeId)
    else if (scope === 'entrance') bulkAssignBrigade(objectId, brigadeId, 'entrance', { workType, entrance })
    else bulkAssignBrigade(objectId, brigadeId, 'floor', { workType, entrance, floor })
    toast.success('Бригада назначена')
    setOpen(false)
    setSelectedBrigadeId('')
  }

  const doAssign = (workerId: string, scope: 'task' | 'entrance' | 'floor') => {
    if (!workerId) return
    if (contractorId || (role === 'foreman' && foremanOrgId && !isSideJob)) {
      assignContractorWorker(taskId, workerId)
    } else if (scope === 'task') {
      assignWorker(taskId, workerId)
    } else if (scope === 'entrance') {
      bulkAssignByScope(objectId, workerId, 'entrance', { workType, entrance })
    } else {
      bulkAssignByScope(objectId, workerId, 'floor', { workType, entrance, floor })
    }
    toast.success('Мастер назначен')
    setOpen(false)
    setSelectedWorkerId('')
  }

  if (assignedBrigade && !canAssign) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <p className="text-xs-mobile text-gray-500">Бригада</p>
        <p className="text-sm-mobile font-semibold text-gray-900">{assignedBrigade.name}</p>
        <p className="text-xs-mobile text-gray-500">{assignedBrigade.memberUserKeys.length} чел.</p>
      </div>
    )
  }

  if (assignedId && !assignedBrigade && !canAssign) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
          <User size={20} className="text-primary-600" />
        </div>
        <div>
          <p className="text-xs-mobile text-gray-500">Исполнитель</p>
          <p className="text-sm-mobile font-semibold text-gray-900">{workerNameById(assignedId)}</p>
          <p className="text-xs-mobile text-gray-500">{orgLabel}</p>
        </div>
      </div>
    )
  }

  if (!assignedId && !assignedBrigade && !canAssign) {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm-mobile text-amber-900">
        Исполнитель не назначен. Обратитесь к прорабу.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <div className="flex items-center gap-2">
        <User size={18} className="text-primary-600" />
        <p className="text-sm-mobile font-semibold text-gray-900">Назначить исполнителя</p>
      </div>

      {assignedBrigade ? (
        <div className="bg-amber-50 rounded-xl p-3 flex justify-between items-center">
          <div>
            <p className="text-sm-mobile font-medium">{assignedBrigade.name}</p>
            <p className="text-xs-mobile text-gray-500">Бригада · {assignedBrigade.brigadeCode}</p>
          </div>
          {canAssign && (
            <button type="button" onClick={() => setOpen(!open)} className="text-sm-mobile text-primary-600">
              Сменить
            </button>
          )}
        </div>
      ) : assignedId ? (
        <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center">
          <p className="text-sm-mobile font-medium">{workerNameById(assignedId)}</p>
          {canAssign && (
            <button type="button" onClick={() => setOpen(!open)} className="text-sm-mobile text-primary-600">
              Сменить
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm-mobile text-gray-500">Не назначено</p>
      )}

      {canAssign && (open || (!assignedId && !assignedBrigade)) && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab('brigade')}
              className={`flex-1 py-2 rounded-lg text-xs-mobile font-medium ${
                tab === 'brigade' ? 'bg-amber-100 text-amber-900' : 'bg-gray-50 text-gray-600'
              }`}
            >
              <FolderOpen size={14} className="inline mr-1" /> Бригада
            </button>
            <button
              type="button"
              onClick={() => setTab('solo')}
              className={`flex-1 py-2 rounded-lg text-xs-mobile font-medium ${
                tab === 'solo' ? 'bg-primary-100 text-primary-900' : 'bg-gray-50 text-gray-600'
              }`}
            >
              Одиночка
            </button>
          </div>

          {tab === 'brigade' && (
            <div className="space-y-2">
              {foremanBrigades.length === 0 ? (
                <p className="text-xs-mobile text-gray-500">Нет бригад. Мастер регистрируется как бригадир.</p>
              ) : (
                foremanBrigades.map((b) => (
                  <BrigadeFolderCard
                    key={b.id}
                    brigade={b}
                    showSelect
                    selected={selectedBrigadeId === b.id}
                    onSelect={() => setSelectedBrigadeId(b.id === selectedBrigadeId ? '' : b.id)}
                  />
                ))
              )}
              {selectedBrigadeId && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => doAssignBrigade(selectedBrigadeId, 'task')}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs-mobile font-medium"
                  >
                    На задачу
                  </button>
                  {entrance && (
                    <>
                      <button
                        type="button"
                        onClick={() => doAssignBrigade(selectedBrigadeId, 'entrance')}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 text-xs-mobile font-medium"
                      >
                        <Building size={14} className="inline" /> Подъезд {entrance}
                      </button>
                      <button
                        type="button"
                        onClick={() => doAssignBrigade(selectedBrigadeId, 'floor')}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 text-xs-mobile font-medium"
                      >
                        <Layers size={14} className="inline" /> Этаж {floor}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'solo' && (
            <div className="space-y-2">
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
              >
                <option value="">— почасовик / одиночка —</option>
                {objectWorkers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.workerEmploymentType ? ` · ${WORKER_TYPE_LABELS[w.workerEmploymentType]}` : ''}
                  </option>
                ))}
              </select>
              {selectedWorkerId && (
                <button
                  type="button"
                  onClick={() => doAssign(selectedWorkerId, 'task')}
                  className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-xs-mobile font-medium"
                >
                  Назначить на задачу
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
