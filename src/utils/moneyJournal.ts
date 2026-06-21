import type { ForemanAccount } from '@/types/foremanPayroll'
import type { WorkerAccount } from '@/types/workerPayroll'
import {
  FINE_REASON_LABELS,
  BONUS_REASON_LABELS,
  PAY_TYPE_LABELS,
} from '@/types/workerPayroll'
import { LEDGER_TYPE_LABELS, type LedgerEntryType } from '@utils/payrollLedger'

export type MoneyPartyType = 'org' | 'foreman' | 'worker'

export interface MoneyParty {
  type: MoneyPartyType
  id: string
  name: string
}

export interface MoneyOperation {
  id: string
  type: LedgerEntryType
  date: string
  amount: number
  from: MoneyParty
  to: MoneyParty
  label: string
  detail?: string
  objectId?: string
  objectName?: string
  taskId?: string
  issuedBy?: string
}

const ORG_PARTY: MoneyParty = { type: 'org', id: 'org', name: 'Организация' }

export function buildForemanMoneyOperations(account: ForemanAccount): MoneyOperation[] {
  const foreman: MoneyParty = { type: 'foreman', id: account.foremanId, name: account.foremanName }
  const ops: MoneyOperation[] = []

  for (const a of account.accruals) {
    ops.push({
      id: a.id,
      type: 'accrual',
      date: a.acceptedAt.slice(0, 10),
      amount: a.amount,
      from: ORG_PARTY,
      to: foreman,
      label: a.taskTitle,
      detail: PAY_TYPE_LABELS[a.payType],
      objectId: a.objectId,
      objectName: a.objectName,
      taskId: a.taskId,
    })
  }

  for (const a of account.advances) {
    ops.push({
      id: a.id,
      type: a.kind === 'settlement' ? 'settlement' : 'advance',
      date: a.date,
      amount: -a.amount,
      from: ORG_PARTY,
      to: foreman,
      label: a.kind === 'settlement' ? 'Окончательный расчёт' : 'Аванс от организации',
      detail: a.comment,
    })
  }

  for (const f of account.fines ?? []) {
    ops.push({
      id: f.id,
      type: 'fine',
      date: f.createdAt.slice(0, 10),
      amount: -f.amount,
      from: foreman,
      to: ORG_PARTY,
      label: `Штраф: ${FINE_REASON_LABELS[f.reason]}`,
      detail: f.comment,
      objectId: f.objectId,
      taskId: f.taskId,
      issuedBy: f.issuedBy,
    })
  }

  for (const b of account.bonuses ?? []) {
    ops.push({
      id: b.id,
      type: 'bonus',
      date: b.createdAt.slice(0, 10),
      amount: b.amount,
      from: ORG_PARTY,
      to: foreman,
      label: `Премия: ${BONUS_REASON_LABELS[b.reason]}`,
      detail: b.comment,
      objectId: b.objectId,
      taskId: b.taskId,
      issuedBy: b.issuedBy,
    })
  }

  return ops
}

export function buildWorkerMoneyOperations(
  account: WorkerAccount,
  foremanName = 'Прораб',
  foremanId = 'foreman',
): MoneyOperation[] {
  const foreman: MoneyParty = { type: 'foreman', id: foremanId, name: foremanName }
  const worker: MoneyParty = { type: 'worker', id: account.workerId, name: account.workerName }
  const ops: MoneyOperation[] = []

  for (const a of account.accruals) {
    ops.push({
      id: a.id,
      type: 'accrual',
      date: a.acceptedAt.slice(0, 10),
      amount: a.amount,
      from: foreman,
      to: worker,
      label: a.taskTitle,
      detail: PAY_TYPE_LABELS[a.payType],
      objectId: a.objectId,
      objectName: a.objectName,
      taskId: a.taskId,
    })
  }

  for (const a of account.advances) {
    ops.push({
      id: a.id,
      type: a.kind === 'settlement' ? 'settlement' : 'advance',
      date: a.date,
      amount: -a.amount,
      from: foreman,
      to: worker,
      label: a.kind === 'settlement' ? 'Окончательный расчёт' : 'Аванс от прораба',
      detail: a.comment,
    })
  }

  for (const f of account.fines ?? []) {
    ops.push({
      id: f.id,
      type: 'fine',
      date: f.createdAt.slice(0, 10),
      amount: -f.amount,
      from: worker,
      to: foreman,
      label: `Штраф: ${FINE_REASON_LABELS[f.reason]}`,
      detail: f.comment,
      objectId: f.objectId,
      taskId: f.taskId,
      issuedBy: f.issuedBy,
    })
  }

  for (const b of account.bonuses ?? []) {
    ops.push({
      id: b.id,
      type: 'bonus',
      date: b.createdAt.slice(0, 10),
      amount: b.amount,
      from: foreman,
      to: worker,
      label: `Премия: ${BONUS_REASON_LABELS[b.reason]}`,
      detail: b.comment,
      objectId: b.objectId,
      taskId: b.taskId,
      issuedBy: b.issuedBy,
    })
  }

  return ops
}

export function buildUnifiedMoneyJournal(
  foremanAccounts: ForemanAccount[],
  workerAccounts: WorkerAccount[],
  foremanName = 'Прораб',
  foremanId = 'foreman',
): MoneyOperation[] {
  const foremanOps = foremanAccounts.flatMap(buildForemanMoneyOperations)
  const workerOps = workerAccounts.flatMap((a) => buildWorkerMoneyOperations(a, foremanName, foremanId))
  return [...foremanOps, ...workerOps].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  )
}

export function filterMoneyOperations(
  ops: MoneyOperation[],
  filter: {
    types?: LedgerEntryType[]
    objectId?: string
    dateFrom?: string
    dateTo?: string
    partyId?: string
  },
): MoneyOperation[] {
  return ops.filter((op) => {
    if (filter.types?.length && !filter.types.includes(op.type)) return false
    if (filter.objectId && op.objectId !== filter.objectId) return false
    if (filter.dateFrom && op.date < filter.dateFrom) return false
    if (filter.dateTo && op.date > filter.dateTo) return false
    if (filter.partyId && op.from.id !== filter.partyId && op.to.id !== filter.partyId) return false
    return true
  })
}

export { LEDGER_TYPE_LABELS }

export function partyLabel(p: MoneyParty): string {
  if (p.type === 'org') return 'Организация'
  if (p.type === 'foreman') return `Прораб: ${p.name}`
  return `Мастер: ${p.name}`
}
