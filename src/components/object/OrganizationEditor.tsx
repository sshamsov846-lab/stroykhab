import React from 'react'
import { Plus, Trash2, Building2 } from 'lucide-react'
import type { ClientOrganization } from '@api/clientView'
import { BigButton } from '@components/BigButton'

export interface OrgDraft {
  name: string
  specialty: string
  phone: string
}

interface OrganizationEditorProps {
  organizations: OrgDraft[]
  onChange: (orgs: OrgDraft[]) => void
  title?: string
}

export const OrganizationEditor: React.FC<OrganizationEditorProps> = ({
  organizations,
  onChange,
  title = 'Подрядные организации',
}) => {
  const update = (index: number, field: keyof OrgDraft, value: string) => {
    const next = organizations.map((o, i) => (i === index ? { ...o, [field]: value } : o))
    onChange(next)
  }

  const add = () => {
    onChange([...organizations, { name: '', specialty: '', phone: '' }])
  }

  const remove = (index: number) => {
    onChange(organizations.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <div className="flex items-center gap-2">
        <Building2 size={18} className="text-primary-600" />
        <h3 className="text-base-mobile font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-sm-mobile text-gray-500">
        Организации увидят объект в своём кабинете и получат назначенные работы.
      </p>

      {organizations.map((org, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2 relative">
          {organizations.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full"
            >
              <Trash2 size={16} />
            </button>
          )}
          <input
            value={org.name}
            onChange={(e) => update(i, 'name', e.target.value)}
            placeholder="ООО «ЭлектроМонтаж»"
            className="w-full min-h-[44px] px-3 rounded-lg border border-gray-200 text-sm-mobile"
          />
          <input
            value={org.specialty}
            onChange={(e) => update(i, 'specialty', e.target.value)}
            placeholder="Специализация: Электрика"
            className="w-full min-h-[44px] px-3 rounded-lg border border-gray-200 text-sm-mobile"
          />
          <input
            value={org.phone}
            onChange={(e) => update(i, 'phone', e.target.value)}
            placeholder="+7 (999) 000-00-00"
            type="tel"
            className="w-full min-h-[44px] px-3 rounded-lg border border-gray-200 text-sm-mobile"
          />
        </div>
      ))}

      <BigButton type="button" variant="secondary" size="sm" fullWidth icon={<Plus size={16} />} onClick={add}>
        Добавить организацию
      </BigButton>
    </div>
  )
}

export function orgDraftsToClientOrgs(drafts: OrgDraft[]): ClientOrganization[] {
  return drafts
    .filter((d) => d.name.trim())
    .map((d, i) => ({
      id: `org-new-${Date.now()}-${i}`,
      name: d.name.trim(),
      specialty: d.specialty.trim() || 'Подрядные работы',
      phone: d.phone.trim(),
      contract_date: new Date().toISOString().slice(0, 10),
    }))
}
