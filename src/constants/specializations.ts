import type { WorkType } from '@types'

export type SpecializationId =
  | 'plumbing'
  | 'electrical'
  | 'plaster'
  | 'tiles'
  | 'paint'
  | 'screed'
  | 'roofing'
  | 'facade'
  | 'windows'
  | 'ventilation'
  | 'low_voltage'
  | 'landscaping'
  | 'masonry'
  | 'drywall'
  | 'universal'

export interface SpecializationOption {
  id: SpecializationId
  label: string
  codePrefix: string
  workTypes: WorkType[]
}

export const SPECIALIZATION_OPTIONS: SpecializationOption[] = [
  { id: 'plumbing', label: 'Сантехник', codePrefix: 'САНТЕХ', workTypes: ['plumbing', 'heating'] },
  { id: 'electrical', label: 'Электрик', codePrefix: 'ЭЛЕКТР', workTypes: ['electrical'] },
  { id: 'plaster', label: 'Штукатур', codePrefix: 'ШТУКАТ', workTypes: ['plaster', 'walls'] },
  { id: 'tiles', label: 'Плиточник', codePrefix: 'ПЛИТКА', workTypes: ['tiles'] },
  { id: 'paint', label: 'Маляр / отделочник', codePrefix: 'МАЛЯР', workTypes: ['paint', 'ceiling'] },
  { id: 'screed', label: 'Стяжка / полы', codePrefix: 'СТЯЖКА', workTypes: ['screed', 'floor'] },
  { id: 'roofing', label: 'Кровельщик', codePrefix: 'КРОВЛЯ', workTypes: ['roof', 'insulation'] },
  { id: 'facade', label: 'Фасадчик', codePrefix: 'ФАСАД', workTypes: ['facade'] },
  { id: 'windows', label: 'Окна / остекление', codePrefix: 'ОКНА', workTypes: ['windows', 'doors'] },
  { id: 'masonry', label: 'Кладка', codePrefix: 'КЛАДКА', workTypes: ['walls', 'facade'] },
  { id: 'drywall', label: 'Гипсокартон', codePrefix: 'ГКЛ', workTypes: ['walls', 'ceiling'] },
  { id: 'ventilation', label: 'Вентиляция', codePrefix: 'ВЕНТ', workTypes: ['ventilation'] },
  { id: 'low_voltage', label: 'Слаботочка / видеонаблюдение', codePrefix: 'СЛАБОТ', workTypes: ['electrical'] },
  { id: 'landscaping', label: 'Благоустройство', codePrefix: 'БЛАГО', workTypes: ['facade'] },
  { id: 'universal', label: 'Универсал (несколько направлений)', codePrefix: 'УНИВЕР', workTypes: [] },
]

const BY_ID = new Map(SPECIALIZATION_OPTIONS.map((o) => [o.id, o]))

export function specializationLabel(id: SpecializationId): string {
  return BY_ID.get(id)?.label ?? id
}

export function specializationLabels(ids: SpecializationId[]): string {
  return ids.map(specializationLabel).join(', ')
}

export function workTypeMatchesSpecializations(workType: WorkType, specIds: SpecializationId[]): boolean {
  if (!specIds.length) return true
  if (specIds.includes('universal')) return true
  return specIds.some((id) => {
    const opt = BY_ID.get(id)
    if (!opt) return false
    if (opt.workTypes.length === 0) return true
    return opt.workTypes.includes(workType)
  })
}

export function specializationsOverlap(a: SpecializationId[], b: SpecializationId[]): boolean {
  if (!a.length || !b.length) return true
  if (a.includes('universal') || b.includes('universal')) return true
  return a.some((id) => b.includes(id))
}

export function generateInviteCode(primarySpecId: SpecializationId, existingCodes: Set<string>): string {
  const prefix = BY_ID.get(primarySpecId)?.codePrefix ?? 'ОРГ'
  for (let attempt = 0; attempt < 30; attempt++) {
    const digits = Math.floor(1000 + Math.random() * 9000)
    const code = `${prefix}-${digits}`
    if (!existingCodes.has(code.toUpperCase())) return code
  }
  return `${prefix}-${Date.now().toString().slice(-4)}`
}

export function specialtyTextFromIds(ids: SpecializationId[]): string {
  return specializationLabels(ids)
}
