import type { ForemanAccount } from '@/types/foremanPayroll'

export function calcForemanAccrued(account: ForemanAccount): number {
  return account.accruals.reduce((s, a) => s + a.amount, 0)
}

export function calcForemanAdvances(account: ForemanAccount): number {
  return account.advances.reduce((s, a) => s + a.amount, 0)
}

export function calcForemanFines(account: ForemanAccount): number {
  return (account.fines ?? []).reduce((s, f) => s + f.amount, 0)
}

export function calcForemanBonuses(account: ForemanAccount): number {
  return (account.bonuses ?? []).reduce((s, b) => s + b.amount, 0)
}

/** Остаток организации прорабу: начислено − авансы − штрафы + премии */
export function calcForemanBalance(account: ForemanAccount): number {
  return (
    calcForemanAccrued(account)
    + calcForemanBonuses(account)
    - calcForemanFines(account)
    - calcForemanAdvances(account)
  )
}

export function getForemanAccountSummary(account: ForemanAccount) {
  const accrued = calcForemanAccrued(account)
  const bonuses = calcForemanBonuses(account)
  const fines = calcForemanFines(account)
  const advances = calcForemanAdvances(account)
  const balance = accrued + bonuses - fines - advances
  return { accrued, bonuses, fines, advances, balance }
}
