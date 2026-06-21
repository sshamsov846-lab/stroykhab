import type { CalculatorCatalogItem } from '@/types/workCalculator'
import { useRateCatalogStore } from '@store/rateCatalogStore'
import { useWorkCalculatorStore } from '@store/workCalculatorStore'
import type { VolumeUnit } from '@/types/workerPayroll'
import { VOLUME_UNIT_LABELS } from '@/types/workerPayroll'

export function resolveUnitRateForCatalogItem(item: CalculatorCatalogItem, workerId?: string): number {
  if (workerId) {
    const personal = useWorkCalculatorStore.getState().getPersonalRate(workerId, item)
    if (personal > 0) return personal
  }
  if (item.defaultRate != null && item.defaultRate > 0) return item.defaultRate
  if (item.workType) {
    const rate = useRateCatalogStore.getState().getRate(item.workType)
    if (rate?.outgoingPrice) return rate.outgoingPrice
  }
  return 0
}

export function unitLabel(unit: VolumeUnit): string {
  return VOLUME_UNIT_LABELS[unit] ?? unit
}
