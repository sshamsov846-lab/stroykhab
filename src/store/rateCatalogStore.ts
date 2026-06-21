import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { WorkRateEntry, RateSource } from '@/types/rateCatalog'
import type { WorkType } from '@types'
import { WORK_TYPE_LABELS } from '@api/hierarchy'

const DEFAULT_TYPES: WorkType[] = ['plaster', 'screed', 'electrical', 'plumbing', 'paint', 'tiles', 'doors']

function defaultRates(): Record<string, WorkRateEntry> {
  const defaults: Record<string, WorkRateEntry> = {}
  const pairs: [number, number][] = [
    [500, 400], [450, 350], [300, 220], [350, 280], [200, 150], [600, 480], [800, 650],
  ]
  DEFAULT_TYPES.forEach((wt, i) => {
    const [inc, out] = pairs[i] ?? [300, 240]
    defaults[wt] = {
      workType: wt,
      label: WORK_TYPE_LABELS[wt] || wt,
      unit: 'm2',
      incomingPrice: inc,
      outgoingPrice: out,
      source: 'foreman',
      updatedAt: new Date().toISOString(),
    }
  })
  return defaults
}

interface RateCatalogState {
  rates: Record<string, WorkRateEntry>
  getRate: (workType: WorkType) => WorkRateEntry | undefined
  setRate: (entry: Omit<WorkRateEntry, 'updatedAt'>) => void
  importRates: (entries: WorkRateEntry[], source?: RateSource, organizationId?: string) => number
  getAllRates: () => WorkRateEntry[]
}

export const useRateCatalogStore = create<RateCatalogState>()(
  persist(
    (set, get) => ({
      rates: defaultRates(),

      getRate: (workType) => get().rates[workType],

      setRate: (entry) => {
        set({
          rates: {
            ...get().rates,
            [entry.workType]: { ...entry, updatedAt: new Date().toISOString() },
          },
        })
      },

      importRates: (entries, source = 'organization', organizationId) => {
        const next = { ...get().rates }
        for (const e of entries) {
          next[e.workType] = {
            ...e,
            source: source ?? e.source,
            organizationId,
            updatedAt: new Date().toISOString(),
          }
        }
        set({ rates: next })
        return entries.length
      },

      getAllRates: () => Object.values(get().rates).sort((a, b) => a.label.localeCompare(b.label, 'ru')),
    }),
    {
      name: STORAGE_KEYS.RATE_CATALOG,
      storage: createJSONStorage(() => createZustandStorage()),
    },
  ),
)

export function applyCatalogToPayroll(workType: WorkType): {
  incomingUnitPrice: number
  outgoingUnitPrice: number
  volumeUnit: import('@/types/workerPayroll').VolumeUnit
  dailyRate: number
  hourlyRate: number
} {
  const rate = useRateCatalogStore.getState().getRate(workType)
  const unit = rate?.unit === 'm2' || rate?.unit === 'pcs' || rate?.unit === 'lm' ? rate.unit : 'm2'
  return {
    incomingUnitPrice: rate?.incomingPrice ?? 0,
    outgoingUnitPrice: rate?.outgoingPrice ?? 0,
    volumeUnit: unit,
    dailyRate: rate?.unit === 'day' ? rate.outgoingPrice : rate?.outgoingPrice ?? 3000,
    hourlyRate: rate?.unit === 'hour' ? rate.outgoingPrice : Math.round((rate?.outgoingPrice ?? 400) / 8),
  }
}
