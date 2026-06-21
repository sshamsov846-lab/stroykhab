import React, { useMemo, useState } from 'react'
import { UserPlus, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { useUserStore } from '@store/userStore'
import { getCurrentUserKey } from '@utils/notificationFilter'
import { getForemanWorkersNotOnObject, getWorkersOnObject } from '@utils/objectChain'
import { PersonCard } from '@components/people/PersonCard'
import { BigButton } from '@components/BigButton'
import { WORKER_TYPE_LABELS } from '@/types/person'

interface Props {
  objectId: string
}

export const ObjectWorkerAccessPanel: React.FC<Props> = ({ objectId }) => {
  const fullName = useUserStore((s) => s.fullName)
  const foremanKey = getCurrentUserKey()
  const foremanAddWorkers = useObjectAccessStore((s) => s.foremanAddWorkers)
  const accessMembers = useObjectAccessStore((s) => s.members)

  const [selected, setSelected] = useState<Set<string>>(new Set())

  const workersOnObject = useMemo(
    () => getWorkersOnObject(objectId),
    [objectId, accessMembers],
  )

  const myWorkers = useMemo(
    () => getForemanWorkersNotOnObject(objectId, foremanKey),
    [objectId, foremanKey, accessMembers],
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddSelected = () => {
    const toAdd = myWorkers.filter((m) => selected.has(m.id))
    if (toAdd.length === 0) {
      toast.error('Выберите мастеров')
      return
    }
    const count = foremanAddWorkers({
      objectId,
      workers: toAdd.map((m) => ({
        workerId: m.id,
        workerName: m.name,
        workerPhone: m.phone,
        workerUserKey: m.userKey,
      })),
      addedByUserKey: foremanKey,
      addedByName: fullName || 'Прораб',
    })
    toast.success(`Добавлено мастеров: ${count}`)
    setSelected(new Set())
  }

  return (
    <section className="space-y-3">
      <h3 className="text-base-mobile font-semibold text-gray-900 flex items-center gap-2">
        <Users size={18} /> Мастера на объекте ({workersOnObject.length})
      </h3>
      <p className="text-xs-mobile text-gray-500">
        Выберите мастеров из вашей команды — они увидят объект и назначенные задачи.
      </p>

      {workersOnObject.map((m) => (
        <PersonCard
          key={m.id}
          person={{
            id: m.id,
            name: m.name,
            phone: m.phone,
            facePhoto: m.facePhoto,
            personalCode: m.personalCode,
            roleLabel: m.role,
            specializationIds: m.specializationIds,
            workerEmploymentType: m.workerEmploymentType,
            workerId: m.id,
          }}
          showStatus
        />
      ))}

      {myWorkers.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-50">
          <p className="text-sm-mobile font-medium text-gray-700 flex items-center gap-1">
            <UserPlus size={16} /> Добавить мастеров
          </p>
          {myWorkers.map((m) => (
            <label
              key={m.id}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                selected.has(m.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-100 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(m.id)}
                onChange={() => toggle(m.id)}
                className="shrink-0"
              />
              {m.facePhoto ? (
                <img src={m.facePhoto} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0 text-sm-mobile font-bold text-primary-600">
                  {m.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm-mobile font-semibold text-gray-900 truncate">{m.name}</p>
                <p className="text-xs-mobile text-gray-500">{m.role}</p>
                {m.personalCode && (
                  <p className="text-xs-mobile font-mono text-gray-400">{m.personalCode}</p>
                )}
                {m.workerEmploymentType && (
                  <p className="text-xs-mobile text-amber-700">{WORKER_TYPE_LABELS[m.workerEmploymentType]}</p>
                )}
              </div>
            </label>
          ))}
          <BigButton
            variant="primary"
            size="md"
            fullWidth
            onClick={handleAddSelected}
            disabled={selected.size === 0}
          >
            Добавить выбранных ({selected.size})
          </BigButton>
        </div>
      )}

      {myWorkers.length === 0 && workersOnObject.length === 0 && (
        <p className="text-sm-mobile text-gray-500 text-center py-4">
          Нет мастеров в команде. Они появятся после регистрации с привязкой к вам.
        </p>
      )}
    </section>
  )
}
