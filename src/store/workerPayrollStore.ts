import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type {
  PayType,
  AdvanceEntry,
  VolumeUnit,
  WorkerTaskPayroll,
  WorkerAccount,
  AccrualEntry,
  RedoReason,
  FineEntry,
  BonusEntry,
  FineReason,
  BonusReason,
} from '@/types/workerPayroll'
import { payrollKey } from '@/types/workerPayroll'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useObjectStore } from '@store/objectStore'
import { applyCatalogToPayroll } from '@store/rateCatalogStore'
import {
  calcWorkerAmount,
  resolveAssignedWorkerId,
  workerNameById,
} from '@utils/workerPayrollCalc'
import { getApartmentAreaForTask } from '@utils/apartmentAreaForTask'
import { notifyPayrollBonus, notifyPayrollFine } from '@utils/payrollNotifications'
import { useForemanPayrollStore } from '@store/foremanPayrollStore'
import { notifyBrigadePayroll } from '@utils/brigadeNotifications'
import { useBrigadeStore } from '@store/brigadeStore'
import { shouldAccrueWorkerOnAccept } from '@utils/paymentSettingsHelpers'

interface WorkerPayrollState {
  records: Record<string, WorkerTaskPayroll>
  accounts: Record<string, WorkerAccount>

  getRecord: (taskId: string, workerId: string) => WorkerTaskPayroll | undefined
  getAccount: (workerId: string) => WorkerAccount | undefined
  ensureRecord: (params: {
    taskId: string
    workerId: string
    workerName: string
    contractorId?: string
  }) => WorkerTaskPayroll
  ensureAccount: (workerId: string, workerName: string, contractorId?: string) => WorkerAccount

  setPayType: (taskId: string, workerId: string, payType: PayType) => void
  updateDaily: (taskId: string, workerId: string, dailyRate: number) => void
  toggleWorkDay: (taskId: string, workerId: string, date: string) => void
  updateVolume: (
    taskId: string,
    workerId: string,
    patch: {
      volumeUnit?: VolumeUnit
      outgoingUnitPrice?: number
      incomingUnitPrice?: number
      completedVolume?: number
      hoursWorked?: number
      hourlyRate?: number
    },
  ) => void
  confirmVolume: (taskId: string, workerId: string, confirmed: boolean) => void
  setFixedAmount: (taskId: string, workerId: string, amount: number) => void
  setupOwnFaultRedo: (taskId: string, workerId: string) => void
  setupOtherFaultRedo: (params: {
    newTaskId: string
    parentTaskId: string
    workerId: string
    workerName: string
    contractorId?: string
    workType: import('@types').WorkType
  }) => void

  /** При приёмке задачи прорабом — начисление на счёт мастера */
  accrueOnTaskAccepted: (taskId: string, options?: { force?: boolean }) => void
  addAccrualFromPaymentAct: (params: {
    workerId: string
    workerName: string
    paymentActId: string
    actNumber: string
    objectId: string
    objectName: string
    amount: number
    contractorId?: string
  }) => void
  addAdvance: (
    workerId: string,
    amount: number,
    comment?: string,
    date?: string,
    kind?: 'advance' | 'settlement',
  ) => void
  addFine: (
    workerId: string,
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
    workerId: string,
    params: {
      amount: number
      reason: BonusReason
      issuedBy: string
      comment?: string
      objectId?: string
      taskId?: string
    },
  ) => void

  getRecordsForWorker: (workerId: string) => WorkerTaskPayroll[]
  getRecordsForContractor: (contractorId: string) => WorkerTaskPayroll[]
  getRecordsForObject: (objectId: string) => WorkerTaskPayroll[]
  getAccountsForContractor: (contractorId: string) => WorkerAccount[]
  getForemanAccounts: () => WorkerAccount[]
  getTotalAccruedForObject: (objectId: string) => number
}

function defaultRecord(params: {
  taskId: string
  workerId: string
  workerName: string
  contractorId?: string
  workType?: import('@types').WorkType
}): WorkerTaskPayroll {
  const task = useProjectWorkflowStore.getState().tasks[params.taskId]
  const wt = params.workType ?? task?.workType ?? 'plaster'
  const catalog = applyCatalogToPayroll(wt)
  const apartmentArea = getApartmentAreaForTask(params.taskId)
  return {
    taskId: params.taskId,
    workerId: params.workerId,
    workerName: params.workerName,
    contractorId: params.contractorId,
    payType: 'volume',
    incomingUnitPrice: catalog.incomingUnitPrice,
    outgoingUnitPrice: catalog.outgoingUnitPrice,
    unitPrice: catalog.outgoingUnitPrice,
    dailyRate: catalog.dailyRate,
    hourlyRate: catalog.hourlyRate,
    hoursWorked: 0,
    workDays: [],
    volumeUnit: catalog.volumeUnit,
    completedVolume: apartmentArea ?? 0,
    volumeConfirmed: false,
    fixedAmount: 0,
    isAccrued: false,
    updatedAt: new Date().toISOString(),
  }
}

