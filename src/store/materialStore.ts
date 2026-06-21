import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type {
  WorkflowMaterialRequest,
  StockItem,
  StockWriteOff,
  MaterialWaitState,
  MaterialPaymentPayer,
  MaterialUrgency,
  ObjectMaterialPaymentSettings,
  MaterialSpendSummary,
} from '@/types/materials'
import { URGENCY_LABELS } from '@/types/materials'
import {
  notifyMaterialDelivered,
  notifyMaterialOrdered,
  notifyMaterialReimbursementApproved,
  notifyMaterialReimbursementRequest,
  notifyMaterialRequest,
} from '@utils/materialNotifications'
import { useAttendanceStore } from '@store/attendanceStore'
import {
  DEFAULT_OBJECT_MATERIAL_SETTINGS,
  effectivePaymentPayer,
  needsReimbursement,
  reimbursementSourceFor,
  resolveRequestPaymentPayer,
} from '@utils/materialPayment'

interface CreateRequestParams {
  objectId: string
  taskId: string
  taskTitle: string
  name: string
  quantity: number
  unit: string
  urgency: MaterialUrgency
  requestedBy: string
  requestedByWorkerId?: string
  paymentPayer?: MaterialPaymentPayer
}

interface DeliveryParams {
  deliveredBy: string
  deliveredQuantity: number
  deliveredAt: string
  price: number
  purchasedByPayer: MaterialPaymentPayer
  paymentPayer?: MaterialPaymentPayer
  purchasedBy?: string
  purchaseDate?: string
  receiptPhotoUrl?: string
}

interface MaterialStoreState {
  requests: WorkflowMaterialRequest[]
  stock: StockItem[]
  writeOffs: StockWriteOff[]
  waits: MaterialWaitState[]
  objectPaymentSettings: Record<string, ObjectMaterialPaymentSettings>

  setObjectPaymentSettings: (
    objectId: string,
    patch: Partial<Pick<ObjectMaterialPaymentSettings, 'policy' | 'reimbursementSource'>>,
    updatedBy?: string,
  ) => void
  getObjectPaymentSettings: (objectId: string) => ObjectMaterialPaymentSettings

  createRequest: (params: CreateRequestParams) => string
  markOrdered: (requestId: string) => void
  markDelivered: (requestId: string, delivery: DeliveryParams) => void
  cancelRequest: (requestId: string) => void
  updateRequestPaymentPayer: (requestId: string, paymentPayer: MaterialPaymentPayer) => void

  approveReimbursement: (requestId: string, approvedBy: string) => void
  rejectReimbursement: (requestId: string, rejectedBy: string, reason?: string) => void

  writeOff: (params: {
    stockItemId: string
    objectId: string
    quantity: number
    writtenBy: string
    taskId?: string
    note?: string
  }) => boolean

  startMaterialWait: (params: {
    taskId: string
    objectId: string
    taskTitle: string
    workerName: string
    requestId?: string
  }) => void
  endMaterialWait: (taskId: string) => void

  getRequestsByObject: (objectId: string) => WorkflowMaterialRequest[]
  getRequestsByTask: (taskId: string) => WorkflowMaterialRequest[]
  getStockByObject: (objectId: string) => StockItem[]
  getActiveWaitForTask: (taskId: string) => MaterialWaitState | undefined
  getActiveWaits: () => MaterialWaitState[]
  getDowntimeMs: (taskId: string) => number

