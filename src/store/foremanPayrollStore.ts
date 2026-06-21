import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { ForemanAccount, ForemanAccrualEntry } from '@/types/foremanPayroll'
import type {
  AdvanceEntry,
  BonusEntry,
  FineEntry,
  BonusReason,
  FineReason,
  WorkerTaskPayroll,
} from '@/types/workerPayroll'
import { incomingPrice } from '@/types/workerPayroll'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useObjectStore } from '@store/objectStore'
import { calcClientAmount } from '@utils/workerPayrollCalc'
import { resolveForemanForTask } from '@utils/foremanId'
import { shouldAccrueForemanOnAccept } from '@utils/paymentSettingsHelpers'

interface ForemanPayrollState {
  accounts: Record<string, ForemanAccount>

  getAccount: (foremanId: string) => ForemanAccount | undefined
  ensureAccount: (foremanId: string, foremanName: string) => ForemanAccount
  getAllAccounts: () => ForemanAccount[]

  /** Автоначисление прорабу при приёмке задачи (расценка орг → прораб) */
  accrueOnTaskAccepted: (taskId: string, record: WorkerTaskPayroll, options?: { force?: boolean }) => void
  addAccrualFromPaymentAct: (params: {
    foremanId: string
    foremanName: string
    paymentActId: string
    actNumber: string
    objectId: string
    objectName: string
    amount: number
    workType: import('@types').WorkType
  }) => void

  addAdvance: (
    foremanId: string,
    amount: number,
    comment?: string,
    date?: string,
    kind?: 'advance' | 'settlement',
  ) => void
  addFine: (
    foremanId: string,
    params: {
      amount: number
      reason: FineReason
      issuedBy: string
      comment?: string
      objectId?: string
      taskId?: string
    },
  ) => void
  addBonus: (
    foremanId: string,
    params: {
      amount: number
      reason: BonusReason
      issuedBy: string
      comment?: string
      objectId?: string
      taskId?: string
    },
  ) => void
}

function defaultAccount(foremanId: string, foremanName: string): ForemanAccount {
  return {
    foremanId,
    foremanName,
    accruals: [],
    advances: [],
    fines: [],
    bonuses: [],
    updatedAt: new Date().toISOString(),
  }
}

export const useForemanPayrollStore = create<ForemanPayrollState>()(
  persist(
    (set, get) => ({
      accounts: {},

      getAccount: (foremanId) => get().accounts[foremanId],

      ensureAccount: (foremanId, foremanName) => {
        const existing = get().accounts[foremanId]
        if (existing) {
          if (existing.foremanName !== foremanName && foremanName) {
            const updated = { ...existing, foremanName, updatedAt: new Date().toISOString() }
            set({ accounts: { ...get().accounts, [foremanId]: updated } })
            return updated
          }
          return existing
        }
        const account = defaultAccount(foremanId, foremanName)
        set({ accounts: { ...get().accounts, [foremanId]: account } })
        return account
      },

      getAllAccounts: () => Object.values(get().accounts),

      accrueOnTaskAccepted: (taskId, record, options) => {
        if (!options?.force && !shouldAccrueForemanOnAccept(taskId)) return

        const task = useProjectWorkflowStore.getState().tasks[taskId]
        if (!task) return

        const { foremanId, foremanName } = resolveForemanForTask(task.contractorId)
        const account = get().ensureAccount(foremanId, foremanName)

        if (account.accruals.some((a) => a.taskId === taskId)) return

        const amount = calcClientAmount(record)
        const obj = useObjectStore.getState().userObjects.find((o) => o.id === task.objectId)

        const accrual: ForemanAccrualEntry = {
          id: `facc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          taskId,
          taskTitle: task.title,
          objectId: task.objectId,
          objectName: obj?.name ?? task.house,
          workType: task.workType,
          payType: record.payType,
          completedVolume: record.completedVolume,
          volumeUnit: record.volumeUnit,
          unitPrice: incomingPrice(record),
          amount,
          acceptedAt: new Date().toISOString(),
        }

        set({
          accounts: {
            ...get().accounts,
            [foremanId]: {
              ...account,
              accruals: [accrual, ...account.accruals],
              updatedAt: new Date().toISOString(),
            },
          },
        })
      },

      addAdvance: (foremanId, amount, comment, date, kind = 'advance') => {
        if (amount <= 0) return
        const account = get().accounts[foremanId]
        if (!account) return

        const entry: AdvanceEntry = {
          id: `fadv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          date: date ?? new Date().toISOString().slice(0, 10),
          amount,
          comment,
          kind,
          createdAt: new Date().toISOString(),
        }

        set({
          accounts: {
            ...get().accounts,
            [foremanId]: {
              ...account,
              advances: [entry, ...account.advances],
              updatedAt: new Date().toISOString(),
            },
          },
        })
      },

      addFine: (foremanId, params) => {
        if (params.amount <= 0) return
        const account = get().accounts[foremanId]
        if (!account) return

        const entry: FineEntry = {
          id: `ffine-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          amount: params.amount,
          reason: params.reason,
          comment: params.comment,
          objectId: params.objectId,
          taskId: params.taskId,
          issuedBy: params.issuedBy,
          createdAt: new Date().toISOString(),
        }

        set({
          accounts: {
            ...get().accounts,
            [foremanId]: {
              ...account,
              fines: [entry, ...(account.fines ?? [])],
              updatedAt: new Date().toISOString(),
            },
          },
        })
      },

      addBonus: (foremanId, params) => {
        if (params.amount <= 0) return
        const account = get().accounts[foremanId]
        if (!account) return

        const entry: BonusEntry = {
          id: `fbonus-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          amount: params.amount,
          reason: params.reason,
          comment: params.comment,
          objectId: params.objectId,
          taskId: params.taskId,
          issuedBy: params.issuedBy,
          createdAt: new Date().toISOString(),
        }

        set({
          accounts: {
            ...get().accounts,
            [foremanId]: {
              ...account,
              bonuses: [entry, ...(account.bonuses ?? [])],
              updatedAt: new Date().toISOString(),
            },
          },
        })
      },

      addAccrualFromPaymentAct: (params) => {
        if (params.amount <= 0) return
        const account = get().ensureAccount(params.foremanId, params.foremanName)
        if (account.accruals.some((a) => a.id === `pa-f-${params.paymentActId}`)) return
        const accrual: ForemanAccrualEntry = {
          id: `pa-f-${params.paymentActId}`,
          taskId: params.paymentActId,
          taskTitle: `Акт ${params.actNumber}`,
          objectId: params.objectId,
          objectName: params.objectName,
          workType: params.workType,
          payType: 'volume',
          amount: params.amount,
          acceptedAt: new Date().toISOString(),
        }
        set({
          accounts: {
            ...get().accounts,
            [params.foremanId]: {
              ...account,
              accruals: [accrual, ...account.accruals],
              updatedAt: new Date().toISOString(),
            },
          },
        })
      },
    }),
    {
      name: STORAGE_KEYS.FOREMAN_PAYROLL,
      storage: createJSONStorage(() => createZustandStorage()),
      version: 1,
      migrate: (persisted: unknown) => {
        const state = persisted as { accounts?: Record<string, ForemanAccount> }
        const accounts = state.accounts ?? {}
        for (const id of Object.keys(accounts)) {
          const a = accounts[id]
          accounts[id] = {
            ...a,
            fines: a.fines ?? [],
            bonuses: a.bonuses ?? [],
          }
        }
        return { ...state, accounts }
      },
    },
  ),
)
