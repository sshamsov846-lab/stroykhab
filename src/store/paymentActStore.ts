import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { TaskWorkCalculator } from '@/types/workCalculator'
import type {
  PaymentAct,
  PaymentActLineItem,
  PaymentActStatus,
  WorkerCompletionReport,
  WorkReportLineItem,
} from '@/types/paymentAct'
import type { WorkType } from '@types'
import { useObjectStore } from '@store/objectStore'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useBrigadeStore } from '@store/brigadeStore'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'
import { useForemanPayrollStore } from '@store/foremanPayrollStore'
import { resolveAssignedWorkerId, workerNameById } from '@utils/workerPayrollCalc'
import { resolveForemanForTask } from '@utils/foremanId'
import { lineItemFromReport, lineItemFromCalculatorLine, recalcActTotals, recalcLineItem } from '@utils/paymentActCalc'
import {
  notifyPaymentActPaid,
  notifyPaymentActReturned,
  notifyPaymentActToClient,
  notifyPaymentActToOrg,
  notifyWorkerReportSubmitted,
} from '@utils/paymentActNotifications'
import { getCurrentUserKey } from '@utils/notificationFilter'
import type { AppRole } from '@store/userStore'

interface PaymentActState {
  acts: PaymentAct[]

  getAct: (id: string) => PaymentAct | undefined
  getActsForObject: (objectId: string) => PaymentAct[]
  getActsForTask: (taskId: string) => PaymentAct[]
  getPendingForForeman: (foremanUserKey: string) => PaymentAct[]
  getPendingForOrg: (orgId: string) => PaymentAct[]
  getPendingForClient: (clientUserKey: string) => PaymentAct[]

  submitWorkerReport: (params: {
    taskId: string
    lineItems: WorkReportLineItem[]
    photos: string[]
    note?: string
    submittedBy: string
    submittedByUserKey: string
  }) => PaymentAct

  formAct: (actId: string, formedBy: string, lineItems?: PaymentActLineItem[]) => void
  updateLineItems: (actId: string, lineItems: PaymentActLineItem[]) => void
  addScanAttachment: (actId: string, dataUrl: string) => void
  sendToOrg: (actId: string) => { ok: boolean; reason?: string }
  forwardToClient: (actId: string, clientLineItems?: PaymentActLineItem[]) => { ok: boolean; reason?: string }
  returnAct: (actId: string, reason: string, returnedBy: 'client' | 'org' | 'foreman') => void
  approveAndPay: (actId: string) => { ok: boolean; reason?: string }
  createActFromCalculator: (
    calc: TaskWorkCalculator,
    formedBy: string,
  ) => { ok: boolean; actId?: string; reason?: string }
}

