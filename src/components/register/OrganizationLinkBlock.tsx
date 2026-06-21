import React, { useMemo, useState } from 'react'
import { Building2, KeyRound, List } from 'lucide-react'
import type { SpecializationId } from '@/constants/specializations'
import { specializationLabels } from '@/constants/specializations'
import type { Contractor } from '@/types/projectWorkflow'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useTelegram } from '@hooks/useTelegram'
import { normalizePersonCode } from '@utils/personCodes'

export type OrgLinkMode = 'code' | 'list'

interface Props {
  specializationIds: SpecializationId[]
  mode: OrgLinkMode
  onModeChange: (mode: OrgLinkMode) => void
  selectedOrgId: string
  onSelectedOrgIdChange: (id: string) => void
  confirmCode: string
  onConfirmCodeChange: (code: string) => void
  /** Прораб: обязательная привязка с подтверждением кода */
  foremanMode?: boolean
}

export const OrganizationLinkBlock: React.FC<Props> = ({
  specializationIds,
  mode,
  onModeChange,
  selectedOrgId,
  onSelectedOrgIdChange,
  confirmCode,
  onConfirmCodeChange,
  foremanMode = false,
}) => {
  const { haptic } = useTelegram()
  const getFiltered = useProjectWorkflowStore((s) => s.getContractorsForSpecializations)
  const contractors = useProjectWorkflowStore((s) => s.contractors)

  const [search, setSearch] = useState('')

  const filteredOrgs = useMemo(
    () => getFiltered(specializationIds),
    [getFiltered, specializationIds],
  )

  const displayOrgs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return filteredOrgs
    return filteredOrgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q)
        || (o.inviteCode ?? '').toLowerCase().includes(q),
    )
  }, [filteredOrgs, search])

  const selectedOrg = contractors.find((o) => o.id === selectedOrgId)
  const codeConfirmed =
    !!selectedOrg
    && !!confirmCode.trim()
    && normalizePersonCode(confirmCode) === normalizePersonCode(selectedOrg.inviteCode ?? '')

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <p className="text-sm-mobile font-semibold text-gray-900">
        {foremanMode ? 'Привязка к организации' : 'Организация'}
      </p>
      <p className="text-xs-mobile text-gray-500">
        {foremanMode
          ? 'Выберите организацию и введите её код ОРГ-XXXX для подтверждения. Организация должна одобрить запрос.'
          : 'Выберите организацию из списка.'}
      </p>

      {!foremanMode && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { haptic('selection'); onModeChange('list') }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm-mobile border ${
              mode === 'list' ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-gray-200'
            }`}
          >
            <List size={16} /> Из списка
          </button>
          <button
            type="button"
            onClick={() => { haptic('selection'); onModeChange('code') }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm-mobile border ${
              mode === 'code' ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-gray-200'
            }`}
          >
            <KeyRound size={16} /> По коду
          </button>
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по названию или коду ОРГ-XXXX"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
      />

      <select
        value={selectedOrgId}
        onChange={(e) => {
          onSelectedOrgIdChange(e.target.value)
          onConfirmCodeChange('')
        }}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
      >
        <option value="">— выберите организацию —</option>
        {displayOrgs.map((org: Contractor) => (
          <option key={org.id} value={org.id}>
            {org.name} {org.inviteCode ? `· ${org.inviteCode}` : ''}
          </option>
        ))}
      </select>

      {selectedOrg && (
        <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
          <Building2 size={18} className="text-gray-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm-mobile font-semibold text-gray-900">{selectedOrg.name}</p>
            <p className="text-xs-mobile text-gray-500">{selectedOrg.specialty}</p>
          </div>
        </div>
      )}

      {selectedOrgId && (
        <div className="space-y-2">
          <label className="text-sm-mobile font-medium text-gray-700">
            Код организации для подтверждения
          </label>
          <input
            value={confirmCode}
            onChange={(e) => onConfirmCodeChange(e.target.value.toUpperCase())}
            placeholder="ОРГ-4521"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile uppercase tracking-wide"
          />
          {confirmCode.trim() && (
            <p className={`text-xs-mobile rounded-lg p-2 ${
              codeConfirmed ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
            }`}>
              {codeConfirmed
                ? 'Код подтверждён — после регистрации организация получит запрос'
                : 'Код не совпадает с выбранной организацией'}
            </p>
          )}
        </div>
      )}

      {filteredOrgs.length === 0 && (
        <p className="text-xs-mobile text-amber-700 bg-amber-50 p-2 rounded-lg">
          Нет организаций по специализации: {specializationLabels(specializationIds) || '—'}
        </p>
      )}
    </div>
  )
}

export function isOrgCodeConfirmed(selectedOrg: Contractor | undefined, confirmCode: string): boolean {
  if (!selectedOrg || !confirmCode.trim()) return false
  return normalizePersonCode(confirmCode) === normalizePersonCode(selectedOrg.inviteCode ?? '')
}
