import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type {
  CalculatorAttachment,
  CalculatorCatalogItem,
  CalculatorLine,
  CalculatorStatus,
  TaskWorkCalculator,
  WorkerCalculatorRates,
} from '@/types/workCalculator'
import type { SpecializationId } from '@/constants/specializations'
import { catalogForSpecializations, catalogForSpec, fullCalculatorCatalog } from '@/constants/calculatorCatalog'
import { computeGrandTotal, normalizeLine } from '@utils/calculatorTotals'
import { buildCalculatorMeta, resolveWorkerUserKey } from '@utils/calculatorMeta'
import { useObjectAccessStore } from '@store/objectAccessStore'
import {
  notifyCalculatorAccepted,
  notifyCalculatorReturned,
  notifyCalculatorSubmitted,
} from '@utils/workCalculatorNotifications'
import { usePaymentActStore } from '@store/paymentActStore'

interface WorkCalculatorState {
  calculators: TaskWorkCalculator[]
  archive: TaskWorkCalculator[]
  customCatalogItems: CalculatorCatalogItem[]
  workerRates: WorkerCalculatorRates[]

  getCalculator: (id: string) => TaskWorkCalculator | undefined
  getCalculatorByTask: (taskId: string, workerId: string) => TaskWorkCalculator | undefined
  getCalculatorsForTask: (taskId: string) => TaskWorkCalculator[]
  getCalculatorsForWorker: (workerId: string) => TaskWorkCalculator[]
  getReportsForForeman: (foremanUserKey: string) => TaskWorkCalculator[]
  getCatalog: (specIds: SpecializationId[]) => CalculatorCatalogItem[]
  getFullCatalog: () => CalculatorCatalogItem[]
  getCatalogBySpec: (specId: SpecializationId | 'all') => CalculatorCatalogItem[]
  getPersonalRate: (workerId: string, item: CalculatorCatalogItem) => number
  importPersonalRates: (
    workerId: string,
    rows: { label: string; rate: number; catalogItemId?: string }[],
  ) => number

  getOrCreateCalculator: (params: {
    taskId: string
    objectId: string
    workerId: string
    workerName: string
  }) => TaskWorkCalculator

  updateLines: (taskId: string, workerId: string, lines: CalculatorLine[]) => void
  addAttachment: (
    taskId: string,
    workerId: string,
    attachment: Omit<CalculatorAttachment, 'id' | 'uploadedAt'>,
  ) => void
  removeAttachment: (taskId: string, workerId: string, attachmentId: string) => void
  addCustomCatalogItem: (item: Omit<CalculatorCatalogItem, 'id' | 'isCustom'>) => CalculatorCatalogItem
  submitCalculator: (taskId: string, workerId: string) => { ok: boolean; reason?: string }
  acceptCalculator: (calculatorId: string, foremanUserKey: string) => { ok: boolean; reason?: string }
  returnCalculator: (
    calculatorId: string,
    reason: string,
    foremanUserKey: string,
  ) => { ok: boolean; reason?: string }
  useCalculatorForAct: (calculatorId: string, foremanName: string) => { ok: boolean; actId?: string; reason?: string }
}

