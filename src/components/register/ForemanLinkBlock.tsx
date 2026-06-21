import React, { useMemo, useState } from 'react'
import { HardHat, KeyRound, Search } from 'lucide-react'
import type { SpecializationId } from '@/constants/specializations'
import { specializationLabels } from '@/constants/specializations'
import type { Contractor } from '@/types/projectWorkflow'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { usePersonProfileStore } from '@store/personProfileStore'
import { useOrganizationStore } from '@store/organizationStore'
import type { PersonProfile } from '@/types/person'

interface Props {
  specializationIds: SpecializationId[]
  selectedOrgId: string
  onSelectedOrgIdChange: (id: string) => void
  foremanUserKey: string
  onForemanUserKeyChange: (key: string) => void
  foremanCode: string
  onForemanCodeChange: (code: string) => void
  foremanMatch: PersonProfile | null
  onForemanMatchChange: (p: PersonProfile | null) => void
}

export const ForemanLinkBlock: React.FC<Props> = ({
  specializationIds,
  selectedOrgId,
  onSelectedOrgIdChange,
  foremanUserKey,
  onForemanUserKeyChange,
  foremanCode,
  onForemanCodeChange,
  foremanMatch,
  onForemanMatchChange,
}) => {
  const getFiltered = useProjectWorkflowStore((s) => s.getContractorsForSpecializations)
  const getByCode = usePersonProfileStore((s) => s.getByCode)
  const getForemenProfiles = usePersonProfileStore((s) => s.getForemenProfilesForOrg)
  const orgMembers = useOrganizationStore((s) => s.members)

  const [orgSearch, setOrgSearch] = useState('')

  const filteredOrgs = useMemo(
    () => getFiltered(specializationIds),
    [getFiltered, specializationIds],
  )

  const orgOptions = useMemo(() => {
    const q = orgSearch.trim().toLowerCase()
    if (!q) return filteredOrgs
    return filteredOrgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q)
        || (o.inviteCode ?? '').toLowerCase().includes(q),
    )
  }, [filteredOrgs, orgSearch])

  const approvedForemen = useMemo(() => {
    if (!selectedOrgId) return [] as PersonProfile[]
    return getForemenProfiles(selectedOrgId)
  }, [selectedOrgId, getForemenProfiles, orgMembers])

  const handleForemanCode = (raw: string) => {
    onForemanCodeChange(raw)
    const found = getByCode(raw)
    if (found?.role === 'foreman') {
      onForemanMatchChange(found)
      onForemanUserKeyChange(found.userKey)
      if (found.organizationId) onSelectedOrgIdChange(found.organizationId)
    } else {
      onForemanMatchChange(null)
      onForemanUserKeyChange('')
    }
  }

  const selectedOrg = filteredOrgs.find((o) => o.id === selectedOrgId)

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
      <p className="text-sm-mobile font-semibold text-gray-900">Привязка к прорабу</p>

      <div className="space-y-2">
        <label className="text-sm-mobile font-medium text-gray-700">Организация</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={orgSearch}
            onChange={(e) => setOrgSearch(e.target.value)}
            placeholder="Поиск по названию или коду ОРГ-XXXX"
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
          />
        </div>
        <select
          value={selectedOrgId}
          onChange={(e) => onSelectedOrgIdChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
        >
          <option value="">— выберите организацию —</option>
          {orgOptions.map((org: Contractor) => (
            <option key={org.id} value={org.id}>
              {org.name} {org.inviteCode ? `· ${org.inviteCode}` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedOrg && (
        <div className="bg-gray-50 rounded-xl p-3 text-xs-mobile text-gray-600">
          Организация: <span className="font-semibold text-gray-900">{selectedOrg.name}</span>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm-mobile font-medium text-gray-700 flex items-center gap-1.5">
          <KeyRound size={16} /> Код прораба (ПР-XXXX)
        </label>
        <input
          value={foremanCode}
          onChange={(e) => handleForemanCode(e.target.value.toUpperCase())}
          placeholder="ПР-1042"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile uppercase tracking-wide"
        />
        {foremanCode.trim() && (
          <div className={`rounded-xl p-3 text-sm-mobile flex items-start gap-2 ${
            foremanMatch ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
          }`}>
            {foremanMatch?.facePhoto ? (
              <img src={foremanMatch.facePhoto} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <HardHat size={18} className="shrink-0 mt-0.5" />
            )}
            {foremanMatch ? (
              <div>
                <p className="font-semibold">{foremanMatch.fullName}</p>
                <p className="text-xs-mobile opacity-80">{foremanMatch.personalCode}</p>
                <p className="text-xs-mobile mt-1">{specializationLabels(foremanMatch.specializationIds)}</p>
              </div>
            ) : (
              <p>Прораб не найден. Введите код ПР-XXXX или выберите из списка ниже.</p>
            )}
          </div>
        )}
      </div>

      {approvedForemen.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs-mobile text-gray-500">Или выберите прораба организации:</p>
          {approvedForemen.map((f) => (
            <button
              key={f.userKey}
              type="button"
              onClick={() => {
                onForemanUserKeyChange(f.userKey)
                onForemanMatchChange(f)
                onForemanCodeChange(f.personalCode)
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${
                foremanUserKey === f.userKey ? 'border-primary-500 bg-primary-50' : 'border-gray-100 bg-white'
              }`}
            >
              {f.facePhoto ? (
                <img src={f.facePhoto} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <HardHat size={18} className="text-gray-500" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm-mobile font-semibold text-gray-900 truncate">{f.fullName}</p>
                <p className="text-xs-mobile text-gray-500">{f.personalCode}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
