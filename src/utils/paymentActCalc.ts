import type { WorkType } from '@types'
import type { VolumeUnit } from '@/types/workerPayroll'
import type { PaymentActLineItem, WorkReportLineItem } from '@/types/paymentAct'
import { useRateCatalogStore } from '@store/rateCatalogStore'
import { RATE_UNIT_LABELS } from '@/types/rateCatalog'

export function clientUnitPriceFromRate(workType: WorkType): number {
  const rate = useRateCatalogStore.getState().getRate(workType)
  return rate?.clientPrice ?? rate?.incomingPrice ?? 0
}

export function lineItemFromReport(item: WorkReportLineItem): PaymentActLineItem {
  const rate = useRateCatalogStore.getState().getRate(item.workType)
  const outgoing = rate?.outgoingPrice ?? 0
  const incoming = rate?.incomingPrice ?? 0
  const client = rate?.clientPrice ?? incoming
  const volume = item.volume || 0
  return {
    id: item.id,
    workType: item.workType,
    label: item.label,
    volume,
    unit: item.unit,
    outgoingUnitPrice: outgoing,
    incomingUnitPrice: incoming,
    clientUnitPrice: client,
    workerAmount: volume * outgoing,
    foremanAmount: volume * incoming,
    clientAmount: volume * client,
    note: item.note,
  }
}

export function recalcLineItem(item: PaymentActLineItem): PaymentActLineItem {
  const v = item.volume || 0
  return {
    ...item,
    workerAmount: v * item.outgoingUnitPrice,
    foremanAmount: v * item.incomingUnitPrice,
    clientAmount: v * item.clientUnitPrice,
  }
}

export function recalcActTotals(lineItems: PaymentActLineItem[]): {
  workerTotal: number
  foremanTotal: number
  clientTotal: number
} {
  return lineItems.reduce(
    (acc, li) => ({
      workerTotal: acc.workerTotal + li.workerAmount,
      foremanTotal: acc.foremanTotal + li.foremanAmount,
      clientTotal: acc.clientTotal + li.clientAmount,
    }),
    { workerTotal: 0, foremanTotal: 0, clientTotal: 0 },
  )
}

export function unitLabel(unit: VolumeUnit): string {
  return RATE_UNIT_LABELS[unit] ?? unit
}

export function formatVolumeLine(item: Pick<PaymentActLineItem, 'volume' | 'unit' | 'label'>): string {
  return `${item.label}: ${item.volume} ${unitLabel(item.unit)}`
}

export function lineItemFromCalculatorLine(line: import('@/types/workCalculator').CalculatorLine): PaymentActLineItem {
  const workType = (line.workType ?? 'plaster') as WorkType
  const rate = useRateCatalogStore.getState().getRate(workType)
  const outgoing = line.unitRate
  const incoming = rate?.incomingPrice ?? outgoing
  const client = rate?.clientPrice ?? rate?.incomingPrice ?? incoming
  const volume = line.quantity || 0
  return {
    id: line.id,
    workType,
    label: line.label,
    volume,
    unit: line.unit,
    outgoingUnitPrice: outgoing,
    incomingUnitPrice: incoming,
    clientUnitPrice: client,
    workerAmount: line.amount,
    foremanAmount: volume * incoming,
    clientAmount: volume * client,
  }
}
