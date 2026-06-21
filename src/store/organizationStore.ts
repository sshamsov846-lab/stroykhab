import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { SpecializationId } from '@/constants/specializations'
import { specialtyTextFromIds } from '@/constants/specializations'
import { useObjectStore, type TeamMember } from '@store/objectStore'
import { notifyForemanJoinRequest, notifyJoinRequestApproved, notifyJoinRequestRejected } from '@utils/personNotifications'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import type { WorkerEmploymentType } from '@/types/person'

export type OrgMemberRole = 'worker' | 'foreman'
export type OrganizationLinkStatus = 'none' | 'pending' | 'approved'

export interface OrgMember {
  id: string
  contractorId: string
  userKey: string
  fullName: string
  phone: string
  memberRole: OrgMemberRole
  specializationIds: SpecializationId[]
  workerMemberId?: string
  facePhoto?: string
  personalCode?: string
  foremanUserKey?: string
  workerEmploymentType?: import('@/types/person').WorkerEmploymentType
  linkedAt: string
}

export interface OrgJoinRequest {
  id: string
  contractorId: string
  userKey: string
  fullName: string
  phone: string
  memberRole: OrgMemberRole
  specializationIds: SpecializationId[]
  facePhoto?: string
  personalCode?: string
  foremanUserKey?: string
  workerEmploymentType?: import('@/types/person').WorkerEmploymentType
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

interface OrganizationStoreState {
  members: OrgMember[]
  joinRequests: OrgJoinRequest[]

  addMember: (member: Omit<OrgMember, 'id' | 'linkedAt'>) => OrgMember
  removeMember: (memberId: string) => void
  getMembersForContractor: (contractorId: string) => OrgMember[]
  getForemenForContractor: (contractorId: string) => OrgMember[]
  getWorkersForContractor: (contractorId: string) => OrgMember[]

  createJoinRequest: (req: Omit<OrgJoinRequest, 'id' | 'status' | 'createdAt'>) => OrgJoinRequest
  approveJoinRequest: (requestId: string) => void
  rejectJoinRequest: (requestId: string) => void
  getPendingRequests: (contractorId: string) => OrgJoinRequest[]

  linkUserByInviteCode: (params: {
    userKey: string
    contractorId: string
    fullName: string
    phone: string
    memberRole: OrgMemberRole
    specializationIds: SpecializationId[]
    facePhoto?: string
    personalCode?: string
    foremanUserKey?: string
    workerEmploymentType?: WorkerEmploymentType
  }) => { member: OrgMember; workerMemberId?: string }

  /** Мастер сразу в команду прораба и организацию */
  linkWorkerToForemanAndOrg: (params: {
    userKey: string
    contractorId: string
    foremanUserKey: string
    fullName: string
    phone: string
    specializationIds: SpecializationId[]
    facePhoto: string
    personalCode: string
    workerEmploymentType: WorkerEmploymentType
  }) => { member: OrgMember; workerMemberId: string; teamMemberId: string }
}

function newMemberId(): string {
  return `om-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function addWorkerToContractor(
  contractorId: string,
  fullName: string,
  phone: string,
  specializationIds: SpecializationId[],
  extra?: {
    facePhoto?: string
    personalCode?: string
    workerEmploymentType?: WorkerEmploymentType
    userKey?: string
    foremanUserKey?: string
  },
): TeamMember {
  return useObjectStore.getState().addContractorWorker(contractorId, {
    name: fullName,
    role: extra?.workerEmploymentType === 'brigade' ? 'Бригада' : 'Мастер',
    phone,
    specialty: specialtyTextFromIds(specializationIds),
    specializationIds,
    facePhoto: extra?.facePhoto,
    personalCode: extra?.personalCode,
    workerEmploymentType: extra?.workerEmploymentType,
    userKey: extra?.userKey,
    foremanUserKey: extra?.foremanUserKey,
  })
}

function addWorkerToForemanTeam(
  fullName: string,
  phone: string,
  specializationIds: SpecializationId[],
  extra?: {
    facePhoto?: string
    personalCode?: string
    userKey?: string
    foremanUserKey?: string
    workerEmploymentType?: WorkerEmploymentType
  },
): TeamMember {
  return useObjectStore.getState().addTeamMember({
    name: fullName,
    role: specialtyTextFromIds(specializationIds),
    phone,
    specialty: specialtyTextFromIds(specializationIds),
    specializationIds,
    facePhoto: extra?.facePhoto,
    personalCode: extra?.personalCode,
    userKey: extra?.userKey,
    foremanUserKey: extra?.foremanUserKey,
    workerEmploymentType: extra?.workerEmploymentType,
  })
}

export const useOrganizationStore = create<OrganizationStoreState>()(
  persist(
    (set, get) => ({
      members: [],
      joinRequests: [],

      addMember: (member) => {
        const entry: OrgMember = {
          ...member,
          id: newMemberId(),
          linkedAt: new Date().toISOString(),
        }
        set((s) => ({ members: [...s.members.filter((m) => m.userKey !== member.userKey), entry] }))
        return entry
      },

      removeMember: (memberId) => {
        set((s) => ({ members: s.members.filter((m) => m.id !== memberId) }))
      },

      getMembersForContractor: (contractorId) =>
        get().members.filter((m) => m.contractorId === contractorId),

      getForemenForContractor: (contractorId) =>
        get().members.filter((m) => m.contractorId === contractorId && m.memberRole === 'foreman'),

      getWorkersForContractor: (contractorId) =>
        get().members.filter((m) => m.contractorId === contractorId && m.memberRole === 'worker'),

      createJoinRequest: (req) => {
        const entry: OrgJoinRequest = {
          ...req,
          id: `jr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
        set((s) => ({
          joinRequests: [
            ...s.joinRequests.filter((r) => !(r.userKey === req.userKey && r.status === 'pending')),
            entry,
          ],
        }))

        if (req.memberRole === 'foreman') {
          const org = useProjectWorkflowStore.getState().contractors.find((c) => c.id === req.contractorId)
          notifyForemanJoinRequest({
            contractorId: req.contractorId,
            foremanName: req.fullName,
            facePhoto: req.facePhoto,
            personalCode: req.personalCode,
            specialization: specialtyTextFromIds(req.specializationIds),
          })
          void org
        }

        return entry
      },

