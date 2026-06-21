import type { WorkType } from '@types'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import type { ForemanAccount, ForemanAccrualEntry } from '@/types/foremanPayroll'
import type { WorkerAccount, AccrualEntry } from '@/types/workerPayroll'
import { VOLUME_UNIT_LABELS } from '@/types/workerPayroll'
import {
  calcForemanAccrued,
  getForemanAccountSummary,
} from '@utils/foremanPayrollCalc'
import {
  calcAccountAccrued,
  calcAccountDebt,
  getAccountSummary,
} from '@utils/workerPayrollCalc'

export interface WorkTypeVolumeRow {
  workType: WorkType
  label: string
  volume: number
  unitLabel: string
  amount: number
  taskCount: number
}

export interface OrgForemanReportRow {
  foremanId: string
  foremanName: string
  accrued: number
  bonuses: number
  fines: number
  advances: number
  balance: number
  byWorkType: WorkTypeVolumeRow[]
}

export interface ForemanMoneyReport {
  fromOrg: {
    received: number
    bonuses: number
    fines: number
    advances: number
    balance: number
    byWorkType: WorkTypeVolumeRow[]
  }
  toWorkers: {
    accrued: number
    bonuses: number
    fines: number
    advances: number
    totalDebt: number
    workers: Array<{
      workerId: string
      workerName: string
      balance: number
      accrued: number
    }>
  }
  margin: number
}

function groupAccrualsByWorkType<T extends { workType?: WorkType; completedVolume?: number; volumeUnit?: string; amount: number }>(
  accruals: T[],
  getWorkType: (a: T) => WorkType,
): WorkTypeVolumeRow[] {
  const map = new Map<WorkType, WorkTypeVolumeRow>()

  for (const a of accruals) {
    const wt = getWorkType(a)
    const existing = map.get(wt)
    const unit = a.volumeUnit ? VOLUME_UNIT_LABELS[a.volumeUnit as keyof typeof VOLUME_UNIT_LABELS] : '—'
    if (existing) {
      existing.volume += a.completedVolume ?? 0
      existing.amount += a.amount
      existing.taskCount += 1
    } else {
      map.set(wt, {
        workType: wt,
        label: WORK_TYPE_LABELS[wt] || wt,
        volume: a.completedVolume ?? 0,
        unitLabel: unit,
        amount: a.amount,
        taskCount: 1,
      })
    }
  }

  return [...map.values()].sort((a, b) => b.amount - a.amount)
}

export function buildWorkTypeBreakdownFromForeman(accruals: ForemanAccrualEntry[]): WorkTypeVolumeRow[] {
  return groupAccrualsByWorkType(accruals, (a) => a.workType)
}

export function buildWorkTypeBreakdownFromWorker(accruals: AccrualEntry[]): WorkTypeVolumeRow[] {
  return groupAccrualsByWorkType(accruals, (a) => a.workType ?? 'plaster')
}

export function buildOrgForemanReport(accounts: ForemanAccount[]): {
  foremen: OrgForemanReportRow[]
  totalBalance: number
  totalAccrued: number
} {
  const foremen = accounts.map((account) => {
    const summary = getForemanAccountSummary(account)
    return {
      foremanId: account.foremanId,
      foremanName: account.foremanName,
      ...summary,
      byWorkType: buildWorkTypeBreakdownFromForeman(account.accruals),
    }
  }).sort((a, b) => b.balance - a.balance)

  return {
    foremen,
    totalBalance: foremen.reduce((s, f) => s + f.balance, 0),
    totalAccrued: foremen.reduce((s, f) => s + f.accrued, 0),
  }
}

export function buildForemanMoneyReport(
  foremanAccount: ForemanAccount | undefined,
  workerAccounts: WorkerAccount[],
): ForemanMoneyReport {
  const orgSummary = foremanAccount
    ? getForemanAccountSummary(foremanAccount)
    : { accrued: 0, bonuses: 0, fines: 0, advances: 0, balance: 0 }

  const workers = workerAccounts.map((a) => {
    const summary = getAccountSummary(a)
    return {
      workerId: a.workerId,
      workerName: a.workerName,
      balance: summary.debt,
      accrued: summary.accrued,
    }
  }).sort((a, b) => b.balance - a.balance)

  const workerTotals = workers.reduce(
    (acc, w) => {
      const s = getAccountSummary(workerAccounts.find((a) => a.workerId === w.workerId)!)
      return {
        accrued: acc.accrued + s.accrued,
        bonuses: acc.bonuses + s.bonuses,
        fines: acc.fines + s.fines,
        advances: acc.advances + s.advances,
        totalDebt: acc.totalDebt + s.debt,
      }
    },
    { accrued: 0, bonuses: 0, fines: 0, advances: 0, totalDebt: 0 },
  )

  const receivedFromOrg = foremanAccount ? calcForemanAccrued(foremanAccount) : 0
  const paidToWorkers = workerAccounts.reduce((s, a) => s + calcAccountAccrued(a), 0)
  const margin = receivedFromOrg - paidToWorkers

  return {
    fromOrg: {
      received: orgSummary.accrued,
      bonuses: orgSummary.bonuses,
      fines: orgSummary.fines,
      advances: orgSummary.advances,
      balance: orgSummary.balance,
      byWorkType: foremanAccount ? buildWorkTypeBreakdownFromForeman(foremanAccount.accruals) : [],
    },
    toWorkers: {
      ...workerTotals,
      workers,
    },
    margin,
  }
}

export function buildWorkerVolumeReport(account: WorkerAccount | undefined): WorkTypeVolumeRow[] {
  if (!account) return []
  return buildWorkTypeBreakdownFromWorker(account.accruals)
}

export function buildWorkerPayReport(account: WorkerAccount | undefined) {
  if (!account) {
    return { accrued: 0, bonuses: 0, fines: 0, advances: 0, toPay: 0, byWorkType: [] as WorkTypeVolumeRow[] }
  }
  const summary = getAccountSummary(account)
  return {
    ...summary,
    toPay: calcAccountDebt(account),
    byWorkType: buildWorkTypeBreakdownFromWorker(account.accruals),
  }
}
