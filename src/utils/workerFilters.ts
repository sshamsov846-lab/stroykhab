import type { WorkType } from '@types'
import type { SpecializationId } from '@/constants/specializations'
import { workTypeMatchesSpecializations } from '@/constants/specializations'
import type { TeamMember } from '@store/objectStore'
import { useUserStore } from '@store/userStore'

export function filterWorkersForTask(
  workers: TeamMember[],
  workType: WorkType,
  opts?: { isSideJob?: boolean },
): TeamMember[] {
  if (opts?.isSideJob) return workers
  return workers.filter((w) => {
    const specIds = w.specializationIds
    if (!specIds?.length) return true
    return workTypeMatchesSpecializations(workType, specIds)
  })
}

export function foremanOrganizationId(): string | undefined {
  const { role, organizationId, organizationLinkStatus } = useUserStore.getState()
  if (role !== 'foreman') return undefined
  if (organizationLinkStatus !== 'approved' || !organizationId) return undefined
  return organizationId
}

export function userSpecializationIds(): SpecializationId[] {
  return useUserStore.getState().specializationIds ?? []
}
