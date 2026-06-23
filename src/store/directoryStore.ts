import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type { AppRole, SavedAccount } from '@store/userStore'
import type { SpecializationId } from '@/constants/specializations'
import { specialtyTextFromIds } from '@/constants/specializations'
import { normalizePersonCode } from '@utils/personCodes'
import type { OrgMember } from '@store/organizationStore'
import type { PersonProfile } from '@/types/person'
import { loadOrganizationRegistry } from '@utils/orgRegistry'

export interface DirectoryOrg {
  contractorId: string
  name: string
  phone: string
  inn: string
  inviteCode: string
  userKey: string
  specialty: string
  specializationIds: SpecializationId[]
  updatedAt: string
}

export interface DirectoryPerson {
  userKey: string
  role: AppRole
  fullName: string
  phone: string
  login: string
  personalCode: string
  contractorId: string
  organizationId: string
  organizationName: string
  foremanUserKey: string
  specialty: string
  specializationIds: SpecializationId[]
  facePhoto: string
  inn: string
  workerMemberId: string
  status: 'active' | 'pending'
  updatedAt: string
}

export interface DirectoryLink {
  id: string
  contractorId: string
  childUserKey: string
  parentUserKey: string | null
  memberRole: 'foreman' | 'worker'
  status: 'active' | 'pending'
  linkedAt: string
}

interface DirectoryState {
  people: Record<string, DirectoryPerson>
  orgs: Record<string, DirectoryOrg>
  links: DirectoryLink[]

  syncFromStores: (accounts: SavedAccount[], profiles: Record<string, PersonProfile>, members: OrgMember[]) => void
  upsertPerson: (person: DirectoryPerson) => void
  upsertOrg: (org: DirectoryOrg) => void
  addLink: (link: Omit<DirectoryLink, 'id' | 'linkedAt'> & { id?: string }) => void

  findOrgByCode: (code: string) => DirectoryOrg | undefined
  findPersonByCode: (code: string) => DirectoryPerson | undefined
  getOrganizations: () => DirectoryOrg[]
  searchOrganizations: (query: string) => DirectoryOrg[]
  getForemenForOrg: (contractorId: string) => DirectoryPerson[]
  getWorkersForForeman: (foremanUserKey: string) => DirectoryPerson[]
  getWorkersForOrg: (contractorId: string) => DirectoryPerson[]
}

