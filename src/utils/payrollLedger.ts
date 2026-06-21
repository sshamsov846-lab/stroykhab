import type { WorkerAccount } from '@/types/workerPayroll'
import {
  FINE_REASON_LABELS,
  BONUS_REASON_LABELS,
  PAY_TYPE_LABELS,
} from '@/types/workerPayroll'

export type LedgerEntryType = 'accrual' | 'advance' | 'settlement' | 'fine' | 'bonus'

export interface LedgerEntry {
  id: string
  type: LedgerEntryType
  date: string
  /** Положительное — начисление мастеру, отрицательное — выплата/штраф */
  amount: number
  label: string
  detail?: string
  objectId?: string
  objectName?: string
  workerId: string
  workerName: string
  issuedBy?: string
}

export interface LedgerFilter {
  workerId?: string
  objectId?: string
  dateFrom?: string
  dateTo?: string
  types?: LedgerEntryType[]
}

export const LEDGER_TYPE_LABELS: Record<LedgerEntryType, string> = {
  accrual: 'Начисление',
  advance: 'Аванс',
  settlement: 'Расчёт',
  fine: 'Штраф',
  bonus: 'Премия',
}

export function buildAccountLedger(account: WorkerAccount): LedgerEntry[] {
  const entries: LedgerEntry[] = []

  for (const a of account.accruals) {
    entries.push({
      id: a.id,
      type: 'accrual',
      date: a.acceptedAt.slice(0, 10),
      amount: a.amount,
      label: a.taskTitle,
      detail: PAY_TYPE_LABELS[a.payType],
      objectId: a.objectId,
      objectName: a.objectName,
      workerId: account.workerId,
      workerName: account.workerName,
    })
  }

  for (const a of account.advances) {
    entries.push({
      id: a.id,
      type: a.kind === 'settlement' ? 'settlement' : 'advance',
      date: a.date,
      amount: -a.amount,
      label: a.kind === 'settlement' ? 'Окончательный расчёт' : 'Аванс',
      detail: a.comment,
      workerId: account.workerId,
      workerName: account.workerName,
    })
  }

  for (const f of account.fines ?? []) {
    entries.push({
      id: f.id,
      type: 'fine',
      date: f.createdAt.slice(0, 10),
      amount: -f.amount,
      label: `Штраф: ${FINE_REASON_LABELS[f.reason]}`,
      detail: f.comment,
      objectId: f.objectId,
      workerId: account.workerId,
      workerName: account.workerName,
      issuedBy: f.issuedBy,
    })
  }

  for (const b of account.bonuses ?? []) {
    entries.push({
      id: b.id,
      type: 'bonus',
      date: b.createdAt.slice(0, 10),
      amount: b.amount,
      label: `Премия: ${BONUS_REASON_LABELS[b.reason]}`,
      detail: b.comment,
      objectId: b.objectId,
      workerId: account.workerId,
      workerName: account.workerName,
      issuedBy: b.issuedBy,
    })
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}

export function buildAllLedgers(accounts: Record<string, WorkerAccount>): LedgerEntry[] {
  return Object.values(accounts)
    .flatMap(buildAccountLedger)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}

export function filterLedger(entries: LedgerEntry[], filter: LedgerFilter): LedgerEntry[] {
  return entries.filter((e) => {
    if (filter.workerId && e.workerId !== filter.workerId) return false
    if (filter.objectId && e.objectId !== filter.objectId) return false
    if (filter.types?.length && !filter.types.includes(e.type)) return false
    if (filter.dateFrom && e.date < filter.dateFrom) return false
    if (filter.dateTo && e.date > filter.dateTo) return false
    return true
  })
}
