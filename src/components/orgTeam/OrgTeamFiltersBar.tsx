import React from 'react'
import { Search } from 'lucide-react'
import { SPECIALIZATION_OPTIONS } from '@/constants/specializations'
import type { SpecializationId } from '@/constants/specializations'
import type { OrgTeamFilters } from '@utils/orgTeamData'
import { ACTIVITY_STATUS_LABELS } from '@utils/orgTeamData'

interface Props {
  filters: OrgTeamFilters
  onChange: (patch: Partial<OrgTeamFilters>) => void
  objectOptions: { id: string; name: string }[]
}

export const OrgTeamFiltersBar: React.FC<Props> = ({ filters, onChange, objectOptions }) => (
  <div className="space-y-2">
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Поиск по имени или коду"
        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
      />
    </div>
    <div className="flex flex-wrap gap-2">
      <select
        value={filters.specializationId}
        onChange={(e) => onChange({ specializationId: e.target.value as SpecializationId | '' })}
        className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-gray-200 text-xs-mobile"
      >
        <option value="">Все специализации</option>
        {SPECIALIZATION_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <select
        value={filters.status}
        onChange={(e) => onChange({ status: e.target.value as OrgTeamFilters['status'] })}
        className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-gray-200 text-xs-mobile"
      >
        <option value="all">Все статусы</option>
        {(Object.keys(ACTIVITY_STATUS_LABELS) as Array<keyof typeof ACTIVITY_STATUS_LABELS>).map((k) => (
          <option key={k} value={k}>{ACTIVITY_STATUS_LABELS[k]}</option>
        ))}
      </select>
      <select
        value={filters.objectId}
        onChange={(e) => onChange({ objectId: e.target.value })}
        className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-gray-200 text-xs-mobile"
      >
        <option value="">Все объекты</option>
        {objectOptions.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </div>
  </div>
)
