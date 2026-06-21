import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { PersonProfile } from '@/types/person'
import { generatePersonCode, normalizePersonCode } from '@utils/personCodes'
import type { PersonCodePrefix } from '@utils/personCodes'
import { useOrganizationStore } from '@store/organizationStore'

interface PersonProfileState {
  profiles: Record<string, PersonProfile>

  registerProfile: (profile: PersonProfile) => void
  getByUserKey: (userKey: string) => PersonProfile | undefined
  getByCode: (code: string) => PersonProfile | undefined
  getAllCodes: () => Set<string>
  allocateCode: (prefix: PersonCodePrefix) => string
  getForemenProfilesForOrg: (contractorId: string) => PersonProfile[]
  updateProfile: (userKey: string, patch: Partial<PersonProfile>) => void
}

export const usePersonProfileStore = create<PersonProfileState>()(
  persist(
    (set, get) => ({
      profiles: {},

      registerProfile: (profile) => {
        set({
          profiles: {
            ...get().profiles,
            [profile.userKey]: profile,
          },
        })
      },

      getByUserKey: (userKey) => get().profiles[userKey],

      getByCode: (code) => {
        const normalized = normalizePersonCode(code)
        return Object.values(get().profiles).find(
          (p) => normalizePersonCode(p.personalCode) === normalized,
        )
      },

      getAllCodes: () => {
        const codes = new Set<string>()
        for (const p of Object.values(get().profiles)) {
          codes.add(normalizePersonCode(p.personalCode))
        }
        return codes
      },

      allocateCode: (prefix) => {
        const codes = get().getAllCodes()
        return generatePersonCode(prefix, codes)
      },

      getForemenProfilesForOrg: (contractorId) => {
        const foremen = useOrganizationStore.getState().getForemenForContractor(contractorId)
        return foremen
          .map((m) => get().profiles[m.userKey])
          .filter((p): p is PersonProfile => !!p)
      },

      updateProfile: (userKey, patch) => {
        const existing = get().profiles[userKey]
        if (!existing) return
        set({
          profiles: {
            ...get().profiles,
            [userKey]: { ...existing, ...patch },
          },
        })
      },
    }),
    {
      name: STORAGE_KEYS.PERSON_PROFILES,
      storage: createJSONStorage(() => createZustandStorage()),
      version: 1,
    },
  ),
)
