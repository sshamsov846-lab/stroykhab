import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { TaskAuditEntry, AuditField } from '@/types/taskAudit'
import { AUDIT_FIELD_LABELS, isAuditImportant } from '@/types/taskAudit'
import { useUserStore } from '@store/userStore'
import { ROLE_LABELS } from '@store/userStore'

interface AuditLogState {
  entries: TaskAuditEntry[]
  addEntry: (entry: Omit<TaskAuditEntry, 'id' | 'createdAt' | 'userName' | 'userRole' | 'fieldLabel' | 'important'> & {
    fieldLabel?: string
    userName?: string
    userRole?: import('@store/userStore').AppRole
    important?: boolean
  }) => void
  getEntriesForTask: (taskId: string) => TaskAuditEntry[]
}

export const useAuditLogStore = create<AuditLogState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) => {
        const user = useUserStore.getState()
        const item: TaskAuditEntry = {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          taskId: entry.taskId,
          userName: entry.userName ?? (user.fullName || 'Система'),
          userRole: entry.userRole ?? user.role,
          field: entry.field,
          fieldLabel: entry.fieldLabel ?? AUDIT_FIELD_LABELS[entry.field],
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          createdAt: new Date().toISOString(),
          important: entry.important ?? isAuditImportant(entry.field),
        }
        set({ entries: [item, ...get().entries] })
      },

      getEntriesForTask: (taskId) =>
        get().entries.filter((e) => e.taskId === taskId).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    }),
    {
      name: STORAGE_KEYS.AUDIT_LOG,
      storage: createJSONStorage(() => createZustandStorage()),
    },
  ),
)

export function logTaskAudit(params: {
  taskId: string
  field: AuditField
  fieldLabel?: string
  oldValue: string
  newValue: string
  userName?: string
  userRole?: import('@store/userStore').AppRole
}): void {
  if (params.oldValue === params.newValue) return
  useAuditLogStore.getState().addEntry(params)
}

export function formatAuditRole(role: import('@store/userStore').AppRole): string {
  return ROLE_LABELS[role] || role
}
