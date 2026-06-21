import React, { useMemo } from 'react'
import { Users, HardHat } from 'lucide-react'
import { useUserStore } from '@store/userStore'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { orgMembersOnObject } from '@utils/objectChain'
import { PersonCard } from '@components/people/PersonCard'
import { specializationLabels } from '@/constants/specializations'

interface Props {
  objectId: string
}

/** Организация видит прорабов и мастеров на своём объекте */
export const ObjectOrgTeamPanel: React.FC<Props> = ({ objectId }) => {
  const contractorId = useUserStore((s) => s.contractorId)
  const accessMembers = useObjectAccessStore((s) => s.members)

  const { foremen, workers } = useMemo(
    () => (contractorId ? orgMembersOnObject(objectId, contractorId) : { foremen: [], workers: [] }),
    [objectId, contractorId, accessMembers],
  )

  if (!contractorId) return null

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-base-mobile font-semibold text-gray-900 flex items-center gap-2">
          <HardHat size={18} /> Прорабы ({foremen.length})
        </h3>
        {foremen.length === 0 && (
          <p className="text-sm-mobile text-gray-500">Назначьте прораба на объект</p>
        )}
        {foremen.map((m) => (
          <PersonCard
            key={m.id}
            person={{
              id: m.id,
              name: m.fullName,
              phone: m.phone,
              facePhoto: m.facePhoto,
              personalCode: m.personalCode,
              roleLabel: 'Прораб',
              specializationIds: m.specializationIds,
            }}
            showStatus={false}
          />
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-base-mobile font-semibold text-gray-900 flex items-center gap-2">
          <Users size={18} /> Мастера на объекте ({workers.length})
        </h3>
        {workers.length === 0 && (
          <p className="text-sm-mobile text-gray-500">Прораб добавит мастеров на объект</p>
        )}
        {workers.map((m) => (
          <PersonCard
            key={m.id}
            person={{
              id: m.id,
              name: m.fullName,
              phone: m.phone,
              facePhoto: m.facePhoto,
              personalCode: m.personalCode,
              roleLabel: specializationLabels(m.specializationIds),
              specializationIds: m.specializationIds,
              workerEmploymentType: m.workerEmploymentType,
              workerId: m.workerMemberId,
            }}
            showStatus
          />
        ))}
      </div>
    </div>
  )
}
