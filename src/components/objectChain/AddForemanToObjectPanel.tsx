import React, { useMemo, useState } from 'react'
import { HardHat, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useUserStore } from '@store/userStore'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { useOrganizationStore } from '@store/organizationStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { getOrgForemenNotOnObject } from '@utils/objectChain'
import { PersonCard } from '@components/people/PersonCard'

interface Props {
  objectId: string
  objectName: string
}

export const AddForemanToObjectPanel: React.FC<Props> = ({ objectId }) => {
  const contractorId = useUserStore((s) => s.contractorId)
  const org = useProjectWorkflowStore((s) => s.contractors.find((c) => c.id === contractorId))
  const orgAddForeman = useObjectAccessStore((s) => s.orgAddForeman)
  const foremenOnObject = useObjectAccessStore((s) =>
    s.getActiveMembers(objectId).filter((m) => m.role === 'foreman'),
  )
  const orgMembers = useOrganizationStore((s) => s.members)

  const [open, setOpen] = useState(false)

  const available = useMemo(
    () => (contractorId ? getOrgForemenNotOnObject(contractorId, objectId) : []),
    [contractorId, objectId, orgMembers, foremenOnObject],
  )

  const handleAdd = (foreman: (typeof available)[0]) => {
    if (!contractorId) return
    const result = orgAddForeman({
      objectId,
      foremanUserKey: foreman.userKey,
      foremanName: foreman.fullName,
      foremanPhone: foreman.phone,
      contractorId,
      orgName: org?.name ?? 'Организация',
      facePhoto: foreman.facePhoto,
    })
    if (!result.ok) {
      toast.error(result.reason ?? 'Не удалось добавить')
      return
    }
    toast.success(`${foreman.fullName} назначен на объект`)
    setOpen(false)
  }

  if (!contractorId) return null

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base-mobile font-semibold text-gray-900 flex items-center gap-2">
          <HardHat size={18} className="text-primary-600" />
          Прорабы на объекте ({foremenOnObject.length})
        </h3>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-primary-600 text-sm-mobile font-medium flex items-center gap-1"
        >
          <Plus size={16} /> Добавить прораба
        </button>
      </div>

      {foremenOnObject.map((m) => (
        <PersonCard
          key={m.id}
          person={{
            id: m.id,
            name: m.fullName,
            phone: m.phone,
            roleLabel: 'Прораб',
          }}
          showStatus={false}
        />
      ))}

      {open && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <p className="text-xs-mobile text-gray-500">
            Или попросите прораба подключиться самому — «Подключиться к объекту по коду» и код от заказчика.
          </p>
          {available.length === 0 ? (
            <p className="text-sm-mobile text-gray-500 text-center py-4">
              Нет свободных прорабов. Одобрите запросы во вкладке «Мои мастера».
            </p>
          ) : (
            available.map((f) => (
              <button
                key={f.userKey}
                type="button"
                onClick={() => handleAdd(f)}
                className="w-full text-left"
              >
                <PersonCard
                  person={{
                    id: f.userKey,
                    name: f.fullName,
                    phone: f.phone,
                    facePhoto: f.facePhoto,
                    personalCode: f.personalCode,
                    roleLabel: 'Прораб',
                    specializationIds: f.specializationIds,
                  }}
                  showStatus={false}
                />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
