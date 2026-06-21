import type { ImportRow } from '@/types/projectWorkflow'
import type { ConstructionObject } from '@types'
import type { SideJobType } from '@utils/sideJob'
import { getForemanOwnerKey } from '@utils/sideJob'

export function sideJobWorkKey(index: number): string {
  return `работа-${index + 1}`
}

export function buildSideJobImportRows(
  objectName: string,
  works: Array<{ title: string; description?: string }>,
): ImportRow[] {
  return works.map((work, i) => ({
    section: 'Подработка',
    house: objectName,
    entrance: '1',
    floor: '1',
    apartmentNumber: sideJobWorkKey(i),
    taskType: 'walls',
    title: work.title,
    description: work.description,
    isSideJob: true,
  }))
}

export function buildSideJobObject(params: {
  name: string
  address: string
  sideJobType: SideJobType
  budget?: number
}): ConstructionObject {
  const id = `sidejob-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    name: params.name.trim(),
    address: params.address.trim(),
    status: 'active',
    budget_total: params.budget ?? 0,
    budget_spent: 0,
    progress: 0,
    created_at: new Date().toISOString(),
    isSideJob: true,
    sideJobType: params.sideJobType,
    ownerForemanKey: getForemanOwnerKey(),
    client_name: 'Подработка (прораб)',
  }
}

export function nextSideJobWorkIndex(existingRows: ImportRow[], objectName: string): number {
  const prefix = 'работа-'
  let max = 0
  for (const row of existingRows) {
    if (row.house !== objectName || !row.apartmentNumber.startsWith(prefix)) continue
    const n = parseInt(row.apartmentNumber.slice(prefix.length), 10)
    if (!Number.isNaN(n)) max = Math.max(max, n)
  }
  return max
}
