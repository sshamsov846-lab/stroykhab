import React from 'react'
import { UserMinus, HardHat, Building2, User, Briefcase } from 'lucide-react'
import { useObjectAccessStore } from '@store/objectAccessStore'
import type { ObjectAccessMember, ObjectAccessRole } from '@/types/objectAccess'

const ROLE_ICON: Record<ObjectAccessRole, typeof User> = {
  client: Briefcase,
  foreman: HardHat,
  subcontractor: Building2,
  worker: User,
}

const ROLE_LABEL: Record<ObjectAccessRole, string> = {
  client: 'Заказчик',
  foreman: 'Прораб',
  subcontractor: 'Организация',
  worker: 'Мастер',
}

interface Props {
  objectId: string
  canRevoke?: boolean
  revokeFilter?: ObjectAccessRole[]
  revokedByName?: string
}

export const ObjectAccessMembersPanel: React.FC<Props> = ({
  objectId,
  canRevoke = false,
  revokeFilter,
  revokedByName = 'Администратор',
}) => {
  const members = useObjectAccessStore((s) => s.getActiveMembers(objectId))
  const revokeMember = useObjectAccessStore((s) => s.revokeMember)

  const visible = revokeFilter
    ? members.filter((m) => revokeFilter.includes(m.role))
    : members

  if (visible.length === 0) {
    return (
      <p className="text-sm-mobile text-gray-500 bg-white rounded-2xl p-4 border border-gray-100 text-center">
        Пока никто не подключён
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {visible.map((m) => (
        <MemberRow
          key={m.id}
          member={m}
          canRevoke={canRevoke && m.connectedVia !== 'owner'}
          onRevoke={() => {
            if (window.confirm(`Отозвать доступ у ${m.fullName}?`)) {
              revokeMember(m.id, revokedByName)
            }
          }}
        />
      ))}
    </div>
  )
}

const MemberRow: React.FC<{
  member: ObjectAccessMember
  canRevoke: boolean
  onRevoke: () => void
}> = ({ member, canRevoke, onRevoke }) => {
  const Icon = ROLE_ICON[member.role]
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm-mobile font-semibold text-gray-900 truncate">{member.fullName}</p>
        <p className="text-xs-mobile text-gray-500">
          {ROLE_LABEL[member.role]}
          {' · '}
          {new Date(member.connectedAt).toLocaleDateString('ru-RU')}
        </p>
      </div>
      {canRevoke && (
        <button
          type="button"
          onClick={onRevoke}
          className="p-2 rounded-lg text-red-600 hover:bg-red-50 shrink-0"
          title="Отозвать доступ"
        >
          <UserMinus size={18} />
        </button>
      )}
    </div>
  )
}
