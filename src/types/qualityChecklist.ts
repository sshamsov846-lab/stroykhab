import type { WorkType } from '@types'

export interface QualityChecklistItemDef {
  id: string
  label: string
}

export interface ChecklistItemResult {
  itemId: string
  label: string
  checked: boolean
  note?: string
}

export interface AcceptancePayload {
  checklist: ChecklistItemResult[]
  generalRemark?: string
  clientApproved?: boolean
}

export const DEFAULT_WARRANTY_MONTHS = 12

export const WARRANTY_MONTHS_BY_WORK: Partial<Record<WorkType, number>> = {
  plaster: 12,
  screed: 24,
  electrical: 12,
  plumbing: 12,
  tiles: 12,
  paint: 12,
  windows: 24,
  doors: 12,
  floor: 12,
  heating: 24,
}

/** Базовый каталог чек-листов — можно дополнять через store */
export const QUALITY_CHECKLIST_CATALOG: Partial<Record<WorkType, QualityChecklistItemDef[]>> = {
  plaster: [
    { id: 'level', label: 'Ровность по уровню' },
    { id: 'cracks', label: 'Без трещин и отслоений' },
    { id: 'corners', label: 'Углы 90°' },
    { id: 'thickness', label: 'Толщина по проекту' },
  ],
  screed: [
    { id: 'horizontal', label: 'Горизонт по уровню' },
    { id: 'voids', label: 'Без пустот и раковин' },
    { id: 'strength', label: 'Набор прочности (нет пыли, не крошится)' },
  ],
  electrical: [
    { id: 'sockets', label: 'Все розетки/выводы работают' },
    { id: 'grounding', label: 'Заземление выполнено' },
    { id: 'marking', label: 'Маркировка линий в щите' },
    { id: 'panel', label: 'Щит собран, автоматы подписаны' },
  ],
  tiles: [
    { id: 'hollow', label: 'Без пустот (простукивание)' },
    { id: 'joints', label: 'Ровные швы, одинаковая ширина' },
    { id: 'level', label: 'Уровень и плоскость' },
    { id: 'cuts', label: 'Подрезка аккуратная' },
  ],
  plumbing: [
    { id: 'pressure', label: 'Опрессовка / нет течей' },
    { id: 'slope', label: 'Уклон канализации' },
    { id: 'fixtures', label: 'Сантехника установлена, работает' },
  ],
  paint: [
    { id: 'coverage', label: 'Равномерное покрытие без пропусков' },
    { id: 'defects', label: 'Без потёков, наплывов' },
    { id: 'color', label: 'Цвет по согласованию' },
  ],
  windows: [
    { id: 'install', label: 'Установка по уровню' },
    { id: 'seal', label: 'Запенивание/герметизация' },
    { id: 'open', label: 'Открывание, фурнитура' },
  ],
}

export const DEFAULT_CHECKLIST: QualityChecklistItemDef[] = [
  { id: 'quality', label: 'Качество соответствует нормам' },
  { id: 'scope', label: 'Объём работ выполнен полностью' },
  { id: 'clean', label: 'Рабочая зона убрана' },
]

export function warrantyMonthsFor(workType: WorkType): number {
  return WARRANTY_MONTHS_BY_WORK[workType] ?? DEFAULT_WARRANTY_MONTHS
}

export function resolveChecklistItems(
  workType: WorkType,
  extraItems: QualityChecklistItemDef[] = [],
): QualityChecklistItemDef[] {
  const base = QUALITY_CHECKLIST_CATALOG[workType] ?? DEFAULT_CHECKLIST
  const seen = new Set(base.map((i) => i.id))
  const merged = [...base]
  for (const item of extraItems) {
    if (!seen.has(item.id)) {
      merged.push(item)
      seen.add(item.id)
    }
  }
  return merged
}

export function buildEmptyChecklistResults(items: QualityChecklistItemDef[]): ChecklistItemResult[] {
  return items.map((i) => ({ itemId: i.id, label: i.label, checked: false }))
}

export function validateChecklistForAcceptance(results: ChecklistItemResult[]): string | null {
  for (const item of results) {
    if (!item.checked && !item.note?.trim()) {
      return `Отметьте или укажите замечание: «${item.label}»`
    }
  }
  return null
}
