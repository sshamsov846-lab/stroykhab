import type { AppRole } from '@store/userStore'

/** Вариант А: код → прораб. Вариант Б: код → организация */
export type InviteChainMode = 'foreman' | 'organization'

export interface ObjectInviteSettings {
  objectId: string
  code: string
  chainMode: InviteChainMode
  /** true = многоразовый, false = одноразовый */
  reusable: boolean
  usedCount: number
  revokedCodes: string[]
  createdAt: string
  updatedAt: string
}

export type ObjectAccessRole = 'client' | 'foreman' | 'subcontractor' | 'worker'

export type ConnectVia = 'invite_code' | 'team_add' | 'owner' | 'link' | 'chain_add'

export interface ObjectAccessMember {
  id: string
  objectId: string
  userKey: string
  role: ObjectAccessRole
  fullName: string
  phone: string
  contractorId?: string
  workerMemberId?: string
  connectedAt: string
  connectedVia: ConnectVia
  revokedAt?: string
}

export const CHAIN_MODE_LABELS: Record<InviteChainMode, string> = {
  foreman: 'Прораб напрямую',
  organization: 'Через организацию',
}

export const CHAIN_MODE_HINTS: Record<InviteChainMode, string> = {
  foreman: 'Код передаётся прорабу — он подключает мастеров сам',
  organization: 'Код передаётся организации — она подключает прораба и мастеров',
}

export function appRoleToAccessRole(role: AppRole): ObjectAccessRole {
  return role
}