  getMaterialSpendByObject: (objectId: string, payer?: MaterialPaymentPayer) => number
  getTotalMaterialSpend: (payer?: MaterialPaymentPayer) => number
  getObjectSpendSummary: (objectId: string) => MaterialSpendSummary
  getPendingReimbursements: (objectId?: string, from?: 'client' | 'organization') => WorkflowMaterialRequest[]
  getForemanReimbursementBalance: (foremanName: string, objectId?: string) => {
    purchased: number
    pending: number
    reimbursed: number
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function deliveredRequests(requests: WorkflowMaterialRequest[], objectId?: string) {
  return requests.filter(
    (r) =>
      r.status === 'delivered' &&
      r.price != null &&
      (objectId ? r.objectId === objectId : true),
  )
}

function payerMatches(req: WorkflowMaterialRequest, payer: MaterialPaymentPayer): boolean {
  return effectivePaymentPayer(req) === payer
}

export const useMaterialStore = create<MaterialStoreState>()(
  persist(
    (set, get) => ({
      requests: [],
      stock: [],
      writeOffs: [],
      waits: [],
      objectPaymentSettings: {},

      setObjectPaymentSettings: (objectId, patch, updatedBy) => {
        const prev = get().objectPaymentSettings[objectId] ?? { ...DEFAULT_OBJECT_MATERIAL_SETTINGS }
        set((s) => ({
          objectPaymentSettings: {
            ...s.objectPaymentSettings,
            [objectId]: {
              ...prev,
              ...patch,
              updatedAt: new Date().toISOString(),
              updatedBy,
            },
          },
        }))
      },

      getObjectPaymentSettings: (objectId) =>
        get().objectPaymentSettings[objectId] ?? { ...DEFAULT_OBJECT_MATERIAL_SETTINGS },

      createRequest: (params) => {
        const id = uid('mr')
        const settings = get().getObjectPaymentSettings(params.objectId)
        const paymentPayer = resolveRequestPaymentPayer(settings, params.paymentPayer)
        const req: WorkflowMaterialRequest = {
          id,
          objectId: params.objectId,
          taskId: params.taskId,
          taskTitle: params.taskTitle,
          name: params.name.trim(),
          quantity: params.quantity,
          unit: params.unit,
          urgency: params.urgency,
          status: 'pending',
          requestedBy: params.requestedBy,
          requestedByWorkerId: params.requestedByWorkerId,
          createdAt: new Date().toISOString(),
          paymentPayer,
        }
        set((s) => ({ requests: [req, ...s.requests] }))
        notifyMaterialRequest({
          objectId: params.objectId,
          taskId: params.taskId,
          materialName: req.name,
          workerName: params.requestedBy,
          urgency: URGENCY_LABELS[params.urgency],
        })
        return id
      },

      markOrdered: (requestId) => {
        const req = get().requests.find((r) => r.id === requestId)
        if (!req || req.status !== 'pending') return
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === requestId
              ? { ...r, status: 'ordered' as const, orderedAt: new Date().toISOString() }
              : r,
          ),
        }))
        notifyMaterialOrdered({
          objectId: req.objectId,
          taskId: req.taskId,
          materialName: req.name,
          targetWorkerId: req.requestedByWorkerId,
        })
      },

      markDelivered: (requestId, delivery) => {
        const req = get().requests.find((r) => r.id === requestId)
        if (!req || req.status === 'delivered' || req.status === 'cancelled') return

        const settings = get().getObjectPaymentSettings(req.objectId)
        const paymentPayer =
          delivery.paymentPayer
          ?? req.paymentPayer
          ?? resolveRequestPaymentPayer(settings, undefined)

        if (!paymentPayer) return

        const purchasedByPayer = delivery.purchasedByPayer
        const purchasedBy = delivery.purchasedBy?.trim() || delivery.deliveredBy

        let reimbursement = req.reimbursement
        if (needsReimbursement(paymentPayer, purchasedByPayer)) {
          const reimburseFrom = reimbursementSourceFor(settings, paymentPayer)
          reimbursement = {
            status: 'pending',
            requestedAt: new Date().toISOString(),
            requestedBy: delivery.deliveredBy,
            reimburseFrom,
            amount: delivery.price,
          }
          notifyMaterialReimbursementRequest({
            objectId: req.objectId,
            taskId: req.taskId,
            materialName: req.name,
            amount: delivery.price,
            reimburseFrom,
            foremanName: purchasedBy,
          })
        } else if (
          settings.policy === 'foreman_receipts'
          && purchasedByPayer === 'foreman'
        ) {
          const reimburseFrom = settings.reimbursementSource ?? 'client'
          reimbursement = {
            status: 'pending',
            requestedAt: new Date().toISOString(),
            requestedBy: delivery.deliveredBy,
            reimburseFrom,
            amount: delivery.price,
          }
          notifyMaterialReimbursementRequest({
            objectId: req.objectId,
            taskId: req.taskId,
            materialName: req.name,
            amount: delivery.price,
            reimburseFrom,
            foremanName: purchasedBy,
          })
        }

        const qty = delivery.deliveredQuantity
        const stock = [...get().stock]
        const existing = stock.find(
          (s) => s.objectId === req.objectId && s.name === req.name && s.unit === req.unit,
        )
        if (existing) {
          existing.quantity += qty
          existing.updatedAt = new Date().toISOString()
        } else {
          stock.push({
            id: uid('st'),
            objectId: req.objectId,
            name: req.name,
            unit: req.unit,
            quantity: qty,
            updatedAt: new Date().toISOString(),
          })
        }

        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status: 'delivered' as const,
                  deliveredAt: delivery.deliveredAt,
                  deliveredBy: delivery.deliveredBy,
                  deliveredQuantity: qty,
                  price: delivery.price,
                  paymentPayer,
                  paidBy: paymentPayer,
                  purchasedBy,
                  purchasedByPayer,
                  purchaseDate: delivery.purchaseDate ?? delivery.deliveredAt,
                  receiptPhotoUrl: delivery.receiptPhotoUrl,
                  reimbursement,
                  orderedAt: r.orderedAt ?? new Date().toISOString(),
                }
              : r,
          ),
          stock,
        }))

        get().endMaterialWait(req.taskId)

        notifyMaterialDelivered({
          objectId: req.objectId,
          taskId: req.taskId,
          materialName: req.name,
          targetWorkerId: req.requestedByWorkerId,
        })
      },

      cancelRequest: (requestId) => {
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === requestId ? { ...r, status: 'cancelled' as const } : r,
          ),
        }))
      },

      updateRequestPaymentPayer: (requestId, paymentPayer) => {
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === requestId ? { ...r, paymentPayer, paidBy: paymentPayer } : r,
          ),
        }))
      },

      approveReimbursement: (requestId, approvedBy) => {
        const req = get().requests.find((r) => r.id === requestId)
        if (!req?.reimbursement || req.reimbursement.status !== 'pending') return
        const now = new Date().toISOString()
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === requestId && r.reimbursement
              ? {
                  ...r,
                  reimbursement: {
                    ...r.reimbursement,
                    status: 'approved' as const,
                    approvedAt: now,
                    approvedBy,
                  },
                }
              : r,
          ),
        }))
        notifyMaterialReimbursementApproved({
          objectId: req.objectId,
          taskId: req.taskId,
          materialName: req.name,
          amount: req.reimbursement.amount,
          foremanName: req.purchasedBy ?? req.deliveredBy ?? '',
        })
      },

      rejectReimbursement: (requestId, rejectedBy, reason) => {
        const req = get().requests.find((r) => r.id === requestId)
        if (!req?.reimbursement || req.reimbursement.status !== 'pending') return
        const now = new Date().toISOString()
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === requestId && r.reimbursement
              ? {
                  ...r,
                  reimbursement: {
                    ...r.reimbursement,
                    status: 'rejected' as const,
                    rejectedAt: now,
                    rejectedBy,
                    rejectionReason: reason,
                  },
                }
              : r,
          ),
        }))
      },

      writeOff: (params) => {
        const item = get().stock.find((s) => s.id === params.stockItemId)
        if (!item || item.quantity < params.quantity) return false
        const writeOff: StockWriteOff = {
          id: uid('wo'),
          objectId: params.objectId,
          stockItemId: params.stockItemId,
          stockName: item.name,
          taskId: params.taskId,
          quantity: params.quantity,
          writtenBy: params.writtenBy,
          createdAt: new Date().toISOString(),
          note: params.note,
        }
        set((s) => ({
          writeOffs: [writeOff, ...s.writeOffs],
          stock: s.stock.map((st) =>
            st.id === params.stockItemId
              ? { ...st, quantity: st.quantity - params.quantity, updatedAt: new Date().toISOString() }
              : st,
          ),
        }))
        return true
      },

      startMaterialWait: (params) => {
        const active = get().getActiveWaitForTask(params.taskId)
        if (active) return
        const wait: MaterialWaitState = {
          id: uid('mw'),
          taskId: params.taskId,
          objectId: params.objectId,
          taskTitle: params.taskTitle,
          requestId: params.requestId,
          workerName: params.workerName,
          since: new Date().toISOString(),
        }
        set((s) => ({ waits: [wait, ...s.waits] }))
      },

      endMaterialWait: (taskId) => {
        const now = new Date().toISOString()
        set((s) => ({
          waits: s.waits.map((w) =>
            w.taskId === taskId && !w.endedAt ? { ...w, endedAt: now } : w,
          ),
        }))
        useAttendanceStore.getState().endDowntime(taskId)
      },

      getRequestsByObject: (objectId) =>
        get().requests.filter((r) => r.objectId === objectId),

      getRequestsByTask: (taskId) =>
        get().requests.filter((r) => r.taskId === taskId),

      getStockByObject: (objectId) =>
        get().stock.filter((s) => s.objectId === objectId && s.quantity > 0),

      getActiveWaitForTask: (taskId) =>
        get().waits.find((w) => w.taskId === taskId && !w.endedAt),

      getActiveWaits: () => get().waits.filter((w) => !w.endedAt),

      getDowntimeMs: (taskId) => {
        const now = Date.now()
        return get().waits
          .filter((w) => w.taskId === taskId)
          .reduce((sum, w) => {
            const end = w.endedAt ? new Date(w.endedAt).getTime() : now
            return sum + (end - new Date(w.since).getTime())
          }, 0)
      },

      getMaterialSpendByObject: (objectId, payer) => {
        return deliveredRequests(get().requests, objectId)
          .filter((r) => (payer ? payerMatches(r, payer) : true))
          .reduce((sum, r) => sum + (r.price ?? 0), 0)
      },

      getTotalMaterialSpend: (payer) => {
        return deliveredRequests(get().requests)
          .filter((r) => (payer ? payerMatches(r, payer) : true))
          .reduce((sum, r) => sum + (r.price ?? 0), 0)
      },

      getObjectSpendSummary: (objectId) => {
        const list = deliveredRequests(get().requests, objectId)
        const byPayer: Record<MaterialPaymentPayer, number> = {
          client: 0,
          organization: 0,
          foreman: 0,
        }
        let pendingReimbursement = 0
        let approvedReimbursement = 0
        let foremanPurchased = 0

        for (const r of list) {
          const payer = effectivePaymentPayer(r)
          if (payer) byPayer[payer] += r.price ?? 0
          if (r.purchasedByPayer === 'foreman') foremanPurchased += r.price ?? 0
          if (r.reimbursement?.status === 'pending') pendingReimbursement += r.reimbursement.amount
          if (r.reimbursement?.status === 'approved') approvedReimbursement += r.reimbursement.amount
        }

        return {
          totalDelivered: list.reduce((s, r) => s + (r.price ?? 0), 0),
          byPayer,
          pendingReimbursement,
          approvedReimbursement,
          foremanPurchased,
        }
      },

      getPendingReimbursements: (objectId, from) => {
        return get().requests.filter(
          (r) =>
            r.reimbursement?.status === 'pending' &&
            (objectId ? r.objectId === objectId : true) &&
            (from ? r.reimbursement.reimburseFrom === from : true),
        )
      },

      getForemanReimbursementBalance: (foremanName, objectId) => {
        const q = foremanName.toLowerCase()
        const list = get().requests.filter(
          (r) =>
            r.status === 'delivered' &&
            r.purchasedByPayer === 'foreman' &&
            (r.purchasedBy?.toLowerCase().includes(q) || r.deliveredBy?.toLowerCase().includes(q)) &&
            (objectId ? r.objectId === objectId : true),
        )
        return {
          purchased: list.reduce((s, r) => s + (r.price ?? 0), 0),
          pending: list
            .filter((r) => r.reimbursement?.status === 'pending')
            .reduce((s, r) => s + (r.reimbursement?.amount ?? 0), 0),
          reimbursed: list
            .filter((r) => r.reimbursement?.status === 'approved')
            .reduce((s, r) => s + (r.reimbursement?.amount ?? 0), 0),
        }
      },
    }),
    {
      name: STORAGE_KEYS.MATERIALS,
      storage: createJSONStorage(() => createZustandStorage()),
    },
  ),
)
