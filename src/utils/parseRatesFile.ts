import * as XLSX from 'xlsx'
import type { WorkType } from '@types'
import { TASK_TYPE_ALIASES } from '@/types/projectWorkflow'
import type { WorkRateEntry, RateSource } from '@/types/rateCatalog'
import { WORK_TYPE_LABELS } from '@api/hierarchy'

const HEADER_ALIASES: Record<string, string> = {
  work_type: 'workType',
  task_type: 'workType',
  'вид_работ': 'workType',
  'вид работ': 'workType',
  incoming: 'incomingPrice',
  incoming_price: 'incomingPrice',
  'цена_заказчика': 'incomingPrice',
  'цена заказчика': 'incomingPrice',
  outgoing: 'outgoingPrice',
  outgoing_price: 'outgoingPrice',
  'цена_мастера': 'outgoingPrice',
  'цена мастера': 'outgoingPrice',
  unit: 'unit',
  единица: 'unit',
  source: 'source',
  источник: 'source',
}

function normalizeHeader(h: string): string {
  const key = h.trim().toLowerCase().replace(/\s+/g, '_')
  return HEADER_ALIASES[key] || key
}

function parseWorkType(raw: string): WorkType | null {
  const key = raw.trim().toLowerCase()
  return (TASK_TYPE_ALIASES[key] as WorkType) || null
}

function parseUnit(raw: string): WorkRateEntry['unit'] {
  const u = raw.trim().toLowerCase()
  if (u === 'm2' || u === 'м2' || u === 'м²') return 'm2'
  if (u === 'pcs' || u === 'шт') return 'pcs'
  if (u === 'lm' || u === 'м.п.' || u === 'мп') return 'lm'
  if (u === 'hour' || u === 'час' || u === 'ч') return 'hour'
  return 'day'
}

function parseSource(raw: string): RateSource {
  return raw.trim().toLowerCase().includes('org') || raw.includes('орган') ? 'organization' : 'foreman'
}

export function parseRatesRows(matrix: unknown[][]): { rates: WorkRateEntry[]; errors: string[] } {
  const errors: string[] = []
  const lines = matrix.map((row) => row.map((c) => (c == null ? '' : String(c).trim()))).filter((r) => r.some(Boolean))
  if (lines.length < 2) return { rates: [], errors: ['Файл пуст'] }

  const headers = lines[0].map(normalizeHeader)
  const rates: WorkRateEntry[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = cells[idx] || '' })

    const workType = parseWorkType(row.workType || '')
    if (!workType) {
      errors.push(`Строка ${i + 1}: неизвестный вид работ`)
      continue
    }

    const incoming = Number(row.incomingPrice?.replace(/\s/g, '').replace(',', '.'))
    const outgoing = Number(row.outgoingPrice?.replace(/\s/g, '').replace(',', '.'))
    if (Number.isNaN(incoming) || Number.isNaN(outgoing)) {
      errors.push(`Строка ${i + 1}: неверные цены`)
      continue
    }

    rates.push({
      workType,
      label: WORK_TYPE_LABELS[workType] || workType,
      unit: parseUnit(row.unit || 'm2'),
      incomingPrice: incoming,
      outgoingPrice: outgoing,
      source: parseSource(row.source || 'foreman'),
      updatedAt: new Date().toISOString(),
    })
  }

  return { rates, errors }
}

export async function parseRatesFile(file: File): Promise<{ rates: WorkRateEntry[]; errors: string[] }> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
    return parseRatesRows(matrix)
  }
  const text = await file.text()
  const delimiter = text.includes(';') ? ';' : ','
  const matrix = text.split(/\r?\n/).filter(Boolean).map((l) => l.split(delimiter))
  return parseRatesRows(matrix)
}

export const SAMPLE_RATES_CSV = `Work_Type,Incoming_Price,Outgoing_Price,Unit,Source
plaster,500,400,m2,foreman
screed,450,350,m2,foreman
electrical,300,220,m2,foreman
plumbing,350,280,m2,foreman
paint,200,150,m2,foreman
`