      approveJoinRequest: (requestId) => {
        const req = get().joinRequests.find((r) => r.id === requestId && r.status === 'pending')
        if (!req) return

        let workerMemberId: string | undefined
        if (req.memberRole === 'worker') {
          const w = addWorkerToContractor(
            req.contractorId,
            req.fullName,
            req.phone,
            req.specializationIds,
            {
              facePhoto: req.facePhoto,
              personalCode: req.personalCode,
              workerEmploymentType: req.workerEmploymentType,
              userKey: req.userKey,
              foremanUserKey: req.foremanUserKey,
            },
          )
          workerMemberId = w.id
          if (req.foremanUserKey) {
            addWorkerToForemanTeam(req.fullName, req.phone, req.specializationIds, {
              facePhoto: req.facePhoto,
              personalCode: req.personalCode,
              userKey: req.userKey,
              foremanUserKey: req.foremanUserKey,
              workerEmploymentType: req.workerEmploymentType,
            })
          }
        }

        get().addMember({
          contractorId: req.contractorId,
          userKey: req.userKey,
          fullName: req.fullName,
          phone: req.phone,
          memberRole: req.memberRole,
          specializationIds: req.specializationIds,
          workerMemberId,
          facePhoto: req.facePhoto,
          personalCode: req.personalCode,
          foremanUserKey: req.foremanUserKey,
          workerEmploymentType: req.workerEmploymentType,
        })

        const org = useProjectWorkflowStore.getState().contractors.find((c) => c.id === req.contractorId)
        notifyJoinRequestApproved({
          userKey: req.userKey,
          orgName: org?.name ?? 'Организация',
        })

        set((s) => ({
          joinRequests: s.joinRequests.map((r) =>
            r.id === requestId ? { ...r, status: 'approved' as const } : r,
          ),
        }))
      },

      rejectJoinRequest: (requestId) => {
        const req = get().joinRequests.find((r) => r.id === requestId && r.status === 'pending')
        set((s) => ({
          joinRequests: s.joinRequests.map((r) =>
            r.id === requestId ? { ...r, status: 'rejected' as const } : r,
          ),
        }))
        if (req) {
          const org = useProjectWorkflowStore.getState().contractors.find((c) => c.id === req.contractorId)
          notifyJoinRequestRejected({
            userKey: req.userKey,
            orgName: org?.name ?? 'Организация',
          })
        }
      },

      getPendingRequests: (contractorId) =>
        get().joinRequests.filter((r) => r.contractorId === contractorId && r.status === 'pending'),

      linkUserByInviteCode: (params) => {
        let workerMemberId: string | undefined

        if (params.memberRole === 'worker') {
          const w = addWorkerToContractor(
            params.contractorId,
            params.fullName,
            params.phone,
            params.specializationIds,
            {
              facePhoto: params.facePhoto,
              personalCode: params.personalCode,
              workerEmploymentType: params.workerEmploymentType,
              userKey: params.userKey,
              foremanUserKey: params.foremanUserKey,
            },
          )
          workerMemberId = w.id
        }

        const member = get().addMember({
          contractorId: params.contractorId,
          userKey: params.userKey,
          fullName: params.fullName,
          phone: params.phone,
          memberRole: params.memberRole,
          specializationIds: params.specializationIds,
          workerMemberId,
          facePhoto: params.facePhoto,
          personalCode: params.personalCode,
          foremanUserKey: params.foremanUserKey,
          workerEmploymentType: params.workerEmploymentType,
        })

        return { member, workerMemberId }
      },

      linkWorkerToForemanAndOrg: (params) => {
        const teamMember = addWorkerToForemanTeam(
          params.fullName,
          params.phone,
          params.specializationIds,
          {
            facePhoto: params.facePhoto,
            personalCode: params.personalCode,
            userKey: params.userKey,
            foremanUserKey: params.foremanUserKey,
            workerEmploymentType: params.workerEmploymentType,
          },
        )

        const contractorWorker = addWorkerToContractor(
          params.contractorId,
          params.fullName,
          params.phone,
          params.specializationIds,
          {
            facePhoto: params.facePhoto,
            personalCode: params.personalCode,
            workerEmploymentType: params.workerEmploymentType,
            userKey: params.userKey,
            foremanUserKey: params.foremanUserKey,
          },
        )

        const member = get().addMember({
          contractorId: params.contractorId,
          userKey: params.userKey,
          fullName: params.fullName,
          phone: params.phone,
          memberRole: 'worker',
          specializationIds: params.specializationIds,
          workerMemberId: contractorWorker.id,
          facePhoto: params.facePhoto,
          personalCode: params.personalCode,
          foremanUserKey: params.foremanUserKey,
          workerEmploymentType: params.workerEmploymentType,
        })

        return {
          member,
          workerMemberId: contractorWorker.id,
          teamMemberId: teamMember.id,
        }
      },
    }),
    {
      name: STORAGE_KEYS.ORGANIZATION,
      storage: createJSONStorage(() => createZustandStorage()),
    },
  ),
)