function linkId(): string {
  return `dl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function personFromAccount(account: SavedAccount): DirectoryPerson {
  return {
    userKey: account.userKey,
    role: account.role,
    fullName: account.fullName,
    phone: account.phone,
    login: account.login || account.phone,
    personalCode: account.personalCode,
    contractorId: account.contractorId,
    organizationId: account.organizationId,
    organizationName: account.organizationName,
    foremanUserKey: account.foremanUserKey,
    specialty: specialtyTextFromIds(account.specializationIds),
    specializationIds: account.specializationIds,
    facePhoto: account.facePhoto,
    inn: account.inn ?? '',
    workerMemberId: account.workerMemberId,
    status: account.organizationLinkStatus === 'pending' ? 'pending' : 'active',
    updatedAt: account.updatedAt,
  }
}

function personFromProfile(profile: PersonProfile, account?: SavedAccount): DirectoryPerson {
  return {
    userKey: profile.userKey,
    role: profile.role,
    fullName: profile.fullName,
    phone: profile.phone,
    login: account?.login || profile.phone,
    personalCode: profile.personalCode,
    contractorId: profile.contractorId ?? account?.contractorId ?? '',
    organizationId: profile.organizationId ?? account?.organizationId ?? '',
    organizationName: account?.organizationName ?? '',
    foremanUserKey: profile.foremanUserKey ?? account?.foremanUserKey ?? '',
    specialty: specialtyTextFromIds(profile.specializationIds),
    specializationIds: profile.specializationIds,
    facePhoto: profile.facePhoto,
    inn: account?.inn ?? '',
    workerMemberId: profile.workerMemberId ?? account?.workerMemberId ?? '',
    status: account?.organizationLinkStatus === 'pending' ? 'pending' : 'active',
    updatedAt: account?.updatedAt ?? profile.createdAt,
  }
}

export const useDirectoryStore = create<DirectoryState>()(
  persist(
    (set, get) => ({
      people: {},
      orgs: {},
      links: [],

      syncFromStores: (accounts, profiles, members) => {
        const people: Record<string, DirectoryPerson> = { ...get().people }
        const orgs: Record<string, DirectoryOrg> = { ...get().orgs }
        const links: DirectoryLink[] = [...get().links]

        const accountByKey = new Map(accounts.map((a) => [a.userKey, a]))

        for (const account of accounts) {
          people[account.userKey] = personFromAccount(account)

          if (account.role === 'foreman' && account.organizationId && account.organizationLinkStatus === 'approved') {
            const linkKey = `${account.organizationId}|${account.userKey}`
            if (!links.some((l) => l.id === linkKey)) {
              links.push({
                id: linkKey,
                contractorId: account.organizationId,
                childUserKey: account.userKey,
                parentUserKey: null,
                memberRole: 'foreman',
                status: 'active',
                linkedAt: account.updatedAt,
              })
            }
          }

          if (account.role === 'worker' && account.foremanUserKey) {
            const orgId = account.organizationId || account.contractorId
            const linkKey = `w|${account.foremanUserKey}|${account.userKey}`
            if (!links.some((l) => l.id === linkKey)) {
              links.push({
                id: linkKey,
                contractorId: orgId,
                childUserKey: account.userKey,
                parentUserKey: account.foremanUserKey,
                memberRole: 'worker',
                status: 'active',
                linkedAt: account.updatedAt,
              })
            }
          }

          if (account.role === 'subcontractor' && account.contractorId) {
            orgs[account.contractorId] = {
              contractorId: account.contractorId,
              name: (account.organizationName || account.fullName).trim(),
              phone: account.phone,
              inn: account.inn ?? '',
              inviteCode: account.personalCode,
              userKey: account.userKey,
              specialty: specialtyTextFromIds(account.specializationIds),
              specializationIds: account.specializationIds,
              updatedAt: account.updatedAt,
            }
          }
        }

        for (const profile of Object.values(profiles)) {
          const acc = accountByKey.get(profile.userKey)
          const person = personFromProfile(profile, acc)
          const prev = people[profile.userKey]
          if (!prev || person.updatedAt >= prev.updatedAt) {
            people[profile.userKey] = person
          }

          if (profile.role === 'subcontractor') {
            const id = profile.contractorId ?? profile.organizationId
            if (id) {
              orgs[id] = {
                contractorId: id,
                name: (acc?.organizationName || profile.fullName).trim(),
                phone: profile.phone,
                inn: acc?.inn ?? '',
                inviteCode: profile.personalCode,
                userKey: profile.userKey,
                specialty: specialtyTextFromIds(profile.specializationIds),
                specializationIds: profile.specializationIds,
                updatedAt: acc?.updatedAt ?? profile.createdAt,
              }
            }
          }
        }

        for (const entry of Object.values(loadOrganizationRegistry())) {
          if (!entry.id) continue
          const existing = orgs[entry.id]
          orgs[entry.id] = {
            contractorId: entry.id,
            name: entry.name || existing?.name || 'Организация',
            phone: entry.phone ?? existing?.phone ?? '',
            inn: existing?.inn ?? '',
            inviteCode: entry.inviteCode ?? existing?.inviteCode ?? '',
            userKey: entry.userKey ?? existing?.userKey ?? '',
            specialty: entry.specialty || existing?.specialty || '',
            specializationIds: entry.specializationIds ?? existing?.specializationIds ?? [],
            updatedAt: entry.updatedAt,
          }
        }

        for (const m of members) {
          people[m.userKey] = {
            userKey: m.userKey,
            role: m.memberRole === 'foreman' ? 'foreman' : 'worker',
            fullName: m.fullName,
            phone: m.phone,
            login: accountByKey.get(m.userKey)?.login || m.phone,
            personalCode: m.personalCode ?? accountByKey.get(m.userKey)?.personalCode ?? '',
            contractorId: m.contractorId,
            organizationId: m.contractorId,
            organizationName: orgs[m.contractorId]?.name ?? '',
            foremanUserKey: m.foremanUserKey ?? '',
            specialty: specialtyTextFromIds(m.specializationIds),
            specializationIds: m.specializationIds,
            facePhoto: m.facePhoto ?? '',
            inn: '',
            workerMemberId: m.workerMemberId ?? '',
            status: 'active',
            updatedAt: m.linkedAt,
          }

          const linkKey = `${m.contractorId}|${m.userKey}`
          if (!links.some((l) => l.id === linkKey)) {
            links.push({
              id: linkKey,
              contractorId: m.contractorId,
              childUserKey: m.userKey,
              parentUserKey: m.memberRole === 'worker' ? m.foremanUserKey ?? null : null,
              memberRole: m.memberRole,
              status: 'active',
              linkedAt: m.linkedAt,
            })
          }
        }

        set({ people, orgs, links })
      },

      upsertPerson: (person) => {
        set((s) => ({
          people: { ...s.people, [person.userKey]: person },
        }))
      },

      upsertOrg: (org) => {
        set((s) => ({
          orgs: { ...s.orgs, [org.contractorId]: org },
        }))
      },

      addLink: (link) => {
        const id = link.id ?? linkId()
        set((s) => ({
          links: [
            ...s.links.filter((l) => l.id !== id && l.childUserKey !== link.childUserKey),
            { ...link, id, linkedAt: new Date().toISOString() },
          ],
        }))
      },

      findOrgByCode: (code) => {
        const norm = normalizePersonCode(code)
        if (!norm) return undefined
        return Object.values(get().orgs).find(
          (o) => normalizePersonCode(o.inviteCode) === norm,
        )
      },

      findPersonByCode: (code) => {
        const norm = normalizePersonCode(code)
        if (!norm) return undefined
        return Object.values(get().people).find(
          (p) => normalizePersonCode(p.personalCode) === norm,
        )
      },

      getOrganizations: () =>
        Object.values(get().orgs).sort((a, b) => a.name.localeCompare(b.name, 'ru')),

      searchOrganizations: (query) => {
        const q = query.trim().toLowerCase()
        const all = get().getOrganizations()
        if (!q) return all
        const normQ = normalizePersonCode(q)
        return all.filter(
          (o) =>
            o.name.toLowerCase().includes(q)
            || (o.inn && o.inn.includes(q))
            || normalizePersonCode(o.inviteCode).includes(normQ),
        )
      },

      getForemenForOrg: (contractorId) =>
        Object.values(get().people).filter(
          (p) =>
            p.role === 'foreman'
            && (p.contractorId === contractorId || p.organizationId === contractorId)
            && p.status === 'active',
        ),

      getWorkersForForeman: (foremanUserKey) =>
        Object.values(get().people).filter(
          (p) => p.role === 'worker' && p.foremanUserKey === foremanUserKey,
        ),

      getWorkersForOrg: (contractorId) =>
        Object.values(get().people).filter(
          (p) => p.role === 'worker' && p.contractorId === contractorId,
        ),
    }),
    {
      name: STORAGE_KEYS.DIRECTORY,
      storage: createJSONStorage(() => createZustandStorage()),
      version: 1,
      skipHydration: true,
    },
  ),
)
