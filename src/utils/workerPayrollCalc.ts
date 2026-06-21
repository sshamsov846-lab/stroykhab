import type { WorkerTaskPayroll, WorkerAccount } from '@/types/workerPayroll'
import { incomingPrice, outgoingPrice } from '@/types/workerPayroll'
import { useObjectStore } from '@store/objectStore'
import { useBrigadeStore } from '@store/brigadeStore'
import { useRateCatalogStore } from '@store/rateCatalogStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

export function resolveAssignedWorkerId(taskId: string): string | undefined {
  const { contractorWorkerAssignments, workerTaskAssignments, brigadeTaskAssignments } =
    useObjectStore.getState()
  const brigadeId = brigadeTaskAssignments[taskId]
  if (brigadeId) {
    const brigade = useBrigadeStore.getState().getBrigade(brigadeId)
    if (brigade?.leaderWorkerMemberId) return brigade.leaderWorkerMemberId
  }
  return contractorWorkerAssignments[taskId] || workerTaskAssignments[taskId]
}

export function resolveBrigadeIdForTask(taskId: string): string | undefined {
  return useObjectStore.getState().brigadeTaskAssignments[taskId]
}

/** Сумма мастеру (исходящая) */
export function calcWorkerAmount(record: WorkerTaskPayroll): number {
  if (record.payType === 'redo' && record.redoReason === 'own_fault') return 0

  const out = outgoingPrice(record)
  switch (record.payType) {
    case 'daily':
      return (record.workDays?.length ?? 0) * (record.dailyRate ?? out)
    case 'hourly':
      return (record.hoursWorked ?? 0) * (record.hourlyRate ?? out)
    case 'volume':
      return (record.completedVolume ?? 0) * out
    case 'fixed':
      return record.fixedAmount ?? 0
    case 'redo':
      return 0
    default:
      return 0
  }
}

export const calcTaskAmount = calcWorkerAmount

/** Сумма от заказчика (clientPrice или incoming) */
export function calcClientAmount(record: WorkerTaskPayroll): number {
  const task = useProjectWorkflowStore.getState().tasks[record.taskId]
  const rate = useRateCatalogStore.getState().getRate(task?.workType ?? 'plaster')
  const inc = rate?.clientPrice ?? incomingPrice(record)
  switch (record.payType) {
    case 'daily':
      return (record.workDays?.length ?? 0) * inc
    case 'hourly':
      return (record.hoursWorked ?? 0) * inc
    case 'volume':
      return (record.completedVolume ?? 0) * inc
    case 'fixed':
      return record.fixedAmount ?? 0
    case 'redo':
      return 0
    default:
      return 0
  }
}

export function calcForemanMargin(record: WorkerTaskPayroll): number {
  return calcClientAmount(record) - calcWorkerAmount(record)
}

export function calcAccountAccrued(account: WorkerAccount): number {
  return account.accruals.reduce((s, a) => s + a.amount, 0)
}

export function calcAccountAdvances(account: WorkerAccount): number {
  return account.advances.reduce((s, a) => s + a.amount, 0)
}

export function calcAccountFines(account: WorkerAccount): number {
  return (account.fines ?? []).reduce((s, f) => s + f.amount, 0)
}

export function calcAccountBonuses(account: WorkerAccount): number {
  return (account.bonuses ?? []).reduce((s, b) => s + b.amount, 0)
}

/** Остаток долга прораба мастеру: начислено + премии − штрафы − авансы */
export function calcAccountDebt(account: WorkerAccount): number {
  return (
    calcAccountAccrued(account)
    + calcAccountBonuses(account)
    - calcAccountFines(account)
    - calcAccountAdvances(account)
  )
}

export function getAccountSummary(account: WorkerAccount) {
  const accrued = calcAccountAccrued(account)
  const bonuses = calcAccountBonuses(account)
  const fines = calcAccountFines(account)
  const advances = calcAccountAdvances(account)
  const debt = accrued + bonuses - fines - advances
  return { accrued, bonuses, fines, advances, debt }
}

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatMoney(n: number): string {
  const sign = n < 0 ? '−' : ''
  return `${sign}${Math.abs(Math.round(n)).toLocaleString('ru-RU')} ₽`
}

export function workerNameById(workerId: string): string {
  const { teamMembers, contractorWorkers } = useObjectStore.getState()
  const tm = teamMembers.find((m) => m.id === workerId)
  if (tm) return tm.name
  for (const list of Object.values(contractorWorkers)) {
    const found = list.find((m) => m.id === workerId)
    if (found) return found.name
  }
  return 'Мастер'
}
