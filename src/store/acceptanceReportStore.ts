import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { WorkType } from '@types'

export interface AcceptanceReportEntry {
  id: string
  objectId: string
  taskId: string
  subWorkId: string
  subWorkLabel: string
  workType: WorkType
  apartmentNumber: string
  action: 'accepted' | 'redo'
  reason?: string
  authorRole: 'foreman' | 'client'
  authorName: string
  createdAt: string
}

interface AcceptanceReportState {
  entries: AcceptanceReportEntry[]
  addEntry: (entry: Omit<AcceptanceReportEntry, 'id' | 'createdAt'>) => void
  getEntriesForObject: (objectId: string) => AcceptanceReportEntry[]
}

export const useAcceptanceReportStore = create<AcceptanceReportState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) => {
        const item: AcceptanceReportEntry = {
          ...entry,
          id: `ar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
        }
        set({ entries: [item, ...get().entries] })
      },

      getEntriesForObject: (objectId) =>
        get()
          .entries.filter((e) => e.objectId === objectId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }),
    {
      name: STORAGE_KEYS.ACCEPTANCE_REPORTS,
      storage: createJSONStorage(() => createZustandStorage()),
    },
  ),
)
