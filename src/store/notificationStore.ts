import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { AppRole } from '@store/userStore'
import { getCurrentUserKey, filterNotificationsForUser, isReadForUser } from '@utils/notificationFilter'

export type NotificationType =
  | 'task_assigned'
  | 'contractor_assigned'
  | 'task_review'
  | 'task_accepted'
  | 'task_rejected'
  | 'blueprint_changed'
  | 'chat_message'
  | 'question'
  | 'approval'
  | 'photo'
  | 'payment'
  | 'material_request'
  | 'material_ordered'
  | 'material_delivered'
  | 'document_uploaded'
  | 'document_updated'
  | 'material_reimbursement'
  | 'material_reimbursement_approved'
  | 'payroll_fine'
  | 'payroll_bonus'
  | 'object_member_joined'
  | 'object_member_revoked'
  | 'member_join_request'
  | 'member_join_approved'
  | 'member_join_rejected'
  | 'worker_joined'
  | 'object_org_added'
  | 'object_foreman_assigned'
  | 'task_work_started'
  | 'brigade_task_assigned'
  | 'brigade_payroll'
  | 'brigade_member_joined'
  | 'payment_report_submitted'
  | 'payment_act_sent_org'
  | 'payment_act_sent_client'
  | 'payment_act_returned'
  | 'payment_act_paid'
  | 'work_calculator_submitted'
  | 'work_calculator_accepted'
  | 'work_calculator_returned'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  taskId?: string
  /** Под-работа — для перехода /workflow/:taskId/sub/:subWorkId */
  subWorkId?: string
  objectId?: string
  targetRoles: AppRole[]
  targetContractorId?: string
  targetWorkerId?: string
  /** Точечная доставка по userKey (заказчик объекта и т.д.) */
  targetUserKeys?: string[]
  /** Фото из уведомления о новом участнике */
  facePhoto?: string
  /** Ключи пользователей, отметивших уведомление прочитанным */
  readByUserKeys: string[]
  createdAt: string
}

type NotificationInput = Omit<AppNotification, 'id' | 'readByUserKeys' | 'createdAt'>

interface NotificationState {
  notifications: AppNotification[]
  addNotification: (n: NotificationInput) => void
  markRead: (id: string) => void
  markAllReadForCurrentUser: () => void
  markAllReadForIds: (ids: string[]) => void
}

function migrateNotification(raw: AppNotification & { read?: boolean }): AppNotification {
  const readByUserKeys = raw.readByUserKeys ?? []
  return {
    ...raw,
    readByUserKeys: raw.read === true && readByUserKeys.length === 0 ? ['__legacy__'] : readByUserKeys,
  }
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (n) => {
        const item: AppNotification = {
          ...n,
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          readByUserKeys: [],
          createdAt: new Date().toISOString(),
        }
        set({ notifications: [item, ...get().notifications] })
      },

      markRead: (id) => {
        const userKey = getCurrentUserKey()
        set({
          notifications: get().notifications.map((n) =>
            n.id === id && !n.readByUserKeys.includes(userKey)
              ? { ...n, readByUserKeys: [...n.readByUserKeys, userKey] }
              : n,
          ),
        })
      },

      markAllReadForCurrentUser: () => {
        const userKey = getCurrentUserKey()
        const visibleIds = new Set(filterNotificationsForUser(get().notifications).map((n) => n.id))
        set({
          notifications: get().notifications.map((n) => {
            if (!visibleIds.has(n.id) || n.readByUserKeys.includes(userKey)) return n
            return { ...n, readByUserKeys: [...n.readByUserKeys, userKey] }
          }),
        })
      },

      markAllReadForIds: (ids) => {
        const userKey = getCurrentUserKey()
        const idSet = new Set(ids)
        set({
          notifications: get().notifications.map((n) =>
            idSet.has(n.id) && !n.readByUserKeys.includes(userKey)
              ? { ...n, readByUserKeys: [...n.readByUserKeys, userKey] }
              : n,
          ),
        })
      },
    }),
    {
      name: STORAGE_KEYS.NOTIFICATIONS,
      storage: createJSONStorage(() => createZustandStorage()),
      merge: (persisted, current) => {
        const p = persisted as Partial<NotificationState> | undefined
        const notifications = (p?.notifications ?? []).map((n) =>
          migrateNotification(n as AppNotification & { read?: boolean }),
        )
        return { ...current, ...p, notifications }
      },
    },
  ),
)

export function pushNotification(n: NotificationInput): void {
  useNotificationStore.getState().addNotification(n)
}

/** Прочитано ли уведомление текущим пользователем (с учётом legacy) */
export function isNotificationRead(n: AppNotification): boolean {
  const key = getCurrentUserKey()
  if (n.readByUserKeys.includes('__legacy__')) return true
  return isReadForUser(n, key)
}
