import * as XLSX from 'xlsx'
import type { TaskWorkCalculator } from '@/types/workCalculator'
import { CALCULATOR_STATUS_LABELS } from '@/types/workCalculator'
import { unitLabel } from '@utils/calculatorRates'
import { computeSpecTotals } from '@utils/calculatorTotals'

function sanitizeFilenamePart(s: string): string {
  return s
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 36)
}

export function calculatorReportFilename(calc: TaskWorkCalculator): string {
  const iso = calc.submittedAt ?? calc.updatedAt
  const [, month, day] = iso.slice(0, 10).split('-')
  const datePart = `${day}-${month}`
  const obj = sanitizeFilenamePart(calc.objectName || 'Объект')
  const zoneRaw = (calc.zoneLabel || 'Зона').split(',')[0]?.trim() || 'Зона'
  const zone = sanitizeFilenamePart(zoneRaw)
  const worker = sanitizeFilenamePart(calc.workerName.split(/\s+/)[0] || 'Мастер')
  return `Отчёт_${obj}_${zone}_${worker}_${datePart}.xlsx`
}

export function downloadCalculatorReportExcel(calc: TaskWorkCalculator): void {
  const dateStr = new Date(calc.submittedAt ?? calc.updatedAt).toLocaleDateString('ru-RU')
  const masterCell = calc.workerCode
    ? `${calc.workerName} (${calc.workerCode})`
    : calc.workerName

  const header: (string | number)[][] = [
    ['Отчёт о выполненных работах'],
    [],
    ['Объект', calc.objectName || '—'],
    ['Зона / адрес', calc.zoneLabel || '—'],
    ['Мастер', masterCell],
    ['Специализация', calc.specializationLabel || '—'],
    ['Дата', dateStr],
    ['Статус', CALCULATOR_STATUS_LABELS[calc.status]],
    [],
    ['Позиция', 'Количество', 'Единица', 'Цена, ₽', 'Сумма, ₽'],
  ]

  const rows = calc.lines.map((line) => [
    line.label,
    line.quantity,
    unitLabel(line.unit),
    line.unitRate,
    line.amount,
  ])

  const specTotals = computeSpecTotals(calc.lines)
  if (specTotals.length > 1) {
    rows.push([])
    rows.push(['Итоги по специализациям'])
    for (const s of specTotals) {
      rows.push([s.label, '', '', '', s.total])
    }
  }

  rows.push([], ['', '', '', 'ИТОГО:', calc.grandTotal])

  const data = [...header, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 42 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Отчёт')
  XLSX.writeFile(wb, calculatorReportFilename(calc))
}
