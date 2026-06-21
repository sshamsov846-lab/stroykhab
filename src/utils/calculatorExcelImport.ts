import * as XLSX from 'xlsx'
import type { CalculatorGroupId, CalculatorLine } from '@/types/workCalculator'
import type { SpecializationId } from '@/constants/specializations'
import type { VolumeUnit } from '@/types/workerPayroll'
import { normalizeLine } from '@utils/calculatorTotals'

const HEADER_ALIASES: Record<string, string> = {
  type: 'type',
  тип: 'type',
  позиция: 'type',
  название: 'type',
  work: 'type',
  diameter: 'diameter',
  диаметр: 'diameter',
  d: 'diameter',
  length: 'quantity',
  метраж: 'quantity',
  quantity: 'quantity',
  количество: 'quantity',
  qty: 'quantity',
  volume: 'quantity',
  объем: 'quantity',
  объём: 'quantity',
  rate: 'unitRate',
  price: 'unitRate',
  расценка: 'unitRate',
  цена: 'unitRate',
  unit: 'unit',
  единица: 'unit',
  group: 'group',
  группа: 'group',
}

function normalizeHeader(h: string): string {
  const key = h.trim().toLowerCase().replace(/\s+/g, '_')
  return HEADER_ALIASES[key] || key
}

function parseUnit(raw: string): VolumeUnit {
  const u = raw.trim().toLowerCase()
  if (u === 'lm' || u === 'м.п.' || u === 'мп' || u === 'м') return 'lm'
  if (u === 'pcs' || u === 'шт') return 'pcs'
  if (u === 'm3' || u === 'м3' || u === 'м³') return 'm3'
  if (u === 'point' || u === 'точка' || u === 'точки') return 'point'
  return 'm2'
}

function guessGroup(type: string): CalculatorGroupId {
  const t = type.toLowerCase()
  if (t.includes('отоп')) return 'pipes_heating'
  if (t.includes('водоснаб') || t.includes('вода')) return 'pipes_water'
  if (t.includes('канал') || t.includes('110') || t.includes('50')) return 'sewage'
  if (t.includes('изоля')) return 'insulation'
  if (t.includes('кран') || t.includes('вентил')) return 'valves'
  if (t.includes('радиатор') || t.includes('батар')) return 'radiators'
  if (t.includes('компенс')) return 'compensators'
  if (t.includes('опор') || t.includes('креп')) return 'supports'
  if (t.includes('фитинг') || t.includes('отвод')) return 'fittings'
  if (t.includes('счёт') || t.includes('счет') || t.includes('полотенц')) return 'meters'
  if (t.includes('кабел') || t.includes('провод')) return 'cable'
  if (t.includes('розет') || t.includes('выключ')) return 'sockets'
  if (t.includes('щит') || t.includes('автомат')) return 'panels'
  if (t.includes('штукат') || t.includes('стен')) return 'walls'
  if (t.includes('пол') || t.includes('стяж')) return 'floors'
  return 'other'
}

function newLineId(): string {
  return `cl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function parseNumber(raw: string): number {
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function parseCalculatorRows(matrix: unknown[][]): { lines: CalculatorLine[]; errors: string[] } {
  const errors: string[] = []
  const rows = matrix
    .map((row) => row.map((c) => (c == null ? '' : String(c).trim())))
    .filter((r) => r.some(Boolean))
  if (rows.length < 2) return { lines: [], errors: ['Файл пуст или содержит только заголовок'] }

  const headers = rows[0].map(normalizeHeader)
  const lines: CalculatorLine[] = []

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = cells[idx] || ''
    })

    const type = row.type || ''
    if (!type) {
      errors.push(`Строка ${i + 1}: не указан тип/позиция`)
      continue
    }

    const diameter = row.diameter || ''
    const label = diameter ? `${type} ${diameter.startsWith('Ø') ? diameter : `Ø${diameter}`}` : type
    const quantity = parseNumber(row.quantity || '0')
    if (quantity <= 0) {
      errors.push(`Строка ${i + 1}: не указано количество/метраж`)
      continue
    }

    const unitRate = parseNumber(row.unitRate || '0')
    const unit = row.unit ? parseUnit(row.unit) : guessGroup(type).startsWith('pipes') || guessGroup(type) === 'sewage' || guessGroup(type) === 'insulation' || guessGroup(type) === 'cable' ? 'lm' : 'pcs'
    const groupId = (row.group as CalculatorGroupId) || guessGroup(type)

    lines.push(
      normalizeLine({
        id: newLineId(),
        specializationId: 'universal' as SpecializationId,
        groupId,
        label,
        unit,
        quantity,
        unitRate,
        amount: 0,
        inputMode: 'simple',
      }),
    )
  }

  return { lines, errors }
}

export async function importCalculatorFile(file: File): Promise<{ lines: CalculatorLine[]; errors: string[] }> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
    return parseCalculatorRows(matrix)
  }
  const text = await file.text()
  const delimiter = text.includes(';') ? ';' : ','
  const matrix = text.split(/\r?\n/).filter(Boolean).map((l) => l.split(delimiter))
  return parseCalculatorRows(matrix)
}
