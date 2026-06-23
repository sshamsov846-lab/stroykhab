import * as XLSX from 'xlsx'
import type { WizardHouseDraft, WizardSectionDraft } from '@/types/objectStructure'
import type { WorkTemplateId } from '@/types/objectStructure'
import type { ExcelApartmentRow, ExcelProjectPreview } from '@/types/projectExcel'

type ColKey =
  | 'entrance'
  | 'floor'
  | 'apartment'
  | 'rooms'
  | 'kitchen'
  | 'apartmentArea'
  | 'floorArea'

const HEADER_ALIASES: Record<string, ColKey> = {
  подъезд: 'entrance',
  подьезд: 'entrance',
  entrance: 'entrance',
  ent: 'entrance',
  этаж: 'floor',
  floor: 'floor',
  квартира: 'apartment',
  apartment: 'apartment',
  помещение: 'apartment',
  'количество комнат': 'rooms',
  комнат: 'rooms',
  комнаты: 'rooms',
  rooms: 'rooms',
  кухня: 'kitchen',
  kitchen: 'kitchen',
  'площадь квартиры': 'apartmentArea',
  'площадь квартиры (м²)': 'apartmentArea',
  'площадь квартиры (м2)': 'apartmentArea',
  s_кв: 'apartmentArea',
  площадь: 'apartmentArea',
  'площадь этажа': 'floorArea',
  'площадь этажа (м²)': 'floorArea',
  'площадь этажа (м2)': 'floorArea',
  s_эт: 'floorArea',
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ')
}

function mapHeaders(row: string[]): Partial<Record<ColKey, number>> {
  const map: Partial<Record<ColKey, number>> = {}
  row.forEach((cell, idx) => {
    const key = HEADER_ALIASES[normalizeHeader(cell)]
    if (key && map[key] === undefined) map[key] = idx
  })
  return map
}

function parseNumber(raw: string): number {
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function parseKitchen(raw: string): { hasKitchen: boolean; kitchenCount: number } {
  const v = raw.trim().toLowerCase()
  if (!v) return { hasKitchen: false, kitchenCount: 0 }
  if (['нет', 'no', '0', '-', '—'].includes(v)) return { hasKitchen: false, kitchenCount: 0 }
  if (['да', 'yes', 'есть', '+'].includes(v)) return { hasKitchen: true, kitchenCount: 1 }
  const n = parseNumber(v)
  if (n > 0) return { hasKitchen: true, kitchenCount: Math.round(n) }
  return { hasKitchen: true, kitchenCount: 1 }
}

function matrixFromFile(file: File): Promise<unknown[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = reader.result
        if (file.name.toLowerCase().endsWith('.csv')) {
          const text = String(data)
          const rows = text.split(/\r?\n/).map((line) => line.split(/[;,]/).map((c) => c.trim()))
          resolve(rows)
          return
        }
        const wb = XLSX.read(data, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        resolve(XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][])
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(reader.error)
    if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file, 'UTF-8')
    else reader.readAsArrayBuffer(file)
  })
}

export function buildExcelPreview(rows: ExcelApartmentRow[]): ExcelProjectPreview {
  const errors: string[] = []
  const warnings: string[] = []
  if (!rows.length) errors.push('Нет строк с квартирами')

  const floorMap = new Map<string, ExcelApartmentRow[]>()
  const entranceMap = new Map<number, ExcelApartmentRow[]>()

  for (const row of rows) {
    const fk = `${row.entrance}|${row.floor}`
    entranceMap.set(row.entrance, [...(entranceMap.get(row.entrance) ?? []), row])
    floorMap.set(fk, [...(floorMap.get(fk) ?? []), row])
  }

  const floors = [...floorMap.entries()].map(([key, list]) => {
    const [entrance, floor] = key.split('|').map(Number)
    const floorAreaFromRows = list.find((r) => r.floorArea && r.floorArea > 0)?.floorArea
    const apartmentAreaSum = list.reduce((s, r) => s + r.apartmentArea, 0)
    return {
      entrance,
      floor,
      apartmentCount: list.length,
      floorArea: floorAreaFromRows ?? apartmentAreaSum,
      apartmentAreaSum,
    }
  }).sort((a, b) => a.entrance - b.entrance || a.floor - b.floor)

  const entrances = [...entranceMap.entries()].map(([entrance, list]) => ({
    entrance,
    floors: new Set(list.map((r) => r.floor)).size,
    apartments: list.length,
    totalArea: list.reduce((s, r) => s + r.apartmentArea, 0),
  })).sort((a, b) => a.entrance - b.entrance)

  for (const f of floors) {
    if (f.floorArea > 0 && f.apartmentAreaSum > f.floorArea * 1.05) {
      warnings.push(`Подъезд ${f.entrance}, этаж ${f.floor}: сумма квартир больше площади этажа`)
    }
  }

  return {
    apartmentCount: rows.length,
    totalApartmentArea: rows.reduce((s, r) => s + r.apartmentArea, 0),
    totalRooms: rows.reduce((s, r) => s + r.rooms, 0),
    totalKitchens: rows.reduce((s, r) => s + r.kitchenCount, 0),
    entrances,
    floors,
    errors,
    warnings,
  }
}

