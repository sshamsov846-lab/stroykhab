import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { SiteCheckIn, TaskDowntime, DowntimeReasonId, TimesheetDayRow } from '@/types/attendance'
import { buildTimesheetRows } from '@utils/timesheetCalc'
import { todayDateKey } from '@utils/taskDeadlines'

interface AttendanceState {
  checkIns: SiteCheckIn[]
  downtimes: TaskDowntime[]

  checkIn: (params: {
    workerId: string
    workerName: string
    objectId: string
    objectName: string
  }) => void
  checkOut: (workerId: string, objectId?: string) => void
  getActiveCheckIn: (workerId: string) => SiteCheckIn | undefined
  getPresentOnObject: (objectId: string) => SiteCheckIn[]
  getPresentToday: () => SiteCheckIn[]

  startDowntime: (params: {
    taskId: string
    objectId: string
    taskTitle: string
    workerId?: string
    workerName: string
    reason: DowntimeReasonId
    reasonText?: string
  }) => void
  endDowntime: (taskId: string) => void
  getActiveDowntime: (taskId: string) => TaskDowntime | undefined
  getActiveDowntimes: () => TaskDowntime[]
  getDowntimeMs: (taskId: string) => number

  getTimesheet: (filters?: {
    workerId?: string
    objectId?: string
    from?: string
    to?: string
  }) => TimesheetDayRow[]
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set, get) => ({
      checkIns: [],
      downtimes: [],

      checkIn: ({ workerId, workerName, objectId, objectName }) => {
        const now = new Date().toISOString()
        const date = todayDateKey()
        const checkIns = [...get().checkIns]

        for (let i = 0; i < checkIns.length; i++) {
          const c = checkIns[i]
          if (c.workerId === workerId && !c.leftAt && c.date === date) {
            checkIns[i] = { ...c, leftAt: now }
          }
        }

        checkIns.unshift({
          id: uid('ci'),
          workerId,
          workerName,
          objectId,
          objectName,
          date,
          arrivedAt: now,
        })
        set({ checkIns })
      },

      checkOut: (workerId, objectId) => {
        const now = new Date().toISOString()
        const date = todayDateKey()
        set({
          checkIns: get().checkIns.map((c) => {
            if (c.workerId !== workerId || c.leftAt || c.date !== date) return c
            if (objectId && c.objectId !== objectId) return c
            return { ...c, leftAt: now }
          }),
        })
      },

      getActiveCheckIn: (workerId) => {
        const date = todayDateKey()
        return get().checkIns.find((c) => c.workerId === workerId && c.date === date && !c.leftAt)
      },

      getPresentOnObject: (objectId) => {
        const date = todayDateKey()
        const seen = new Set<string>()
        return get().checkIns.filter((c) => {
          if (c.objectId !== objectId || c.date !== date || c.leftAt) return false
          if (seen.has(c.workerId)) return false
          seen.add(c.workerId)
          return true
        })
      },

      getPresentToday: () => {
        const date = todayDateKey()
        const seen = new Set<string>()
        return get().checkIns.filter((c) => {
          if (c.date !== date || c.leftAt) return false
          const key = `${c.workerId}|${c.objectId}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      },

      startDowntime: (params) => {
        const existing = get().getActiveDowntime(params.taskId)
        if (existing) return
        const downtime: TaskDowntime = {
          id: uid('dt'),
          taskId: params.taskId,
          objectId: params.objectId,
          taskTitle: params.taskTitle,
          workerId: params.workerId,
          workerName: params.workerName,
          reason: params.reason,
          reasonText: params.reasonText?.trim() || undefined,
          since: new Date().toISOString(),
        }
        set({ downtimes: [downtime, ...get().downtimes] })
      },

      endDowntime: (taskId) => {
        const now = new Date().toISOString()
        set({
          downtimes: get().downtimes.map((d) =>
            d.taskId === taskId && !d.endedAt ? { ...d, endedAt: now } : d,
          ),
        })
      },

      getActiveDowntime: (taskId) => get().downtimes.find((d) => d.taskId === taskId && !d.endedAt),

      getActiveDowntimes: () => get().downtimes.filter((d) => !d.endedAt),

      getDowntimeMs: (taskId) => {
        const now = Date.now()
        return get()
          .downtimes.filter((d) => d.taskId === taskId)
          .reduce((sum, d) => {
            const start = new Date(d.since).getTime()
            const end = d.endedAt ? new Date(d.endedAt).getTime() : now
            return sum + Math.max(0, end - start)
          }, 0)
      },

      getTimesheet: (filters) => buildTimesheetRows(get().checkIns, filters),
    }),
    {
      name: STORAGE_KEYS.ATTENDANCE,
      storage: createJSONStorage(() => createZustandStorage()),
    },
  ),
)
