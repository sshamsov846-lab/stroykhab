/** [1, 2-4, 5+] формы: «1 секция», «2 секции», «5 секций» */
export type PluralForms = readonly [one: string, few: string, many: string]

export const PLURAL = {
  section: ['секция', 'секции', 'секций'] as PluralForms,
  house: ['дом', 'дома', 'домов'] as PluralForms,
  entrance: ['подъезд', 'подъезда', 'подъездов'] as PluralForms,
  floor: ['этаж', 'этажа', 'этажей'] as PluralForms,
  apartment: ['квартира', 'квартиры', 'квартир'] as PluralForms,
  task: ['задача', 'задачи', 'задач'] as PluralForms,
  basement: ['подвал', 'подвала', 'подвалов'] as PluralForms,
  room: ['комната', 'комнаты', 'комнат'] as PluralForms,
}

export function plural(n: number, forms: PluralForms): string {
  const abs = Math.abs(n) % 100
  const mod = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (mod > 1 && mod < 5) return forms[1]
  if (mod === 1) return forms[0]
  return forms[2]
}

/** «5 секций» */
export function pluralWithCount(n: number, forms: PluralForms): string {
  return `${n} ${plural(n, forms)}`
}

/** «Секций: 5» → «5 секций» (для сводок) */
export function countLabel(n: number, forms: PluralForms): string {
  return pluralWithCount(n, forms)
}