export function parseExcelProjectMatrix(matrix: unknown[][]): { rows: ExcelApartmentRow[]; preview: ExcelProjectPreview } {
  const table = matrix
    .map((row) => (Array.isArray(row) ? row.map((c) => (c == null ? '' : String(c).trim())) : []))
    .filter((r) => r.some(Boolean))

  if (table.length < 2) {
    const preview = buildExcelPreview([])
    preview.errors.push('Файл пуст или содержит только заголовок')
    return { rows: [], preview }
  }

  const colMap = mapHeaders(table[0])
  if (colMap.entrance === undefined || colMap.floor === undefined || colMap.apartment === undefined) {
    const preview = buildExcelPreview([])
    preview.errors.push('Не найдены обязательные колонки: Подъезд, Этаж, Квартира')
    return { rows: [], preview }
  }

  const rows: ExcelApartmentRow[] = []
  const errors: string[] = []

  for (let i = 1; i < table.length; i++) {
    const cells = table[i]
    const entrance = Math.max(1, Math.round(parseNumber(cells[colMap.entrance!] ?? '')))
    const floor = Math.max(1, Math.round(parseNumber(cells[colMap.floor!] ?? '')))
    const apartmentNumber = String(cells[colMap.apartment!] ?? '').trim()
    if (!apartmentNumber) continue

    const rooms = colMap.rooms !== undefined
      ? Math.max(0, Math.round(parseNumber(cells[colMap.rooms] ?? '2')))
      : 2
    const kitchenRaw = colMap.kitchen !== undefined ? cells[colMap.kitchen] ?? '' : ''
    const { hasKitchen, kitchenCount } = parseKitchen(kitchenRaw)
    const apartmentArea = colMap.apartmentArea !== undefined
      ? parseNumber(cells[colMap.apartmentArea] ?? '')
      : 0
    const floorArea = colMap.floorArea !== undefined
      ? parseNumber(cells[colMap.floorArea] ?? '')
      : undefined

    if (apartmentArea <= 0) {
      errors.push(`Строка ${i + 1}: не указана площадь квартиры`)
    }

    rows.push({
      entrance,
      floor,
      apartmentNumber,
      rooms,
      hasKitchen,
      kitchenCount,
      apartmentArea: apartmentArea > 0 ? apartmentArea : 0,
      floorArea: floorArea && floorArea > 0 ? floorArea : undefined,
    })
  }

  const preview = buildExcelPreview(rows)
  preview.errors.push(...errors)
  return { rows, preview }
}

export async function parseExcelProjectFile(file: File): Promise<{ rows: ExcelApartmentRow[]; preview: ExcelProjectPreview }> {
  const matrix = await matrixFromFile(file)
  return parseExcelProjectMatrix(matrix)
}

function newId(p: string): string {
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function buildSectionsFromExcelRows(
  rows: ExcelApartmentRow[],
  workTemplate: WorkTemplateId,
  zoneOptions: WizardHouseDraft['zoneOptions'],
): WizardSectionDraft[] {
  const maxEntrance = Math.max(...rows.map((r) => r.entrance), 1)
  const maxFloor = Math.max(...rows.map((r) => r.floor), 1)
  const maxAptsPerFloor = Math.max(
    ...[...new Set(rows.map((r) => `${r.entrance}|${r.floor}`))].map((key) => {
      const [e, f] = key.split('|').map(Number)
      return rows.filter((r) => r.entrance === e && r.floor === f).length
    }),
    1,
  )
  const avgArea = rows.reduce((s, r) => s + r.apartmentArea, 0) / Math.max(rows.length, 1)
  const avgRooms = Math.round(rows.reduce((s, r) => s + r.rooms, 0) / Math.max(rows.length, 1))

  const house: WizardHouseDraft = {
    id: newId('house'),
    name: 'Дом 1',
    entrancesCount: maxEntrance,
    floorsPerEntrance: maxFloor,
    apartmentsPerFloor: maxAptsPerFloor,
    defaultRooms: avgRooms,
    apartmentArea: Math.round(avgArea),
    workTemplate,
    includeBasement: false,
    includeRoof: true,
    zoneOptions: { ...zoneOptions },
    structureConfigured: true,
    apartmentsConfigured: true,
  }

  return [{ id: newId('sec'), name: 'Жилой комплекс', houses: [house] }]
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject())
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function isExcelProjectFile(file: File): boolean {
  const n = file.name.toLowerCase()
  return n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.csv')
}

export function isProjectAttachmentFile(file: File): boolean {
  if (isExcelProjectFile(file)) return true
  if (file.type.startsWith('image/')) return true
  return file.type === 'application/pdf'
}
