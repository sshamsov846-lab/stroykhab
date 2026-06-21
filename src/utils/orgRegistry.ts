import { getJSON, setJSON, STORAGE_KEYS } from '@services/storage'
import type { SpecializationId } from '@/constants/specializations'
import type { Contractor } from '@/types/projectWorkflow'

export interface OrgRegistryEntry {
  id: string
  name: string
  specialty: string
  phone?: string
  inviteCode?: string
  specializationIds?: SpecializationId[]
  userKey?: string
  updatedAt: string
}

function readRegistry(): Record<string, OrgRegistryEntry> {
  return getJSON<Record<string, OrgRegistryEntry>>(STORAGE_KEYS.ORG_REGISTRY) ?? {}
}

function writeRegistry(registry: Record<string, OrgRegistryEntry>): void {
  setJSON(STORAGE_KEYS.ORG_REGISTRY, registry)
}

/** Сохранить организацию в отдельный реестр — виден всем вкладкам сразу */
export function registerOrganizationInRegistry(
  entry: Omit<OrgRegistryEntry, 'updatedAt'>,
): void {
  const registry = readRegistry()
  registry[entry.id] = {
    ...entry,
    updatedAt: new Date().toISOString(),
  }
  writeRegistry(registry)
}

export function loadOrganizationRegistry(): Record<string, OrgRegistryEntry> {
  return readRegistry()
}

export function registryEntryToContractor(entry: OrgRegistryEntry): Contractor {
  return {
    id: entry.id,
    name: entry.name,
    specialty: entry.specialty,
    phone: entry.phone,
    inviteCode: entry.inviteCode,
    specializationIds: entry.specializationIds,
    isRegisteredOrg: true,
  }
}

export function getAllOrganizationsFromRegistry(): Contractor[] {
  return Object.values(readRegistry())
    .map(registryEntryToContractor)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export function resolveUserKeyFromRegistry(contractorId: string): string | undefined {
  return readRegistry()[contractorId]?.userKey
}
