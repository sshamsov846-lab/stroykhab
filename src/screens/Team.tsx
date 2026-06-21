import React, { useMemo, useState } from 'react'
import { Plus, Users, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import type { WorkType } from '@types'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { BigButton } from '@components/BigButton'
import { NotificationBell } from '@components/NotificationBell'
import { PersonCard } from '@components/people/PersonCard'
import { useObjectStore } from '@store/objectStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useUserStore } from '@store/userStore'
import { getObjects } from '@api/supabase'
import { filterObjectsForRole } from '@utils/sideJob'
import { getCurrentUserKey } from '@utils/notificationFilter'
import { useBrigadeStore } from '@store/brigadeStore'
import { BrigadeFolderCard } from '@components/brigade/BrigadeFolderCard'
import type { ConstructionObject } from '@types'

export const Team: React.FC = () => {
  const teamMembers = useObjectStore((s) => s.teamMembers)
  const addTeamMember = useObjectStore((s) => s.addTeamMember)
  const removeTeamMember = useObjectStore((s) => s.removeTeamMember)
  const bulkAssignWorker = useObjectStore((s) => s.bulkAssignWorker)
  const workerAssignments = useObjectStore((s) => s.workerTaskAssignments)
  const workflowTasks = useProjectWorkflowStore((s) => s.tasks)
  const personalCode = useUserStore((s) => s.personalCode)

  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [phone, setPhone] = useState('')
  const [objects, setObjects] = useState<ConstructionObject[]>([])
  const [objectId, setObjectId] = useState('')
  const [workType, setWorkType] = useState<WorkType>('electrical')
  const [workerId, setWorkerId] = useState('')

  const foremanKey = getCurrentUserKey()
  const brigades = useBrigadeStore((s) => s.getBrigadesForForeman(foremanKey))
  const myTeam = useMemo(() => {
    const linked = teamMembers.filter((m) => m.foremanUserKey === foremanKey)
    return linked.length > 0 ? linked : teamMembers
  }, [teamMembers, foremanKey])

  React.useEffect(() => {
    getObjects().then((objs) => {
      const visible = filterObjectsForRole(objs, 'foreman')
      setObjects(visible)
      if (visible[0]) setObjectId(visible[0].id)
    })
  }, [])

  React.useEffect(() => {
    if (myTeam[0] && !workerId) setWorkerId(myTeam[0].id)
  }, [myTeam, workerId])

  const objectTasks = Object.values(workflowTasks).filter((t) => t.objectId === objectId)
  const workTypes = [...new Set(objectTasks.map((t) => t.workType))] as WorkType[]
  const assignedCount = Object.values(workerAssignments).filter((id) => myTeam.some((m) => m.id === id)).length
  const brigadeMemberKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const b of brigades) {
      for (const k of b.memberUserKeys) keys.add(k)
    }
    return keys
  }, [brigades])
  const soloTeam = myTeam.filter((m) => !m.userKey || !brigadeMemberKeys.has(m.userKey))

  const handleAdd = () => {
    if (!name.trim() || !role.trim()) {
      toast.error('Укажите имя и специальность')
      return
    }
    addTeamMember({
      name: name.trim(),
      role: role.trim(),
      phone: phone.trim(),
      specialty: role.trim(),
      foremanUserKey: foremanKey,
    })
    toast.success('Работник добавлен')
    setName('')
    setRole('')
    setPhone('')
    setShowAdd(false)
  }

  const handleBulkAssign = () => {
    if (!objectId || !workerId) return
    const count = bulkAssignWorker(objectId, workType, workerId)
    if (count === 0) {
      toast.error('Нет задач — сначала импортируйте смету на объекте')
      return
    }
    const worker = myTeam.find((m) => m.id === workerId)
    toast.success(`${worker?.name}: назначено ${count} задач «${WORK_TYPE_LABELS[workType]}»`)
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl-mobile font-bold text-gray-900">Команда</h1>
          <p className="text-sm-mobile text-gray-500">
            {myTeam.length} работников · {assignedCount} назначений
            {personalCode ? ` · ${personalCode}` : ''}
          </p>
        </div>
        <NotificationBell />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={20} className="text-primary-600" />
          <h2 className="text-base-mobile font-semibold text-gray-900">Раздать работу</h2>
        </div>
        <p className="text-sm-mobile text-gray-500">
          Назначьте работника на вид работ — он увидит задачи в своём кабинете.
        </p>

        <div>
          <label className="text-sm-mobile font-medium text-gray-700">Объект</label>
          <select
            value={objectId}
            onChange={(e) => setObjectId(e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
          >
            {objects.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {workTypes.length > 0 ? (
          <>
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
              <label className="text-sm-mobile font-medium text-gray-700">Работник</label>
              <select
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
              >
                {myTeam.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                ))}
              </select>
            </div>
            <BigButton variant="primary" size="lg" fullWidth onClick={handleBulkAssign}>
              Назначить на все задачи
            </BigButton>
          </>
        ) : (
          <p className="text-sm-mobile text-amber-700 bg-amber-50 p-3 rounded-xl">
            Импортируйте смету (CSV или Excel) в настройках объекта — появятся задачи для распределения.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-gray-600" />
          <h2 className="text-base-mobile font-semibold text-gray-900">Бригады</h2>
        </div>
      </div>

      {brigades.length === 0 ? (
        <p className="text-sm-mobile text-gray-500 bg-white rounded-2xl border border-gray-100 p-4">
          Бригады появятся, когда мастер зарегистрируется как бригадир и получит код БР-XXXX.
        </p>
      ) : (
        <div className="space-y-3">
          {brigades.map((b) => (
            <BrigadeFolderCard key={b.id} brigade={b} defaultOpen />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-gray-600" />
          <h2 className="text-base-mobile font-semibold text-gray-900">Одиночки</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-primary-600 text-sm-mobile font-medium flex items-center gap-1"
        >
          <Plus size={16} />
          Добавить
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ФИО" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile" />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Специальность (Электрик)" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон" type="tel" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile" />
          <BigButton variant="primary" size="md" fullWidth onClick={handleAdd}>Сохранить</BigButton>
        </div>
      )}

      <div className="space-y-3">
        {soloTeam.length === 0 && brigades.length === 0 && (
          <p className="text-sm-mobile text-gray-500 text-center py-8">
            Пока нет мастеров. Они появятся после регистрации с привязкой к вам по коду {personalCode || 'ПР-XXXX'}.
          </p>
        )}
        {soloTeam.map((member) => (
            <PersonCard
              key={member.id}
              person={{
                id: member.id,
                name: member.name,
                phone: member.phone,
                facePhoto: member.facePhoto,
                personalCode: member.personalCode,
                roleLabel: member.role,
                specializationIds: member.specializationIds,
                workerEmploymentType: member.workerEmploymentType,
                workerId: member.id,
              }}
              onAssignTask={() => {
                setWorkerId(member.id)
                toast.success(`Выбран ${member.name} — назначьте вид работ выше`)
              }}
              onRemove={() => {
                removeTeamMember(member.id)
                toast.success('Удалён из команды')
              }}
            />
        ))}
      </div>
    </div>
  )
}
