import React, { useMemo, useState } from 'react'
import { FolderOpen, ChevronDown, ChevronRight, Users } from 'lucide-react'
import { usePersonProfileStore } from '@store/personProfileStore'
import { specializationLabels } from '@/constants/specializations'
import type { Brigade } from '@/types/brigade'

interface Props {
  brigade: Brigade
  defaultOpen?: boolean
  onSelect?: () => void
  selected?: boolean
  showSelect?: boolean
}

export const BrigadeFolderCard: React.FC<Props> = ({
  brigade,
  defaultOpen = false,
  onSelect,
  selected,
  showSelect,
}) => {
  const [open, setOpen] = useState(defaultOpen)
  const profiles = usePersonProfileStore((s) => s.profiles)

  const members = useMemo(
    () =>
      brigade.memberUserKeys
        .map((k) => profiles[k])
        .filter((p): p is NonNullable<typeof p> => !!p),
    [brigade.memberUserKeys, profiles],
  )

  const leader = profiles[brigade.leaderUserKey]

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        selected ? 'border-primary-500 bg-primary-50/30' : 'border-gray-100 bg-white'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <FolderOpen size={22} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm-mobile font-bold text-gray-900 truncate">{brigade.name}</p>
          <p className="text-xs-mobile text-primary-600 font-mono">{brigade.brigadeCode}</p>
          <p className="text-xs-mobile text-gray-500">
            {specializationLabels(brigade.specializationIds)} · {members.length} чел.
          </p>
        </div>
        {open ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-50">
          <p className="text-xs-mobile text-gray-500 pt-2 flex items-center gap-1">
            <Users size={14} /> Бригадир: {leader?.fullName ?? brigade.leaderName}
          </p>
          {members
            .filter((m) => m.userKey !== brigade.leaderUserKey)
            .map((m) => (
              <div key={m.userKey} className="flex items-center gap-2 pl-2">
                {m.facePhoto ? (
                  <img src={m.facePhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs-mobile font-bold text-gray-600">
                    {m.fullName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm-mobile text-gray-900 truncate">{m.fullName}</p>
                  <p className="text-xs-mobile text-gray-400">{m.personalCode}</p>
                </div>
              </div>
            ))}
          {showSelect && onSelect && (
            <button
              type="button"
              onClick={onSelect}
              className={`w-full mt-2 py-2.5 rounded-xl text-sm-mobile font-medium ${
                selected ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-700'
              }`}
            >
              {selected ? 'Выбрана' : 'Назначить бригаду'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
