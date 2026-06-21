import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { Brigade, BrigadeContribution } from '@/types/brigade'
import type { SpecializationId } from '@/constants/specializations'
import { generatePersonCode, normalizePersonCode } from '@utils/personCodes'
import { usePersonProfileStore } from '@store/personProfileStore'
import { useObjectStore } from '@store/objectStore'
import { notifyBrigadeMemberJoined } from '@utils/brigadeNotifications'

interface BrigadeState {
  brigades: Brigade[]
  contributions: BrigadeContribution[]

  createBrigade: (params: {
    leaderUserKey: string
    leaderName: string
    leaderWorkerMemberId?: string
    specializationIds: SpecializationId[]
  }) => Brigade

  joinByCode: (
    code: string,
    memberUserKey: string,
    memberName: string,
    memberWorkerMemberId?: string,
  ) => { ok: boolean; reason?: string; brigade?: Brigade }

  addMember: (
    brigadeId: string,
    memberUserKey: string,
    memberName: string,
    memberWorkerMemberId?: string,
  ) => { ok: boolean; reason?: string }

  removeMember: (brigadeId: string, memberUserKey: string) => void

  getBrigade: (id: string) => Brigade | undefined
  getBrigadeByCode: (code: string) => Brigade | undefined
  getBrigadeForUser: (userKey: string) => Brigade | undefined
  getBrigadesForForeman: (foremanUserKey: string) => Brigade[]

  recordContribution: (entry: Omit<BrigadeContribution, 'id' | 'reportedAt'>) => BrigadeContribution
  getContributionsForTask: (taskId: string) => BrigadeContribution[]
  getContributionsForBrigade: (brigadeId: string, taskIds?: string[]) => BrigadeContribution[]
}

function allBrigadeCodes(brigades: Brigade[]): Set<string> {
  const codes = new Set<string>()
  for (const b of brigades) codes.add(normalizePersonCode(b.brigadeCode))
  return codes
}

function brigadeId(): string {
  return `br-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

export const useBrigadeStore = create<BrigadeState>()(
  persist(
    (set, get) => ({
      brigades: [],
      contributions: [],

      createBrigade: (params) => {
        const code = generatePersonCode('БР', allBrigadeCodes(get().brigades))
        const entry: Brigade = {
          id: brigadeId(),
          leaderUserKey: params.leaderUserKey,
          leaderWorkerMemberId: params.leaderWorkerMemberId,
          leaderName: params.leaderName,
          name: `Бригада ${params.leaderName.split(/\s+/)[0] || params.leaderName}`,
          brigadeCode: code,
          specializationIds: params.specializationIds,
          memberUserKeys: [params.leaderUserKey],
          createdAt: new Date().toISOString(),
        }
        set({ brigades: [...get().brigades, entry] })
        usePersonProfileStore.getState().updateProfile(params.leaderUserKey, {
          workerBrigadeMode: 'brigadier',
          brigadeId: entry.id,
          brigadeCode: code,
        })
        return entry
      },

      joinByCode: (code, memberUserKey, memberName, _memberWorkerMemberId) => {
        const brigade = get().getBrigadeByCode(code)
        if (!brigade) return { ok: false, reason: 'Код бригады не найден (БР-XXXX)' }
        if (brigade.memberUserKeys.includes(memberUserKey)) {
          return { ok: true, brigade }
        }
        if (memberUserKey === brigade.leaderUserKey) {
          return { ok: false, reason: 'Вы бригадир этой бригады' }
        }
        const updated: Brigade = {
          ...brigade,
          memberUserKeys: [...brigade.memberUserKeys, memberUserKey],
        }
        set({
          brigades: get().brigades.map((b) => (b.id === brigade.id ? updated : b)),
        })
        usePersonProfileStore.getState().updateProfile(memberUserKey, {
          workerBrigadeMode: 'member',
          brigadeId: brigade.id,
        })
        notifyBrigadeMemberJoined({
          brigadeId: brigade.id,
          memberName,
          leaderUserKey: brigade.leaderUserKey,
        })
        return { ok: true, brigade: updated }
      },

      addMember: (brigadeId, memberUserKey, memberName, _memberWorkerMemberId) => {
        const brigade = get().getBrigade(brigadeId)
        if (!brigade) return { ok: false, reason: 'Бригада не найдена' }
        if (brigade.memberUserKeys.includes(memberUserKey)) return { ok: true }
        const updated: Brigade = {
          ...brigade,
          memberUserKeys: [...brigade.memberUserKeys, memberUserKey],
        }
        set({
          brigades: get().brigades.map((b) => (b.id === brigadeId ? updated : b)),
        })
        usePersonProfileStore.getState().updateProfile(memberUserKey, {
          workerBrigadeMode: 'member',
          brigadeId,
        })
        notifyBrigadeMemberJoined({ brigadeId, memberName, leaderUserKey: brigade.leaderUserKey })
        return { ok: true }
      },

      removeMember: (brigadeId, memberUserKey) => {
        const brigade = get().getBrigade(brigadeId)
        if (!brigade || memberUserKey === brigade.leaderUserKey) return
        set({
          brigades: get().brigades.map((b) =>
            b.id === brigadeId
              ? { ...b, memberUserKeys: b.memberUserKeys.filter((k) => k !== memberUserKey) }
              : b,
          ),
        })
        usePersonProfileStore.getState().updateProfile(memberUserKey, {
          workerBrigadeMode: 'solo',
          brigadeId: undefined,
        })
      },

      getBrigade: (id) => get().brigades.find((b) => b.id === id),

      getBrigadeByCode: (code) => {
        const n = normalizePersonCode(code)
        return get().brigades.find((b) => normalizePersonCode(b.brigadeCode) === n)
      },

      getBrigadeForUser: (userKey) =>
        get().brigades.find((b) => b.memberUserKeys.includes(userKey)),

      getBrigadesForForeman: (foremanUserKey) => {
        const profiles = usePersonProfileStore.getState().profiles
        const leaderKeys = new Set<string>()
        for (const p of Object.values(profiles)) {
          if (p.foremanUserKey === foremanUserKey && p.workerBrigadeMode === 'brigadier') {
            leaderKeys.add(p.userKey)
          }
        }
        const { teamMembers } = useObjectStore.getState()
        for (const m of teamMembers) {
          if (m.foremanUserKey === foremanUserKey && m.userKey) {
            const p = profiles[m.userKey]
            if (p?.workerBrigadeMode === 'brigadier') leaderKeys.add(m.userKey)
          }
        }
        return get().brigades.filter((b) => leaderKeys.has(b.leaderUserKey))
      },

      recordContribution: (entry) => {
        const row: BrigadeContribution = {
          ...entry,
          id: `bc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          reportedAt: new Date().toISOString(),
        }
        set({ contributions: [...get().contributions, row] })
        return row
      },

      getContributionsForTask: (taskId) =>
        get().contributions.filter((c) => c.taskId === taskId),

      getContributionsForBrigade: (brigadeId, taskIds) => {
        let list = get().contributions.filter((c) => c.brigadeId === brigadeId)
        if (taskIds?.length) {
          const set = new Set(taskIds)
          list = list.filter((c) => set.has(c.taskId))
        }
        return list
      },
    }),
    {
      name: STORAGE_KEYS.BRIGADES,
      storage: createJSONStorage(() => createZustandStorage()),
      version: 1,
    },
  ),
)
