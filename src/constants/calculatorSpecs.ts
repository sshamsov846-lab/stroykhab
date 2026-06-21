import type { SpecializationId } from '@/constants/specializations'
import { specializationLabel } from '@/constants/specializations'

/** Специализации в калькуляторе «Все работы» */
export const CALCULATOR_WORK_SPECS: { id: SpecializationId; label: string; emoji: string }[] = [
  { id: 'plumbing', label: 'Сантехника', emoji: '🔧' },
  { id: 'electrical', label: 'Электрика', emoji: '⚡' },
  { id: 'plaster', label: 'Штукатурка', emoji: '🧱' },
  { id: 'screed', label: 'Стяжка / Бетон', emoji: '🏗️' },
  { id: 'tiles', label: 'Плитка', emoji: '🔲' },
  { id: 'paint', label: 'Малярка', emoji: '🎨' },
  { id: 'masonry', label: 'Кладка', emoji: '🧱' },
  { id: 'drywall', label: 'Гипсокартон', emoji: '📐' },
  { id: 'windows', label: 'Окна / Двери', emoji: '🪟' },
  { id: 'roofing', label: 'Кровля', emoji: '🏠' },
]

export function calculatorSpecLabel(id: SpecializationId): string {
  return CALCULATOR_WORK_SPECS.find((s) => s.id === id)?.label ?? specializationLabel(id)
}
