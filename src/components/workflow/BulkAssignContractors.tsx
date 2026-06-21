import React, { useState } from 'react'
import { Users } from 'lucide-react'
import toast from 'react-hot-toast'
import type { WorkType } from '@types'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { BigButton } from '@components/BigButton'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

interface BulkAssignContractorsProps {
  objectId: string
}

export const BulkAssignContractors: React.FC<BulkAssignContractorsProps> = ({ objectId }) => {
  const contractors = useProjectWorkflowStore((s) => s.contractors)
  const bulkAssign = useProjectWorkflowStore((s) => s.bulkAssignContractor)
  const tasks = useProjectWorkflowStore((s) => s.getTasksByObject(objectId))
  const workTypes = [...new Set(tasks.map((t) => t.workType))] as WorkType[]

  const [workType, setWorkType] = useState<WorkType>(workTypes[0] || 'electrical')
  const [contractorId, setContractorId] = useState(contractors[0]?.id || '')

  const handleAssign = () => {
    const count = bulkAssign(objectId, workType, contractorId)
    toast.success(`Назначено на ${count} квартир/задач`)
  }

  if (!tasks.length) {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm-mobile text-amber-800">
        Сначала импортируйте смету (CSV или Excel) — появятся задачи для назначения подрядчиков.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Users size={20} className="text-primary-600" />
        <h3 className="text-base-mobile font-semibold text-gray-900">Назначение организациям-подрядчикам</h3>
      </div>
      <p className="text-sm-mobile text-gray-500">
        Выберите вид работ и организацию — все задачи этого типа на объекте перейдут подрядчику. Он раздаст их своим мастерам.
      </p>

      <div>
        <label className="text-sm-mobile font-medium text-gray-700">Вид работ</label>
        <select
          value={workType}
          onChange={(e) => setWorkType(e.target.value as WorkType)}
          className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
        >
          {workTypes.map((wt) => (
            <option key={wt} value={wt}>{WORK_TYPE_LABELS[wt]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm-mobile font-medium text-gray-700">Организация-подрядчик</label>
        <select
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value)}
          className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
        >
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.specialty}</option>
          ))}
        </select>
      </div>

      <BigButton variant="primary" size="lg" fullWidth onClick={handleAssign}>
        Назначить на все задачи «{WORK_TYPE_LABELS[workType]}»
      </BigButton>
    </div>
  )
}
