import type { CalculatorGroupId, CalculatorLine, CalculatorCatalogItem } from '@/types/workCalculator'
import { CALCULATOR_GROUP_LABELS } from '@/types/workCalculator'
import type { SpecializationId } from '@/constants/specializations'
import { calculatorSpecLabel } from '@/constants/calculatorSpecs'

export function computeVolumeM3(areaM2: number, thicknessMm: number): number {
  if (!areaM2 || !thicknessMm) return 0
  return Math.round((areaM2 * thicknessMm) / 1000 * 1000) / 1000
}

export function effectiveQuantity(line: CalculatorLine): number {
  if (line.inputMode === 'area_thickness') {
    const area = line.areaM2 ?? 0
    const thick = line.thicknessMm ?? 0
    if (line.unit === 'm3') return computeVolumeM3(area, thick)
    if (line.unit === 'm2') return area
  }
  return line.quantity
}

export function lineAmount(line: Pick<CalculatorLine, 'quantity' | 'unitRate' | 'inputMode' | 'areaM2' | 'thicknessMm' | 'unit'>): number {
  const qty = effectiveQuantity(line as CalculatorLine)
  const rate = Number.isFinite(line.unitRate) ? line.unitRate : 0
  return Math.round(qty * rate * 100) / 100
}

export function normalizeLine(line: Omit<CalculatorLine, 'amount'> & { amount?: number }): CalculatorLine {
  const computedVolumeM3 =
    line.inputMode === 'area_thickness'
      ? computeVolumeM3(line.areaM2 ?? 0, line.thicknessMm ?? 0)
      : line.computedVolumeM3
  const quantity =
    line.inputMode === 'area_thickness' && line.unit === 'm3'
      ? computedVolumeM3 ?? 0
      : line.inputMode === 'area_thickness' && line.unit === 'm2'
        ? line.areaM2 ?? 0
        : Number.isFinite(line.quantity)
          ? line.quantity
          : 0
  const unitRate = Number.isFinite(line.unitRate) ? line.unitRate : 0
  const full: CalculatorLine = {
    ...line,
    quantity,
    unitRate,
    computedVolumeM3,
    amount: lineAmount({ ...line, quantity, unitRate }),
  }
  return full
}

export interface GroupTotal {
  groupId: CalculatorGroupId
  label: string
  total: number
  lineCount: number
}

export interface SpecTotal {
  specializationId: SpecializationId
  label: string
  total: number
  lineCount: number
}

export function computeGroupTotals(lines: CalculatorLine[]): GroupTotal[] {
  const map = new Map<CalculatorGroupId, GroupTotal>()
  for (const line of lines) {
    const prev = map.get(line.groupId)
    if (prev) {
      prev.total += line.amount
      prev.lineCount += 1
    } else {
      map.set(line.groupId, {
        groupId: line.groupId,
        label: CALCULATOR_GROUP_LABELS[line.groupId] || line.groupId,
        total: line.amount,
        lineCount: 1,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'ru'))
}

export function computeSpecTotals(lines: CalculatorLine[]): SpecTotal[] {
  const map = new Map<SpecializationId, SpecTotal>()
  for (const line of lines) {
    const sid = line.specializationId
    const prev = map.get(sid)
    if (prev) {
      prev.total += line.amount
      prev.lineCount += 1
    } else {
      map.set(sid, {
        specializationId: sid,
        label: calculatorSpecLabel(sid),
        total: line.amount,
        lineCount: 1,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'ru'))
}

export function computeGrandTotal(lines: CalculatorLine[]): number {
  return Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100
}

export function lineFromCatalogItem(item: CalculatorCatalogItem, unitRate: number, id: string): CalculatorLine {
  return normalizeLine({
    id,
    catalogItemId: item.id,
    specializationId: item.specializationId,
    groupId: item.groupId,
    label: item.label,
    unit: item.unit,
    quantity: 0,
    unitRate,
    amount: 0,
    workType: item.workType,
    inputMode: item.inputMode ?? 'simple',
    areaM2: 0,
    thicknessMm: 0,
  })
}
