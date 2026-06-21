import * as XLSX from 'xlsx'
import type { PaymentAct } from '@/types/paymentAct'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { unitLabel } from '@utils/paymentActCalc'

type PriceLevel = 'worker' | 'foreman' | 'client'

function rowPrice(item: PaymentAct['lineItems'][0], level: PriceLevel): number {
  if (level === 'worker') return item.outgoingUnitPrice
  if (level === 'foreman') return item.incomingUnitPrice
  return item.clientUnitPrice
}

function rowAmount(item: PaymentAct['lineItems'][0], level: PriceLevel): number {
  if (level === 'worker') return item.workerAmount
  if (level === 'foreman') return item.foremanAmount
  return item.clientAmount
}

function totalForLevel(act: PaymentAct, level: PriceLevel): number {
  if (level === 'worker') return act.workerTotal
  if (level === 'foreman') return act.foremanTotal
  return act.clientTotal
}

export function downloadPaymentActExcel(act: PaymentAct, level: PriceLevel = 'foreman'): void {
  const header = [
    ['Акт выполненных работ', act.actNumber],
    ['Объект', act.objectName],
    ['Исполнитель', act.executorName],
    ['Период', `${act.periodFrom} — ${act.periodTo}`],
    [],
    ['Вид работ', 'Описание', 'Объём', 'Ед.', 'Расценка', 'Сумма'],
  ]

  const rows = act.lineItems.map((item) => [
    WORK_TYPE_LABELS[item.workType] || item.workType,
    item.label,
    item.volume,
    unitLabel(item.unit),
    rowPrice(item, level),
    rowAmount(item, level),
  ])

  rows.push([], ['', '', '', '', 'ИТОГО:', totalForLevel(act, level)])

  const data = [...header, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Акт')
  XLSX.writeFile(wb, `akt-${act.actNumber}.xlsx`)
}