function actId(): string {
  return `pa-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function actNumber(existing: PaymentAct[]): string {
  const n = existing.length + 1
  return `АКТ-${String(n).padStart(4, '0')}`
}

function resolveParties(objectId: string, contractorId?: string) {
  const members = useObjectAccessStore.getState().getActiveMembers(objectId)
  const client = members.find((m) => m.role === 'client')
  const foreman = members.find((m) => m.role === 'foreman')
  const sub = members.find((m) => m.role === 'subcontractor')
  return {
    clientUserKey: client?.userKey,
    foremanUserKey: foreman?.userKey,
    orgId: contractorId || sub?.contractorId,
  }
}

function distributePayment(act: PaymentAct): void {
  if (act.isDistributed || !act.workerId) return

  const workerName = workerNameById(act.workerId)
  const { foremanId, foremanName } = resolveForemanForTask(act.orgId)

  useWorkerPayrollStore.getState().addAccrualFromPaymentAct({
    workerId: act.workerId,
    workerName,
    paymentActId: act.id,
    actNumber: act.actNumber,
    objectId: act.objectId,
    objectName: act.objectName,
    amount: act.workerTotal,
    contractorId: act.orgId,
  })

  useForemanPayrollStore.getState().addAccrualFromPaymentAct({
    foremanId,
    foremanName,
    paymentActId: act.id,
    actNumber: act.actNumber,
    objectId: act.objectId,
    objectName: act.objectName,
    amount: act.foremanTotal,
    workType: act.lineItems[0]?.workType ?? ('plaster' as WorkType),
  })

  usePaymentActStore.setState({
    acts: usePaymentActStore.getState().acts.map((a) =>
      a.id === act.id ? { ...a, isDistributed: true } : a,
    ),
  })
}

export const usePaymentActStore = create<PaymentActState>()(
  persist(
    (set, get) => ({
      acts: [],

      getAct: (id) => get().acts.find((a) => a.id === id),

      getActsForObject: (objectId) =>
        get().acts.filter((a) => a.objectId === objectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

      getActsForTask: (taskId) => get().acts.filter((a) => a.taskIds.includes(taskId)),

      getPendingForForeman: (foremanUserKey) =>
        get().acts.filter(
          (a) =>
            a.foremanUserKey === foremanUserKey
            && (a.status === 'worker_submitted' || a.status === 'act_draft' || a.status === 'returned'),
        ),

      getPendingForOrg: (orgId) =>
        get().acts.filter((a) => a.orgId === orgId && a.status === 'sent_to_org'),

      getPendingForClient: (clientUserKey) =>
        get().acts.filter((a) => a.clientUserKey === clientUserKey && a.status === 'sent_to_client'),

      submitWorkerReport: (params) => {
        const task = useProjectWorkflowStore.getState().tasks[params.taskId]
        if (!task) throw new Error('Задача не найдена')

        const obj = useObjectStore.getState().userObjects.find((o) => o.id === task.objectId)
        const brigadeId = useObjectStore.getState().brigadeTaskAssignments[params.taskId]
        const brigade = brigadeId ? useBrigadeStore.getState().getBrigade(brigadeId) : undefined
        const workerId = resolveAssignedWorkerId(params.taskId)
        const parties = resolveParties(task.objectId, task.contractorId)

        const report: WorkerCompletionReport = {
          submittedAt: new Date().toISOString(),
          submittedBy: params.submittedBy,
          submittedByUserKey: params.submittedByUserKey,
          lineItems: params.lineItems,
          photos: params.photos,
          note: params.note,
        }

        const lineItems = params.lineItems.map(lineItemFromReport)
        const totals = recalcActTotals(lineItems)
        const now = new Date().toISOString()

        const entry: PaymentAct = {
          id: actId(),
          actNumber: actNumber(get().acts),
          objectId: task.objectId,
          objectName: obj?.name ?? task.house,
          taskIds: [params.taskId],
          executorType: brigade ? 'brigade' : 'solo',
          executorName: brigade?.name ?? params.submittedBy,
          workerId,
          brigadeId,
          foremanUserKey: parties.foremanUserKey ?? getCurrentUserKey(),
          orgId: parties.orgId,
          clientUserKey: parties.clientUserKey,
          periodFrom: now.slice(0, 10),
          periodTo: now.slice(0, 10),
          status: 'worker_submitted',
          workerReport: report,
          lineItems,
          photos: params.photos,
          scanAttachments: [],
          ...totals,
          createdAt: now,
          updatedAt: now,
        }

        set({ acts: [entry, ...get().acts] })

        notifyWorkerReportSubmitted({
          objectId: task.objectId,
          objectName: entry.objectName,
          executorName: entry.executorName,
          foremanUserKey: entry.foremanUserKey ?? '',
          paymentActId: entry.id,
        })

        return entry
      },

      formAct: (actId, formedBy, lineItems) => {
        const act = get().getAct(actId)
        if (!act) return
        const items = (lineItems ?? act.lineItems).map(recalcLineItem)
        const totals = recalcActTotals(items)
        const now = new Date().toISOString()
        set({
          acts: get().acts.map((a) =>
            a.id === actId
              ? {
                  ...a,
                  ...totals,
                  lineItems: items,
                  photos: [...new Set([...a.photos, ...(a.workerReport?.photos ?? [])])],
                  status: 'act_draft' as PaymentActStatus,
                  formedAt: now,
                  formedBy,
                  updatedAt: now,
                }
              : a,
          ),
        })
      },

      updateLineItems: (actId, lineItems) => {
        const items = lineItems.map(recalcLineItem)
        const totals = recalcActTotals(items)
        set({
          acts: get().acts.map((a) =>
            a.id === actId ? { ...a, ...totals, lineItems: items, updatedAt: new Date().toISOString() } : a,
          ),
        })
      },

      addScanAttachment: (actId, dataUrl) => {
        set({
          acts: get().acts.map((a) =>
            a.id === actId
              ? { ...a, scanAttachments: [...a.scanAttachments, dataUrl], updatedAt: new Date().toISOString() }
              : a,
          ),
        })
      },

      sendToOrg: (actId) => {
        const act = get().getAct(actId)
        if (!act) return { ok: false, reason: 'Акт не найден' }
        if (!act.orgId) return { ok: false, reason: 'Организация не привязана к объекту' }
        const now = new Date().toISOString()
        set({
          acts: get().acts.map((a) =>
            a.id === actId ? { ...a, status: 'sent_to_org', sentToOrgAt: now, updatedAt: now } : a,
          ),
        })
        notifyPaymentActToOrg({
          objectId: act.objectId,
          objectName: act.objectName,
          amount: act.foremanTotal,
          orgId: act.orgId,
          paymentActId: actId,
        })
        return { ok: true }
      },

      forwardToClient: (actId, clientLineItems) => {
        const act = get().getAct(actId)
        if (!act) return { ok: false, reason: 'Акт не найден' }
        if (!act.clientUserKey) return { ok: false, reason: 'Заказчик не привязан к объекту' }
        const items = (clientLineItems ?? act.lineItems).map(recalcLineItem)
        const totals = recalcActTotals(items)
        const now = new Date().toISOString()
        set({
          acts: get().acts.map((a) =>
            a.id === actId
              ? {
                  ...a,
                  ...totals,
                  lineItems: items,
                  status: 'sent_to_client',
                  sentToClientAt: now,
                  updatedAt: now,
                }
              : a,
          ),
        })
        notifyPaymentActToClient({
          objectId: act.objectId,
          objectName: act.objectName,
          amount: totals.clientTotal,
          clientUserKey: act.clientUserKey,
          paymentActId: actId,
        })
        return { ok: true }
      },

      returnAct: (actId, reason, returnedBy) => {
        const act = get().getAct(actId)
        if (!act) return
        const now = new Date().toISOString()
        const targets: { keys: string[]; roles: AppRole[] } = {
          keys: [],
          roles: [],
        }
        if (returnedBy === 'client') {
          targets.keys = act.foremanUserKey ? [act.foremanUserKey] : []
          targets.roles = ['foreman', 'subcontractor']
        } else if (returnedBy === 'org') {
          targets.keys = act.foremanUserKey ? [act.foremanUserKey] : []
          targets.roles = ['foreman']
        } else {
          targets.keys = act.workerReport?.submittedByUserKey ? [act.workerReport.submittedByUserKey] : []
          targets.roles = ['worker']
        }
        set({
          acts: get().acts.map((a) =>
            a.id === actId
              ? { ...a, status: 'returned', returnReason: reason, returnedBy, updatedAt: now }
              : a,
          ),
        })
        notifyPaymentActReturned({
          objectId: act.objectId,
          objectName: act.objectName,
          reason,
          targetUserKeys: targets.keys,
          targetRoles: targets.roles,
        })
      },

      approveAndPay: (actId) => {
        const act = get().getAct(actId)
        if (!act) return { ok: false, reason: 'Акт не найден' }
        if (act.status !== 'sent_to_client') return { ok: false, reason: 'Акт не у заказчика' }
        const now = new Date().toISOString()
        const updated: PaymentAct = { ...act, status: 'paid', paidAt: now, updatedAt: now }
        set({
          acts: get().acts.map((a) => (a.id === actId ? updated : a)),
        })
        distributePayment(updated)
        const notifyKeys: string[] = []
        if (act.foremanUserKey) notifyKeys.push(act.foremanUserKey)
        if (act.workerReport?.submittedByUserKey) notifyKeys.push(act.workerReport.submittedByUserKey)
        notifyPaymentActPaid({
          objectId: act.objectId,
          objectName: act.objectName,
          amount: act.clientTotal,
          targetUserKeys: notifyKeys,
          targetRoles: ['foreman', 'worker', 'subcontractor'],
          workerId: act.workerId,
          brigadeId: act.brigadeId,
        })
        return { ok: true }
      },

      createActFromCalculator: (calc, formedBy) => {
        const task = useProjectWorkflowStore.getState().tasks[calc.taskId]
        if (!task) return { ok: false, reason: 'Задача не найдена' }

        const lineItems = calc.lines.map(lineItemFromCalculatorLine).map(recalcLineItem)
        const totals = recalcActTotals(lineItems)
        const now = new Date().toISOString()
        const parties = resolveParties(task.objectId, task.contractorId)
        const existing = get().getActsForTask(calc.taskId)[0]

        if (existing) {
          set({
            acts: get().acts.map((a) =>
              a.id === existing.id
                ? {
                    ...a,
                    ...totals,
                    lineItems,
                    status: 'act_draft' as PaymentActStatus,
                    formedAt: now,
                    formedBy,
                    updatedAt: now,
                  }
                : a,
            ),
          })
          return { ok: true, actId: existing.id }
        }

        const entry: PaymentAct = {
          id: actId(),
          actNumber: actNumber(get().acts),
          objectId: calc.objectId,
          objectName: calc.objectName,
          taskIds: [calc.taskId],
          executorType: 'solo',
          executorName: calc.workerName,
          workerId: calc.workerId,
          foremanUserKey: parties.foremanUserKey ?? getCurrentUserKey(),
          orgId: parties.orgId,
          clientUserKey: parties.clientUserKey,
          periodFrom: now.slice(0, 10),
          periodTo: now.slice(0, 10),
          status: 'act_draft',
          lineItems,
          photos: calc.attachments.filter((a) => a.mimeType.startsWith('image/')).map((a) => a.fileUrl),
          scanAttachments: [],
          ...totals,
          formedAt: now,
          formedBy,
          createdAt: now,
          updatedAt: now,
        }

        set({ acts: [entry, ...get().acts] })
        return { ok: true, actId: entry.id }
      },
    }),
    {
      name: STORAGE_KEYS.PAYMENT_ACTS,
      storage: createJSONStorage(() => createZustandStorage()),
      version: 1,
    },
  ),
)
