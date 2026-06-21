import * as XLSX from 'xlsx'
import { fullCalculatorCatalog } from '@/constants/calculatorCatalog'
import type { CalculatorCatalogItem } from '@/types/workCalculator'

function normalizeLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export interface ImportedRateRow {
  label: string
  rate: number
  catalogItemId?: string
}

export function matchRateToCatalog(label: string, catalog: CalculatorCatalogItem[]): string | undefined {
  const norm = normalizeLabel(label)
  const exact = catalog.find((c) => normalizeLabel(c.label) === norm)
  if (exact) return exact.id
  const partial = catalog.find(
    (c) => norm.includes(normalizeLabel(c.label)) || normalizeLabel(c.label).includes(norm),
  )
  return partial?.id
}

export function parseRateRows(matrix: unknown[][]): { rows: ImportedRateRow[]; errors: string[] } {
  const errors: string[] = []
  const rows = matrix
    .map((row) => row.map((c) => (c == null ? '' : String(c).trim())))
    .filter((r) => r.some(Boolean))
  if (rows.length < 2) return { rows: [], errors: ['Файл пуст'] }

  const headers = rows[0].map((h) => h.toLowerCase())
  const labelIdx = headers.findIndex((h) =>
    ['позиция', 'название', 'работа', 'label', 'type', 'тип', 'наименование'].some((k) => h.includes(k)),
  )
  const rateIdx = headers.findIndex((h) =>
    ['расценка', 'цена', 'rate', 'price', 'мастер', 'outgoing'].some((k) => h.includes(k)),
  )

  const catalog = fullCalculatorCatalog([])
  const result: ImportedRateRow[] = []

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]
    const label = labelIdx >= 0 ? cells[labelIdx] : cells[0]
    const rateRaw = rateIdx >= 0 ? cells[rateIdx] : cells[1]
    if (!label) continue
    const rate = Number(String(rateRaw).replace(/\s/g, '').replace(',', '.'))
    if (Number.isNaN(rate) || rate <= 0) {
      errors.push(`Строка ${i + 1}: неверная расценка`)
      continue
    }
    const catalogItemId = matchRateToCatalog(label, catalog)
    result.push({ label, rate, catalogItemId })
  }

  return { rows: result, errors }
}

export async function importRatesFromFile(file: File): Promise<{ rows: ImportedRateRow[]; errors: string[] }> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    if (name.endsWith('.csv')) {
      const text = await file.text()
      const delimiter = text.includes(';') ? ';' : ','
      const matrix = text.split(/\r?\n/).filter(Boolean).map((l) => l.split(delimiter))
      return parseRateRows(matrix)
    }
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
    return parseRateRows(matrix)
  }
  return { rows: [], errors: ['Поддерживаются Excel (.xlsx) и CSV'] }
}
