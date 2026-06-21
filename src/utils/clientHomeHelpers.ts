import type { ConstructionObject } from '@types'
import type { TaskAuditEntry } from '@/types/taskAudit'
import type { PhotoReportItem } from '@/types/objectStructure'
import type { AppNotification } from '@store/notificationStore'

export function formatProgressLabel(progress?: number): string {
  const p = progress ?? 0
  return p === 0 ? 'Не начат' : `${p}%`
}

export function formatObjectSubtitle(obj: ConstructionObject): string {
  const progress = formatProgressLabel(obj.progress)
  const spent = obj.budget_spent.toLocaleString('ru-RU')
  if ((obj.progress ?? 0) === 0 && obj.budget_total === 0 && obj.budget_spent === 0) {
    return `${progress} · бюджет не задан`
  }
  return `${progress} · ${spent} ₽`
}

export type AttentionKind = 'budget' | 'overdue'

export interface AttentionItem {
  id: string
  kind: AttentionKind
  title: string
  subtitle: string
  objectId?: string
  urgent?: boolean
}

/** Только объектные риски: бюджет и просрочки. Согласования — в колокольчике уведомлений. */
export function buildAttentionItems(objects: ConstructionObject[]): AttentionItem[] {
  const items: AttentionItem[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const obj of objects) {
    if (obj.budget_total > 0 && obj.budget_spent > obj.budget_total) {
      const over = obj.budget_spent - obj.budget_total
      items.push({
        id: `budget-${obj.id}`,
        kind: 'budget',
        title: `Превышение бюджета: ${obj.name}`,
        subtitle: `Перерасход ${over.toLocaleString('ru-RU')} ₽ (${obj.budget_spent.toLocaleString('ru-RU')} из ${obj.budget_total.toLocaleString('ru-RU')} ₽)`,
        objectId: obj.id,
        urgent: true,
      })
    }

    if (obj.end_date) {
      const end = new Date(obj.end_date)
      end.setHours(0, 0, 0, 0)
      const progress = obj.progress ?? 0
      if (end < today && progress < 100) {
        items.push({
          id: `overdue-${obj.id}`,
          kind: 'overdue',
          title: `Просрочен этап: ${obj.name}`,
          subtitle: `Плановая дата ${end.toLocaleDateString('ru-RU')}, прогресс ${formatProgressLabel(progress)}`,
          objectId: obj.id,
        })
      }
    }
  }

  const order: Record<AttentionKind, number> = { budget: 0, overdue: 1 }
  return items.sort((a, b) => order[a.kind] - order[b.kind])
}

export interface UpcomingPaymentGroup {
  objectId: string
  objectName: string
  amount: number
  items: Array<{ id: string; title: string; amount: number; date: string }>
}

export function getUpcomingPaymentsThisMonth(groups: UpcomingPaymentGroup[]): {
  total: number
  groups: UpcomingPaymentGroup[]
} {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  const filtered = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((r) => {
        const d = new Date(r.date)
        return d.getMonth() === month && d.getFullYear() === year
      }),
    }))
    .filter((g) => g.items.length > 0)
    .map((g) => ({
      ...g,
      amount: g.items.reduce((s, r) => s + r.amount, 0),
    }))

  const total = filtered.reduce((s, g) => s + g.amount, 0)
  return { total, groups: filtered.sort((a, b) => b.amount - a.amount) }
}

export interface TodayActivityItem {
  id: string
  time: string
  text: string
  objectId?: string
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

export function buildTodayActivity(
  auditEntries: TaskAuditEntry[],
  photoReports: PhotoReportItem[],
  appNotifications: AppNotification[],
): TodayActivityItem[] {
  const items: TodayActivityItem[] = []

  for (const e of auditEntries) {
    if (!isToday(e.createdAt)) continue
    items.push({
      id: `audit-${e.id}`,
      time: new Date(e.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      text: `${e.userName}: ${e.fieldLabel} — ${e.newValue}`,
      objectId: undefined,
    })
  }

  for (const p of photoReports) {
    if (!isToday(p.timestamp)) continue
    items.push({
      id: `photo-${p.id}`,
      time: new Date(p.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      text: `Фото: ${p.workTitle} (${p.objectName})`,
      objectId: p.objectId,
    })
  }

  for (const n of appNotifications) {
    if (!isToday(n.createdAt)) continue
    items.push({
      id: `notif-${n.id}`,
      time: new Date(n.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      text: n.title,
      objectId: n.objectId,
    })
  }

  return items
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 6)
}

export const RECENT_OBJECTS_LIMIT = 3
