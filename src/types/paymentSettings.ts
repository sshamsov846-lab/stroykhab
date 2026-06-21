/** Когда закрывать и платить */
export type PaymentClosingTrigger = 'period_act' | 'immediate' | 'manual'

/** Как считать оплату */
export type PaymentCalcMode = 'volume' | 'time' | 'fixed' | 'mixed'

/** Формат документа */
export type PaymentDocumentMode = 'official_pdf' | 'simple_act' | 'photo_scan' | 'none'

export type PaymentPeriod = 'week' | 'stage' | 'month'

export interface CompanyRequisites {
  companyName?: string
  inn?: string
  address?: string
  bankName?: string
  bik?: string
  account?: string
}

export interface PaymentLevelSettings {
  closingTrigger: PaymentClosingTrigger
  period: PaymentPeriod
  calcMode: PaymentCalcMode
  documentMode: PaymentDocumentMode
  updatedAt: string
}

export interface ForemanPaymentProfile {
  payWorkers: PaymentLevelSettings
  requisites?: CompanyRequisites
}

export interface OrgPaymentProfile {
  /** Как организация платит прорабам */
  payForemen: PaymentLevelSettings
  /** Как организация выставляет заказчику */
  chargeClient: PaymentLevelSettings
  requisites?: CompanyRequisites
}

export const PAYMENT_CLOSING_LABELS: Record<PaymentClosingTrigger, string> = {
  period_act: 'По акту за период',
  immediate: 'Сразу за каждую принятую работу',
  manual: 'Вручную, когда решит сам',
}

export const PAYMENT_PERIOD_LABELS: Record<PaymentPeriod, string> = {
  week: 'Неделя',
  stage: 'Этап / подъезд',
  month: 'Месяц',
}

export const PAYMENT_CALC_LABELS: Record<PaymentCalcMode, string> = {
  volume: 'По объёму (м², м.п., шт)',
  time: 'По часам / дням',
  fixed: 'Фиксированная сумма за задачу',
  mixed: 'Смешанно (разные работы по-разному)',
}

export const PAYMENT_DOCUMENT_LABELS: Record<PaymentDocumentMode, string> = {
  official_pdf: 'PDF официальный (с реквизитами)',
  simple_act: 'Простой акт (таблица для своих)',
  photo_scan: 'Фото / скан рукописного листа',
  none: 'Без документа (на доверии)',
}

export function defaultPaymentLevelSettings(): PaymentLevelSettings {
  return {
    closingTrigger: 'period_act',
    period: 'week',
    calcMode: 'volume',
    documentMode: 'simple_act',
    updatedAt: new Date().toISOString(),
  }
}

export function defaultForemanProfile(): ForemanPaymentProfile {
  return { payWorkers: defaultPaymentLevelSettings() }
}

export function defaultOrgProfile(): OrgPaymentProfile {
  const base = defaultPaymentLevelSettings()
  return { payForemen: { ...base }, chargeClient: { ...base } }
}
