import * as XLSX from 'xlsx'
import type { ImportRow } from '@/types/projectWorkflow'
import { TASK_TYPE_ALIASES } from '@/types/projectWorkflow'
import type { WorkType } from '@types'

const HEADER_ALIASES: Record<string, string> = {
  section: 'section',
  секция: 'section',
  house: 'house',
  дом: 'house',
  entrance: 'entrance',
  подъезд: 'entrance',
  floor: 'floor',
  этаж: 'floor',
  apartment_number: 'apartmentNumber',
  apartment: 'apartmentNumber',
  квартира: 'apartmentNumber',
  'номер квартиры': 'apartmentNumber',
  task_type: 'taskType',
  task: 'taskType',
  'вид работ': 'taskType',
  work_type: 'taskType',
}

function normalizeHeader(h: string): string {
  const key = h.trim().toLowerCase().replace(/\s+/g, '_')
  return HEADER_ALIASES[key] || key
}

function parseTaskType(raw: string): WorkType | null {
  const key = raw.trim().toLowerCase()
  return TASK_TYPE_ALIASES[key] || null
}

function cellToString(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

/** Общая логика: первая строка — заголовки, остальные — данные */
export function parseEstimateRows(matrix: unknown[][]): { rows: ImportRow[]; errors: string[] } {
  const errors: string[] = []
  const lines = matrix
    .map((row) => row.map(cellToString))
    .filter((row) => row.some((c) => c))

  if (lines.length < 2) {
    return { rows: [], errors: ['Файл пуст или содержит только заголовок'] }
  }

  const headers = lines[0].map(normalizeHeader)
  const required = ['section', 'house', 'entrance', 'floor', 'apartmentNumber', 'taskType']
  for (const r of required) {
    if (!headers.includes(r)) errors.push(`Отсутствует колонка: ${r}`)
  }
  if (errors.length) return { rows: [], errors }

  const rows: ImportRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]
    if (cells.every((c) => !c)) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = cells[idx] || ''
    })

    const taskType = parseTaskType(row.taskType || '')
    if (!taskType) {
      errors.push(`Строка ${i + 1}: неизвестный Task_Type "${row.taskType}"`)
      continue
    }

    rows.push({
      section: row.section,
      house: row.house,
      entrance: row.entrance,
      floor: row.floor,
      apartmentNumber: row.apartmentNumber,
      taskType,
    })
  }

  return { rows, errors }
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  result.push(current.trim())
  return result
}

export function parseEstimateCsv(text: string): { rows: ImportRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) {
    return { rows: [], errors: ['Файл пуст или содержит только заголовок'] }
  }
  const delimiter = lines[0].includes(';') ? ';' : ','
  const matrix = lines.map((line) => splitCsvLine(line, delimiter))
  return parseEstimateRows(matrix)
}

export function parseEstimateXlsx(buffer: ArrayBuffer): { rows: ImportRow[]; errors: string[] } {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { rows: [], errors: ['Excel-файл не содержит листов'] }
  }
  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
  return parseEstimateRows(matrix)
}

export type EstimateFileFormat = 'csv' | 'xlsx'

export function detectEstimateFormat(file: File): EstimateFileFormat {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'xlsx'
  return 'csv'
}

export async function parseEstimateFile(
  file: File,
): Promise<{ rows: ImportRow[]; errors: string[]; format: EstimateFileFormat }> {
  const format = detectEstimateFormat(file)
  if (format === 'xlsx') {
    const buffer = await file.arrayBuffer()
    const { rows, errors } = parseEstimateXlsx(buffer)
    return { rows, errors, format }
  }
  const text = await file.text()
  const { rows, errors } = parseEstimateCsv(text)
  return { rows, errors, format: 'csv' }
}

export const SAMPLE_CSV = `Section,House,Entrance,Floor,Apartment_Number,Task_Type
Секция А,Дом 1,1,3,12,screed
Секция А,Дом 1,1,3,12,plaster
Секция А,Дом 1,1,3,12,electrical
Секция А,Дом 1,1,3,12,plumbing
Секция А,Дом 1,1,3,12,paint
Секция А,Дом 1,1,3,14,screed
Секция А,Дом 1,1,3,14,electrical
Секция А,Дом 1,2,5,8,screed
Секция А,Дом 1,2,5,8,plaster
`