function defaultAccount(workerId: string, workerName: string, contractorId?: string): WorkerAccount {
  return {
    workerId,
    workerName,
    contractorId,
    accruals: [],
    advances: [],
    fines: [],
    bonuses: [],
    updatedAt: new Date().toISOString(),
  }
}

export const useWorkerPayrollStore = create<WorkerPayrollState>()(
  persist(
    (set, get) => ({
      records: {},
      accounts: {},

      getRecord: (taskId, workerId) => get().records[payrollKey(taskId, workerId)],

      getAccount: (workerId) => get().accounts[workerId],

      ensureAccount: (workerId, workerName, contractorId) => {
        const existing = get().accounts[workerId]
        if (existing) return existing
        const account = defaultAccount(workerId, workerName, contractorId)
        set({ accounts: { ...get().accounts, [workerId]: account } })
        return account
      },

      ensureRecord: (params) => {
        const key = payrollKey(params.taskId, params.workerId)
        const existing = get().records[key]
        if (existing) {
          if (
            existing.payType === 'volume' &&
            !existing.isAccrued &&
            !existing.completedVolume
          ) {
            const area = getApartmentAreaForTask(params.taskId)
            if (area) {
              const updated = {
                ...existing,
                completedVolume: area,
                updatedAt: new Date().toISOString(),
              }
              set({ records: { ...get().records, [key]: updated } })
              return updated
            }
          }
          return existing
        }
        const record = defaultRecord(params)
        set({ records: { ...get().records, [key]: record } })
        get().ensureAccount(params.workerId, params.workerName, params.contractorId)
        return record
      },

      setPayType: (taskId, workerId, payType) => {
        const key = payrollKey(taskId, workerId)
        const rec = get().records[key]
        if (!rec || rec.isAccrued) return
        set({
          records: {
            ...get().records,
            [key]: { ...rec, payType, updatedAt: new Date().toISOString() },
          },
        })
      },

      updateDaily: (taskId, workerId, dailyRate) => {
        const key = payrollKey(taskId, workerId)
        const rec = get().records[key]
        if (!rec || rec.isAccrued) return
        set({
          records: {
            ...get().records,
            [key]: { ...rec, dailyRate, updatedAt: new Date().toISOString() },
          },
        })
      },

      toggleWorkDay: (taskId, workerId, date) => {
        const key = payrollKey(taskId, workerId)
        const rec = get().records[key]
        if (!rec || rec.isAccrued) return
        const has = rec.workDays.includes(date)
        const workDays = has ? rec.workDays.filter((d) => d !== date) : [...rec.workDays, date].sort()
        set({
          records: {
            ...get().records,
            [key]: { ...rec, workDays, updatedAt: new Date().toISOString() },
          },
        })
      },

      updateVolume: (taskId, workerId, patch) => {
        const key = payrollKey(taskId, workerId)
        const rec = get().records[key]
        if (!rec || rec.isAccrued) return
        const next = {
          ...rec,
          ...patch,
          volumeConfirmed: patch.completedVolume !== undefined ? false : rec.volumeConfirmed,
          updatedAt: new Date().toISOString(),
        }
        if (patch.outgoingUnitPrice !== undefined) {
          next.unitPrice = patch.outgoingUnitPrice
        }
        set({
          records: {
            ...get().records,
            [key]: next,
          },
        })
      },

      confirmVolume: (taskId, workerId, confirmed) => {
        const key = payrollKey(taskId, workerId)
        const rec = get().records[key]
        if (!rec || rec.isAccrued) return
        set({
          records: {
            ...get().records,
            [key]: { ...rec, volumeConfirmed: confirmed, updatedAt: new Date().toISOString() },
          },
        })
      },

      setFixedAmount: (taskId, workerId, amount) => {
        const key = payrollKey(taskId, workerId)
        const rec = get().records[key]
        if (!rec || rec.isAccrued) return
        set({
          records: {
            ...get().records,
            [key]: { ...rec, fixedAmount: amount, updatedAt: new Date().toISOString() },
          },
        })
      },

      setupOwnFaultRedo: (taskId, workerId) => {
        const key = payrollKey(taskId, workerId)
        const rec = get().records[key]
        if (!rec) return
        set({
          records: {
            ...get().records,
            [key]: {
              ...rec,
              payType: 'redo',
              redoReason: 'own_fault' as RedoReason,
              isAccrued: false,
              accruedAmount: undefined,
              updatedAt: new Date().toISOString(),
            },
          },
        })
      },

      setupOtherFaultRedo: ({ newTaskId, parentTaskId, workerId, workerName, contractorId, workType }) => {
        const catalog = applyCatalogToPayroll(workType)
        const record: WorkerTaskPayroll = {
          taskId: newTaskId,
          workerId,
          workerName,
          contractorId,
          payType: 'hourly',
          parentTaskId,
          redoReason: 'other_fault',
          incomingUnitPrice: catalog.incomingUnitPrice,
          outgoingUnitPrice: catalog.hourlyRate,
          hourlyRate: catalog.hourlyRate,
          hoursWorked: 0,
          workDays: [],
          volumeUnit: catalog.volumeUnit,
          completedVolume: 0,
          volumeConfirmed: false,
          fixedAmount: 0,
          isAccrued: false,
          updatedAt: new Date().toISOString(),
        }
        const key = payrollKey(newTaskId, workerId)
        set({
          records: { ...get().records, [key]: record },
        })
        get().ensureAccount(workerId, workerName, contractorId)
      },

      accrueOnTaskAccepted: (taskId, options) => {
        if (!options?.force && !shouldAccrueWorkerOnAccept(taskId)) return

        const workerId = resolveAssignedWorkerId(taskId)
        if (!workerId) return

        const task = useProjectWorkflowStore.getState().tasks[taskId]
        if (!task) return

        const key = payrollKey(taskId, workerId)
        let rec = get().records[key]
        if (!rec) {
          rec = get().ensureRecord({
            taskId,
            workerId,
            workerName: workerNameById(workerId),
            contractorId: task.contractorId,
          })
        }
        if (rec.isAccrued) return

        const amount = calcWorkerAmount(rec)
        const account = get().ensureAccount(workerId, rec.workerName, rec.contractorId)

        const obj = useObjectStore.getState().userObjects.find((o) => o.id === task.objectId)

        const accrual: AccrualEntry = {
          id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          taskId,
          taskTitle: task.title,
          objectId: task.objectId,
          objectName: obj?.name ?? task.house,
          isSideJob: task.isSideJob ?? obj?.isSideJob,
          amount,
          payType: rec.payType,
          workType: task.workType,
          completedVolume: rec.completedVolume,
          volumeUnit: rec.volumeUnit,
          acceptedAt: new Date().toISOString(),
        }

        useForemanPayrollStore.getState().accrueOnTaskAccepted(taskId, {
          ...rec,
          isAccrued: true,
          accruedAmount: amount,
        }, { force: options?.force })

        set({
          records: {
            ...get().records,
            [key]: {
              ...rec,
              isAccrued: true,
              accruedAmount: amount,
              updatedAt: new Date().toISOString(),
            },
          },
          accounts: {
            ...get().accounts,
            [workerId]: {
              ...account,
              accruals: [accrual, ...account.accruals],
              updatedAt: new Date().toISOString(),
            },
          },
        })

        const brigadeId = useObjectStore.getState().brigadeTaskAssignments[taskId]
        if (brigadeId) {
          notifyBrigadePayroll({
            brigadeId,
            amount,
            kind: 'accrual',
            taskTitle: task.title,
          })
        }
      },

      addAdvance: (workerId, amount, comment, date, kind = 'advance') => {
        if (amount <= 0) return
        const account = get().accounts[workerId] ?? get().ensureAccount(workerId, workerNameById(workerId))
        if (!account) return

        const entry: AdvanceEntry = {
          id: `adv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          date: date ?? new Date().toISOString().slice(0, 10),
          amount,
          comment,
          kind,
          createdAt: new Date().toISOString(),
        }

        set({
          accounts: {
            ...get().accounts,
            [workerId]: {
              ...account,
              advances: [entry, ...account.advances],
              updatedAt: new Date().toISOString(),
            },
          },
        })

        const brigade = useBrigadeStore.getState().brigades.find((b) => b.leaderWorkerMemberId === workerId)
        if (brigade) {
          notifyBrigadePayroll({ brigadeId: brigade.id, amount, kind: 'advance' })
        }
      },

      addFine: (workerId, params) => {
        if (params.amount <= 0) return
        const account = get().accounts[workerId] ?? get().ensureAccount(workerId, workerNameById(workerId))
        const entry: FineEntry = {
          id: `fine-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
            [workerId]: {
              ...account,
              fines: [entry, ...(account.fines ?? [])],
              updatedAt: new Date().toISOString(),
            },
          },
        })
        notifyPayrollFine({
          workerId,
          amount: params.amount,
          reason: params.reason,
          issuedBy: params.issuedBy,
        })
      },

      addBonus: (workerId, params) => {
        if (params.amount <= 0) return
        const account = get().accounts[workerId] ?? get().ensureAccount(workerId, workerNameById(workerId))
        const entry: BonusEntry = {
          id: `bonus-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
            [workerId]: {
              ...account,
              bonuses: [entry, ...(account.bonuses ?? [])],
              updatedAt: new Date().toISOString(),
            },
          },
        })
        notifyPayrollBonus({
          workerId,
          amount: params.amount,
          reason: params.reason,
          issuedBy: params.issuedBy,
        })
      },

      addAccrualFromPaymentAct: (params) => {
        if (params.amount <= 0) return
        const account = get().ensureAccount(params.workerId, params.workerName, params.contractorId)
        if (account.accruals.some((a) => a.id === `pa-w-${params.paymentActId}`)) return
        const accrual: AccrualEntry = {
          id: `pa-w-${params.paymentActId}`,
          taskId: params.paymentActId,
          taskTitle: `Акт ${params.actNumber}`,
          objectId: params.objectId,
          objectName: params.objectName,
          amount: params.amount,
          payType: 'volume',
          acceptedAt: new Date().toISOString(),
        }
        set({
          accounts: {
            ...get().accounts,
            [params.workerId]: {
              ...account,
              accruals: [accrual, ...account.accruals],
              updatedAt: new Date().toISOString(),
            },
          },
        })
        const brigade = useBrigadeStore.getState().brigades.find((b) => b.leaderWorkerMemberId === params.workerId)
        if (brigade) {
          notifyBrigadePayroll({
            brigadeId: brigade.id,
            amount: params.amount,
            kind: 'accrual',
            taskTitle: `Акт ${params.actNumber}`,
          })
        }
      },

      getRecordsForWorker: (workerId) =>
        Object.values(get().records).filter((r) => r.workerId === workerId),

      getRecordsForContractor: (contractorId) =>
        Object.values(get().records).filter((r) => r.contractorId === contractorId),

      getRecordsForObject: (objectId) => {
        const tasks = useProjectWorkflowStore.getState().tasks
        return Object.values(get().records).filter((r) => tasks[r.taskId]?.objectId === objectId)
      },

      getAccountsForContractor: (contractorId) =>
        Object.values(get().accounts).filter((a) => a.contractorId === contractorId),

      getForemanAccounts: () =>
        Object.values(get().accounts).filter((a) => !a.contractorId),

      getTotalAccruedForObject: (objectId) => {
        let total = 0
        for (const account of Object.values(get().accounts)) {
          for (const acc of account.accruals) {
            if (acc.objectId === objectId) total += acc.amount
          }
        }
        return total
      },
    }),
    {
      name: STORAGE_KEYS.WORKER_PAYROLL,
      storage: createJSONStorage(() => createZustandStorage()),
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as {
          records?: Record<string, WorkerTaskPayroll & { payouts?: { amount: number; date: string; comment?: string; id: string; createdAt: string }[] }>
          accounts?: Record<string, WorkerAccount>
        }
        const accounts = state.accounts ?? {}
        const records = state.records ?? {}

        if (version < 2) {
        for (const [key, rec] of Object.entries(records)) {
          const legacy = rec as WorkerTaskPayroll & { payouts?: { amount: number; date: string; comment?: string; id: string; createdAt: string }[] }
          if (legacy.payouts?.length && legacy.workerId) {
            let account = accounts[legacy.workerId]
            if (!account) {
              account = defaultAccount(legacy.workerId, legacy.workerName, legacy.contractorId)
              accounts[legacy.workerId] = account
            }
            for (const p of legacy.payouts) {
              if (!account.advances.some((a) => a.id === p.id)) {
                account.advances.push({
                  id: p.id,
                  date: p.date,
                  amount: p.amount,
                  comment: p.comment,
                  kind: 'advance',
                  createdAt: p.createdAt,
                })
              }
            }
          }
          records[key] = {
            ...rec,
            isAccrued: rec.isAccrued ?? false,
          }
          delete (records[key] as { payouts?: unknown }).payouts
        }
        }

        for (const id of Object.keys(accounts)) {
          const a = accounts[id]
          accounts[id] = {
            ...a,
            fines: a.fines ?? [],
            bonuses: a.bonuses ?? [],
          }
        }

        return { ...state, records, accounts }
      },
    },
  ),
)