function calcId(): string {
  return `wc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function catalogId(): string {
  return `cc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function attachmentId(): string {
  return `ca-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function isLockedStatus(status: CalculatorStatus): boolean {
  return status === 'submitted' || status === 'accepted' || status === 'returned'
}

function recalcCalculator(calc: TaskWorkCalculator, lines: CalculatorLine[]): TaskWorkCalculator {
  const normalized = lines.map((l) => normalizeLine(l))
  const now = new Date().toISOString()
  return {
    ...calc,
    lines: normalized,
    grandTotal: computeGrandTotal(normalized),
    updatedAt: now,
    archivedAt: now,
    status: isLockedStatus(calc.status) ? 'draft' : calc.status,
    submittedAt: isLockedStatus(calc.status) ? undefined : calc.submittedAt,
    acceptedAt: isLockedStatus(calc.status) ? undefined : calc.acceptedAt,
    returnReason: isLockedStatus(calc.status) ? undefined : calc.returnReason,
  }
}

function upsertArchive(archive: TaskWorkCalculator[], calc: TaskWorkCalculator): TaskWorkCalculator[] {
  const idx = archive.findIndex((a) => a.id === calc.id)
  if (idx >= 0) {
    const next = [...archive]
    next[idx] = calc
    return next
  }
  return [calc, ...archive]
}

function patchCalculator(
  get: () => WorkCalculatorState,
  set: (partial: Partial<WorkCalculatorState> | ((s: WorkCalculatorState) => Partial<WorkCalculatorState>)) => void,
  id: string,
  patch: Partial<TaskWorkCalculator>,
) {
  const calc = get().calculators.find((c) => c.id === id)
  if (!calc) return
  const updated = { ...calc, ...patch, updatedAt: new Date().toISOString(), archivedAt: new Date().toISOString() }
  set({
    calculators: get().calculators.map((c) => (c.id === id ? updated : c)),
    archive: upsertArchive(get().archive, updated),
  })
}

function foremanOwnsObject(foremanUserKey: string, objectId: string): boolean {
  return useObjectAccessStore
    .getState()
    .getActiveMembers(objectId)
    .some((m) => m.role === 'foreman' && m.userKey === foremanUserKey)
}

export const useWorkCalculatorStore = create<WorkCalculatorState>()(
  persist(
    (set, get) => ({
      calculators: [],
      archive: [],
      customCatalogItems: [],
      workerRates: [],

      getCalculator: (id) => get().calculators.find((c) => c.id === id) ?? get().archive.find((c) => c.id === id),

      getCalculatorByTask: (taskId, workerId) =>
        get().calculators.find((c) => c.taskId === taskId && c.workerId === workerId),

      getCalculatorsForTask: (taskId) =>
        get()
          .calculators.filter((c) => c.taskId === taskId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

      getCalculatorsForWorker: (workerId) =>
        get()
          .archive.filter((c) => c.workerId === workerId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

      getReportsForForeman: (foremanUserKey) =>
        get()
          .archive.filter(
            (c) => c.status !== 'draft' && foremanOwnsObject(foremanUserKey, c.objectId),
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

      getCatalog: (specIds) => catalogForSpecializations(specIds, get().customCatalogItems),

      getFullCatalog: () => fullCalculatorCatalog(get().customCatalogItems),

      getCatalogBySpec: (specId) => catalogForSpec(specId, get().customCatalogItems),

      getPersonalRate: (workerId, item) => {
        const profile = get().workerRates.find((w) => w.workerId === workerId)
        if (!profile) return 0
        if (profile.ratesByCatalogId[item.id]) return profile.ratesByCatalogId[item.id]
        const norm = item.label.trim().toLowerCase()
        for (const [label, rate] of Object.entries(profile.ratesByLabel)) {
          if (label.trim().toLowerCase() === norm) return rate
        }
        return 0
      },

      importPersonalRates: (workerId, rows) => {
        const existing = get().workerRates.find((w) => w.workerId === workerId)
        const ratesByCatalogId = { ...(existing?.ratesByCatalogId ?? {}) }
        const ratesByLabel = { ...(existing?.ratesByLabel ?? {}) }
        for (const row of rows) {
          if (row.catalogItemId) ratesByCatalogId[row.catalogItemId] = row.rate
          ratesByLabel[row.label] = row.rate
        }
        const profile: WorkerCalculatorRates = {
          workerId,
          ratesByCatalogId,
          ratesByLabel,
          updatedAt: new Date().toISOString(),
        }
        set({
          workerRates: [
            ...get().workerRates.filter((w) => w.workerId !== workerId),
            profile,
          ],
        })
        return rows.length
      },

      getOrCreateCalculator: ({ taskId, objectId, workerId, workerName }) => {
        const existing = get().getCalculatorByTask(taskId, workerId)
        if (existing) return existing
        const now = new Date().toISOString()
        const meta = buildCalculatorMeta({ taskId, objectId, workerId, workerName })
        const calc: TaskWorkCalculator = {
          id: calcId(),
          taskId,
          objectId,
          workerId,
          workerName,
          ...meta,
          lines: [],
          attachments: [],
          grandTotal: 0,
          status: 'draft',
          archivedAt: now,
          createdAt: now,
          updatedAt: now,
        }
        set({
          calculators: [...get().calculators, calc],
          archive: upsertArchive(get().archive, calc),
        })
        return calc
      },

      updateLines: (taskId, workerId, lines) => {
        const calculators = get().calculators.map((c) => {
          if (c.taskId !== taskId || c.workerId !== workerId) return c
          const meta = buildCalculatorMeta({ taskId, objectId: c.objectId, workerId, workerName: c.workerName })
          return { ...recalcCalculator({ ...c, ...meta }, lines) }
        })
        const updated = calculators.find((c) => c.taskId === taskId && c.workerId === workerId)
        set({
          calculators,
          archive: updated ? upsertArchive(get().archive, updated) : get().archive,
        })
      },

      addAttachment: (taskId, workerId, attachment) => {
        const att: CalculatorAttachment = {
          ...attachment,
          id: attachmentId(),
          uploadedAt: new Date().toISOString(),
        }
        const calculators = get().calculators.map((c) =>
          c.taskId === taskId && c.workerId === workerId
            ? { ...c, attachments: [...c.attachments, att], updatedAt: new Date().toISOString(), archivedAt: new Date().toISOString() }
            : c,
        )
        const updated = calculators.find((c) => c.taskId === taskId && c.workerId === workerId)
        set({
          calculators,
          archive: updated ? upsertArchive(get().archive, updated) : get().archive,
        })
      },

      removeAttachment: (taskId, workerId, attachmentIdVal) => {
        const calculators = get().calculators.map((c) =>
          c.taskId === taskId && c.workerId === workerId
            ? {
                ...c,
                attachments: c.attachments.filter((a) => a.id !== attachmentIdVal),
                updatedAt: new Date().toISOString(),
                archivedAt: new Date().toISOString(),
              }
            : c,
        )
        const updated = calculators.find((c) => c.taskId === taskId && c.workerId === workerId)
        set({
          calculators,
          archive: updated ? upsertArchive(get().archive, updated) : get().archive,
        })
      },

      addCustomCatalogItem: (item) => {
        const created: CalculatorCatalogItem = { ...item, id: catalogId(), isCustom: true }
        set({ customCatalogItems: [...get().customCatalogItems, created] })
        return created
      },

      submitCalculator: (taskId, workerId) => {
        const calc = get().getCalculatorByTask(taskId, workerId)
        if (!calc) return { ok: false, reason: 'Калькулятор не найден' }
        if (!calc.lines.length) return { ok: false, reason: 'Добавьте хотя бы одну позицию' }
        if (calc.lines.every((l) => l.quantity <= 0)) return { ok: false, reason: 'Укажите количество' }

        const now = new Date().toISOString()
        const meta = buildCalculatorMeta({ taskId, objectId: calc.objectId, workerId, workerName: calc.workerName })
        const updated: TaskWorkCalculator = {
          ...calc,
          ...meta,
          status: 'submitted',
          submittedAt: now,
          updatedAt: now,
          archivedAt: now,
          returnReason: undefined,
          acceptedAt: undefined,
        }
        set({
          calculators: get().calculators.map((c) => (c.id === calc.id ? updated : c)),
          archive: upsertArchive(get().archive, updated),
        })

        const foreman = useObjectAccessStore
          .getState()
          .getActiveMembers(calc.objectId)
          .find((m) => m.role === 'foreman')
        if (foreman?.userKey) {
          notifyCalculatorSubmitted({
            taskId,
            objectId: calc.objectId,
            objectName: updated.objectName,
            workerName: calc.workerName,
            foremanUserKey: foreman.userKey,
            grandTotal: updated.grandTotal,
            calculatorId: calc.id,
          })
        }

        return { ok: true }
      },

      acceptCalculator: (calculatorId, foremanUserKey) => {
        const calc = get().getCalculator(calculatorId)
        if (!calc) return { ok: false, reason: 'Расчёт не найден' }
        if (!foremanOwnsObject(foremanUserKey, calc.objectId)) return { ok: false, reason: 'Нет доступа' }
        if (calc.status !== 'submitted' && calc.status !== 'returned') {
          return { ok: false, reason: 'Можно принять только отправленный отчёт' }
        }

        const now = new Date().toISOString()
        patchCalculator(get, set, calculatorId, {
          status: 'accepted',
          acceptedAt: now,
          returnReason: undefined,
        })

        const workerKey = resolveWorkerUserKey(calc.workerId)
        if (workerKey) {
          notifyCalculatorAccepted({
            taskId: calc.taskId,
            objectId: calc.objectId,
            objectName: calc.objectName,
            workerUserKey: workerKey,
            grandTotal: calc.grandTotal,
          })
        }

        return { ok: true }
      },

      returnCalculator: (calculatorId, reason, foremanUserKey) => {
        const calc = get().getCalculator(calculatorId)
        if (!calc) return { ok: false, reason: 'Расчёт не найден' }
        if (!foremanOwnsObject(foremanUserKey, calc.objectId)) return { ok: false, reason: 'Нет доступа' }
        if (!reason.trim()) return { ok: false, reason: 'Укажите причину возврата' }

        patchCalculator(get, set, calculatorId, {
          status: 'returned',
          returnReason: reason.trim(),
        })

        const workerKey = resolveWorkerUserKey(calc.workerId)
        if (workerKey) {
          notifyCalculatorReturned({
            taskId: calc.taskId,
            objectId: calc.objectId,
            objectName: calc.objectName,
            workerUserKey: workerKey,
            reason: reason.trim(),
          })
        }

        return { ok: true }
      },

      useCalculatorForAct: (calculatorId, foremanName) => {
        const calc = get().getCalculator(calculatorId)
        if (!calc) return { ok: false, reason: 'Расчёт не найден' }
        if (!calc.lines.length) return { ok: false, reason: 'Нет позиций' }

        const result = usePaymentActStore.getState().createActFromCalculator(calc, foremanName)
        if (!result.ok || !result.actId) return result

        patchCalculator(get, set, calculatorId, {
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
          paymentActId: result.actId,
        })

        return result
      },
    }),
    {
      name: STORAGE_KEYS.WORK_CALCULATOR,
      storage: createJSONStorage(() => createZustandStorage()),
      version: 3,
      migrate: (persisted: unknown) => {
        const state = persisted as WorkCalculatorState
        if (!state.archive) state.archive = state.calculators ?? []
        if (!state.workerRates) state.workerRates = []
        for (const calc of [...(state.calculators ?? []), ...(state.archive ?? [])]) {
          calc.objectName = calc.objectName ?? 'Объект'
          calc.zoneLabel = calc.zoneLabel ?? '—'
          calc.specializationLabel = calc.specializationLabel ?? '—'
          calc.workerCode = calc.workerCode ?? ''
          calc.archivedAt = calc.archivedAt ?? calc.updatedAt ?? new Date().toISOString()
          for (const line of calc.lines ?? []) {
            line.specializationId = line.specializationId ?? 'universal'
          }
        }
        state.archive = state.archive ?? []
        return state
      },
    },
  ),
)
