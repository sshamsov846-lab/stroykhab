import type { SiteCheckIn, TimesheetDayRow } from '@/types/attendance'

function sessionMs(checkIn: SiteCheckIn, now = Date.now()): number {
  const start = new Date(checkIn.arrivedAt).getTime()
  const end = checkIn.leftAt ? new Date(checkIn.leftAt).getTime() : now
  return Math.max(0, end - start)
}

export function calcHoursFromMs(ms: number): number {
  return Math.round((ms / 3600000) * 100) / 100
}

export function buildTimesheetRows(
  checkIns: SiteCheckIn[],
  filters?: { workerId?: string; objectId?: string; from?: string; to?: string },
): TimesheetDayRow[] {
  const map = new Map<string, TimesheetDayRow>()

  for (const c of checkIns) {
    if (filters?.workerId && c.workerId !== filters.workerId) continue
    if (filters?.objectId && c.objectId !== filters.objectId) continue
    if (filters?.from && c.date < filters.from) continue
    if (filters?.to && c.date > filters.to) continue

    const key = `${c.date}|${c.objectId}|${c.workerId}`
    const ms = sessionMs(c)
    const hours = calcHoursFromMs(ms)
    const existing = map.get(key)
    if (existing) {
      existing.hours += hours
      existing.days = existing.hours >= 4 ? 1 : existing.hours > 0 ? 0.5 : 0
      existing.sessions.push({ arrivedAt: c.arrivedAt, leftAt: c.leftAt })
    } else {
      map.set(key, {
        date: c.date,
        objectId: c.objectId,
        objectName: c.objectName,
        workerId: c.workerId,
        workerName: c.workerName,
        hours,
        days: hours >= 4 ? 1 : hours > 0 ? 0.5 : 0,
        sessions: [{ arrivedAt: c.arrivedAt, leftAt: c.leftAt }],
      })
    }
  }

  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date) || a.workerName.localeCompare(b.workerName, 'ru'))
}

export function formatDurationMs(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h} ч ${m} мин`
  return `${m} мин`
}
