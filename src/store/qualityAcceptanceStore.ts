import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { WorkType } from '@types'
import type {
  ChecklistItemResult,
  QualityChecklistItemDef,
  AcceptancePayload,
} from '@/types/qualityChecklist'
import { warrantyMonthsFor } from '@/types/qualityChecklist'

export interface AcceptanceAct {
  id: string
  objectId: string
  objectName?: string
  taskId: string
  subWorkId?: string
  workType: WorkType
  workLabel: string
  apartmentNumber: string
  acceptedAt: string
  acceptedBy: string
  acceptedByRole: 'foreman' | 'client'
  checklist: ChecklistItemResult[]
  generalRemark?: string
  photos: string[]
  clientApproved: boolean
  warrantyMonths: number
  warrantyUntil: string
}

export interface AcceptanceRemark {
  id: string
  objectId: string
  taskId: string
  subWorkId?: string
  workLabel: string
  text: string
  status: 'open' | 'resolved'
  authorName: string
  createdAt: string
  resolvedAt?: string
}

export interface WarrantyClaim {
  id: string
  actId: string
  objectId: string
  taskId: string
  workLabel: string
  description: string
  createdAt: string
  status: 'open' | 'in_progress' | 'resolved'
  resolvedAt?: string
}

interface CreateActParams {
  objectId: string
  objectName?: string
  taskId: string
  subWorkId?: string
  workType: WorkType
  workLabel: string
  apartmentNumber: string
  acceptedBy: string
  acceptedByRole: 'foreman' | 'client'
  payload: AcceptancePayload
  photos: string[]
}

interface QualityAcceptanceState {
  acts: AcceptanceAct[]
  remarks: AcceptanceRemark[]
  claims: WarrantyClaim[]
  /** Доп. пункты чек-листа: ключ objectId|workType */
  customChecklistItems: Record<string, QualityChecklistItemDef[]>

  createAct: (params: CreateActParams) => AcceptanceAct
  getAct: (actId: string) => AcceptanceAct | undefined
  getActsForObject: (objectId: string) => AcceptanceAct[]
  getActForTask: (taskId: string, subWorkId?: string) => AcceptanceAct | undefined

  addRemark: (params: Omit<AcceptanceRemark, 'id' | 'createdAt' | 'status'>) => void
  resolveRemark: (remarkId: string) => void
  getOpenRemarksForObject: (objectId: string) => AcceptanceRemark[]

  addCustomChecklistItem: (objectId: string, workType: WorkType, label: string) => void
  getExtraChecklistItems: (objectId: string, workType: WorkType) => QualityChecklistItemDef[]

  createWarrantyClaim: (params: {
    actId: string
    objectId: string
    taskId: string
    workLabel: string
    description: string
  }) => string
  resolveClaim: (claimId: string) => void
  getClaimsForObject: (objectId: string) => WarrantyClaim[]
  isUnderWarranty: (actId: string) => boolean
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function customKey(objectId: string, workType: WorkType): string {
  return `${objectId}|${workType}`
}

function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

export const useQualityAcceptanceStore = create<QualityAcceptanceState>()(
  persist(
    (set, get) => ({
      acts: [],
      remarks: [],
      claims: [],
      customChecklistItems: {},

      createAct: (params) => {
        const months = warrantyMonthsFor(params.workType)
        const acceptedAt = new Date().toISOString()
        const act: AcceptanceAct = {
          id: uid('act'),
          objectId: params.objectId,
          objectName: params.objectName,
          taskId: params.taskId,
          subWorkId: params.subWorkId,
          workType: params.workType,
          workLabel: params.workLabel,
          apartmentNumber: params.apartmentNumber,
          acceptedAt,
          acceptedBy: params.acceptedBy,
          acceptedByRole: params.acceptedByRole,
          checklist: params.payload.checklist,
          generalRemark: params.payload.generalRemark?.trim() || undefined,
          photos: params.photos,
          clientApproved: !!params.payload.clientApproved,
          warrantyMonths: months,
          warrantyUntil: addMonths(acceptedAt, months),
        }
        set({ acts: [act, ...get().acts] })

        const remarkTexts: string[] = []
        if (params.payload.generalRemark?.trim()) {
          remarkTexts.push(params.payload.generalRemark.trim())
        }
        for (const item of params.payload.checklist) {
          if (!item.checked && item.note?.trim()) {
            remarkTexts.push(`${item.label}: ${item.note.trim()}`)
          }
        }
        if (remarkTexts.length) {
          get().addRemark({
            objectId: params.objectId,
            taskId: params.taskId,
            subWorkId: params.subWorkId,
            workLabel: params.workLabel,
            text: remarkTexts.join('; '),
            authorName: params.acceptedBy,
          })
        }

        return act
      },

      getAct: (actId) => get().acts.find((a) => a.id === actId),

      getActsForObject: (objectId) =>
        get()
          .acts.filter((a) => a.objectId === objectId)
          .sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt)),

      getActForTask: (taskId, subWorkId) => {
        const matches = get().acts.filter(
          (a) => a.taskId === taskId && (subWorkId ? a.subWorkId === subWorkId : !a.subWorkId),
        )
        return matches.sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt))[0]
      },

      addRemark: (params) => {
        const remark: AcceptanceRemark = {
          ...params,
          id: uid('rm'),
          status: 'open',
          createdAt: new Date().toISOString(),
        }
        set({ remarks: [remark, ...get().remarks] })
      },

      resolveRemark: (remarkId) => {
        const now = new Date().toISOString()
        set({
          remarks: get().remarks.map((r) =>
            r.id === remarkId ? { ...r, status: 'resolved', resolvedAt: now } : r,
          ),
        })
      },

      getOpenRemarksForObject: (objectId) =>
        get()
          .remarks.filter((r) => r.objectId === objectId && r.status === 'open')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

      addCustomChecklistItem: (objectId, workType, label) => {
        const key = customKey(objectId, workType)
        const trimmed = label.trim()
        if (!trimmed) return
        const item: QualityChecklistItemDef = {
          id: `custom-${Date.now()}`,
          label: trimmed,
        }
        const current = get().customChecklistItems[key] ?? []
        set({
          customChecklistItems: {
            ...get().customChecklistItems,
            [key]: [...current, item],
          },
        })
      },

      getExtraChecklistItems: (objectId, workType) =>
        get().customChecklistItems[customKey(objectId, workType)] ?? [],

      createWarrantyClaim: (params) => {
        const act = get().getAct(params.actId)
        if (!act || !get().isUnderWarranty(params.actId)) return ''
        const claim: WarrantyClaim = {
          id: uid('wc'),
          actId: params.actId,
          objectId: params.objectId,
          taskId: params.taskId,
          workLabel: params.workLabel,
          description: params.description.trim(),
          createdAt: new Date().toISOString(),
          status: 'open',
        }
        if (!claim.description) return ''
        set({ claims: [claim, ...get().claims] })
        return claim.id
      },

      resolveClaim: (claimId) => {
        const now = new Date().toISOString()
        set({
          claims: get().claims.map((c) =>
            c.id === claimId ? { ...c, status: 'resolved', resolvedAt: now } : c,
          ),
        })
      },

      getClaimsForObject: (objectId) =>
        get()
          .claims.filter((c) => c.objectId === objectId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

      isUnderWarranty: (actId) => {
        const act = get().getAct(actId)
        if (!act) return false
        return act.warrantyUntil >= new Date().toISOString().slice(0, 10)
      },
    }),
    {
      name: STORAGE_KEYS.QUALITY_ACCEPTANCE,
      storage: createJSONStorage(() => createZustandStorage()),
    },
  ),
)
