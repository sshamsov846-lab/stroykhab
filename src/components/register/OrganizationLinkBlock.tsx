import React, { useMemo, useState } from 'react'
import { Building2, KeyRound, List } from 'lucide-react'
import type { SpecializationId } from '@/constants/specializations'
import { specializationLabels } from '@/constants/specializations'
import { useDirectoryStore } from '@store/directoryStore'
import { useTelegram } from '@hooks/useTelegram'
import { normalizePersonCode } from '@utils/personCodes'

export type OrgLinkMode = 'code' | 'list'

interface OrgOption {
  id: string
  name: string
  specialty: string
  inviteCode: string
}

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
  const searchOrganizations = useDirectoryStore((s) => s.searchOrganizations)
  const orgs = useDirectoryStore((s) => s.orgs)
  const findOrgByCode = useDirectoryStore((s) => s.findOrgByCode)

  const [search, setSearch] = useState('')

  const allOrgs = useMemo((): OrgOption[] => {
    const list = searchOrganizations(search)
    return list
      .filter((o) => {
        if (!specializationIds.length || !o.specializationIds.length) return true
        return specializationIds.some((id) => o.specializationIds.includes(id))
      })
      .map((o) => ({
        id: o.contractorId,
        name: o.name,
        specialty: o.specialty,
        inviteCode: o.inviteCode,
      }))
  }, [searchOrganizations, search, specializationIds, orgs])

  const selectedOrg = selectedOrgId ? orgs[selectedOrgId] : findOrgByCode(confirmCode)
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
          ? 'Выберите организацию и введите её код ОРГ-XXXX. После регистрации вы сразу появитесь в списке прорабов.'
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
        placeholder="Поиск по названию, ИНН или коду ОРГ-XXXX"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
      />

      {foremanMode && mode === 'code' && (
        <div className="space-y-2">
          <label className="text-sm-mobile font-medium text-gray-700">Код организации</label>
          <input
            value={confirmCode}
            onChange={(e) => {
              const code = e.target.value.toUpperCase()
              onConfirmCodeChange(code)
              const found = findOrgByCode(code)
              if (found) onSelectedOrgIdChange(found.contractorId)
              else onSelectedOrgIdChange('')
            }}
            placeholder="ОРГ-4521"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile uppercase tracking-wide"
          />
        </div>
      )}

      {(foremanMode ? mode !== 'code' : true) && (
        <select
          value={selectedOrgId}
          onChange={(e) => {
            onSelectedOrgIdChange(e.target.value)
            onConfirmCodeChange('')
          }}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
        >
          <option value="">— выберите организацию —</option>
          {allOrgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name} {org.inviteCode ? `· ${org.inviteCode}` : ''}
            </option>
          ))}
        </select>
      )}

      {selectedOrg && (
        <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
          <Building2 size={18} className="text-gray-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm-mobile font-semibold text-gray-900">{selectedOrg.name}</p>
            <p className="text-xs-mobile text-gray-500">{selectedOrg.specialty}</p>
            {selectedOrg.inn && (
              <p className="text-xs-mobile text-gray-500">ИНН: {selectedOrg.inn}</p>
            )}
          </div>
        </div>
      )}

      {selectedOrgId && foremanMode && mode !== 'code' && (
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
        </div>
      )}

      {confirmCode.trim() && foremanMode && (
        <p className={`text-xs-mobile rounded-lg p-2 ${
          codeConfirmed ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
        }`}>
          {codeConfirmed
            ? 'Код подтверждён — прораб будет привязан к организации'
            : 'Код не совпадает с выбранной организацией'}
        </p>
      )}

      {allOrgs.length === 0 && (
        <p className="text-xs-mobile text-amber-700 bg-amber-50 p-2 rounded-lg">
          {search.trim()
            ? 'Организация не найдена. Проверьте код или название.'
            : `Нет организаций${specializationIds.length ? ` по специализации: ${specializationLabels(specializationIds)}` : ''}. Сначала зарегистрируйте организацию.`}
        </p>
      )}
    </div>
  )
}

export function isOrgCodeConfirmed(
  selectedOrg: { inviteCode?: string } | undefined,
  confirmCode: string,
): boolean {
  if (!selectedOrg || !confirmCode.trim()) return false
  return normalizePersonCode(confirmCode) === normalizePersonCode(selectedOrg.inviteCode ?? '')
}
