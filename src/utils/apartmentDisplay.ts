import type { GeneratedApartment } from '@/types/objectStructure'

export const APARTMENT_TYPE_OPTIONS = [
  { rooms: 0, label: 'Студия' },
  { rooms: 1, label: '1-комн' },
  { rooms: 2, label: '2-комн' },
  { rooms: 3, label: '3-комн' },
  { rooms: 4, label: '4-комн' },
] as const

export function formatApartmentType(rooms?: number): string | null {
  if (rooms === undefined || rooms === null) return null
  if (rooms <= 0) return 'студия'
  if (rooms === 1) return '1-комн'
  if (rooms === 2) return '2-комн'
  if (rooms === 3) return '3-комн'
  return '4-комн'
}

function parseAreaFromLabel(label?: string): number | undefined {
  if (!label) return undefined
  const m = label.match(/(\d+(?:[.,]\d+)?)\s*м²/i)
  if (!m) return undefined
  return Number(m[1].replace(',', '.'))
}

export function getApartmentArea(apt: GeneratedApartment): number | undefined {
  if (apt.area != null && apt.area > 0) return apt.area
  return parseAreaFromLabel(apt.label)
}

/** «Кв. 7 · 2-комн · 65 м²» или просто «Кв. 7» */
export function formatApartmentTitle(apt: GeneratedApartment): string {
  const parts: string[] = [`Кв. ${apt.number}`]
  const type = formatApartmentType(apt.rooms)
  if (type) parts.push(type)
  const area = getApartmentArea(apt)
  if (area) parts.push(`${area} м²`)
  return parts.join(' · ')
}

export function formatApartmentLocation(
  houseName: string,
  entranceNumber: number,
  floorLabel: string,
): string {
  return `${houseName} · подъезд ${entranceNumber} · ${floorLabel}`
}
