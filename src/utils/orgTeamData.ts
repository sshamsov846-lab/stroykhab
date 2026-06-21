import type { SpecializationId } from '@/constants/specializations'
import type { ProjectTask } from '@/types/projectWorkflow'
import type { Brigade } from '@/types/brigade'
import type { OrgMember } from '@store/organizationStore'
import type { TeamMember } from '@store/objectStore'
import { useOrganizationStore } from '@store/organizationStore'
import { useObjectStore } from '@store/objectStore'
import { usePersonProfileStore } from '@store/personProfileStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'
import { useForemanPayrollStore } from '@store/foremanPayrollStore'
import { useBrigadeStore } from '@store/brigadeStore'
import { useAttendanceStore } from '@store/attendanceStore'
import { foremanIdFromPhone } from '@utils/foremanId'
import { getAccountSummary } from '@utils/workerPayrollCalc'
import { getForemanAccountSummary } from '@utils/foremanPayrollCalc'
import { specializationLabel } from '@/constants/specializations'
import type { WorkerBrigadeMode } from '@/types/brigade'

export type ActivityStatus = 'working' | 'free' | 'off'

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  working: '🟢 работает',
  free: '🟡 свободен',
  off: '🔘 не на смене',
}

export interface OrgTeamFilters {
  search: string
  specializationId: SpecializationId | ''
  status: ActivityStatus | 'all'
  objectId: string
}

export interface OrgWorkerRow {
  id: string
  userKey?: string
  name: string
  phone?: string
  facePhoto?: string
  personalCode?: string
  specializationIds: SpecializationId[]
  specializationText: string
  typeLabel: string
  foremanUserKey?: string
  foremanName?: string
  brigadeId?: string
  brigadeName?: string
  currentObjectId?: string
  currentObjectName?: string
  currentTaskId?: string
  currentTaskTitle?: string
  totalEarned: number
  balance: number
  status: ActivityStatus
}

export interface OrgForemanRow {
  id: string
  userKey: string
  foremanId: string
  name: string
  phone: string
  facePhoto?: string
  personalCode?: string
  specializationIds: SpecializationId[]
  specializationText: string
  status: ActivityStatus
  currentObjects: { id: string; name: string }[]
  masterCount: number
  totalEarned: number
  balance: number
  brigades: Brigade[]
  soloWorkers: OrgWorkerRow[]
  brigadeWorkers: OrgWorkerRow[]
}

export interface OrgTeamSummary {
  foremanCount: number
  workerCount: number
  onObjectsNow: number
  payrollFundPeriod: number
  objectOptions: { id: string; name: string }[]
}

function workerTypeLabel(
  mode?: WorkerBrigadeMode,
  employment?: TeamMember['workerEmploymentType'],
  isBrigadeLeader?: boolean,
): string {
  if (isBrigadeLeader || mode === 'brigadier') return 'Бригадир'
  if (mode === 'member') return 'В бригаде'
  if (employment === 'hourly') return 'Почасовик'
  return 'Одиночка'
}

function resolveWorkerStatus(workerId: string, taskIds: string[]): ActivityStatus {
  const onSite = useAttendanceStore.getState().checkIns.some((c) => c.workerId === workerId && !c.leftAt)
  if (onSite) return 'working'

  const tasks = useProjectWorkflowStore.getState().tasks
  for (const tid of taskIds) {
    const t = tasks[tid]
    if (!t || t.status === 'done') continue
    if (t.status === 'in_progress') return 'working'
  }
  for (const tid of taskIds) {
    const t = tasks[tid]
    if (t && t.status !== 'done') return 'free'
  }
  return 'off'
}

function taskIdsForWorker(workerId: string, contractorId: string): string[] {
  const { workerTaskAssignments, contractorWorkerAssignments } = useObjectStore.getState()
  const tasks = useProjectWorkflowStore.getState().tasks
  const ids: string[] = []
  for (const [taskId, wid] of Object.entries(workerTaskAssignments)) {
    if (wid === workerId) ids.push(taskId)
  }
  for (const [taskId, wid] of Object.entries(contractorWorkerAssignments)) {
    if (wid === workerId) {
      const t = tasks[taskId]
      if (t?.contractorId === contractorId) ids.push(taskId)
    }
  }
  return [...new Set(ids)]
}

function currentTaskForWorker(workerId: string, contractorId: string): ProjectTask | undefined {
  const tasks = useProjectWorkflowStore.getState().tasks
  const ids = taskIdsForWorker(workerId, contractorId)
  const active = ids
    .map((id) => tasks[id])
    .filter((t): t is ProjectTask => !!t && t.status !== 'done')
    .sort((a) => (a.status === 'in_progress' ? -1 : 1))
  return active[0]
}

function buildWorkerRow(
  member: TeamMember | OrgMember,
  contractorId: string,
  foremanNameMap: Map<string, string>,
  brigadeByUserKey: Map<string, Brigade>,
): OrgWorkerRow {
  const workerId = 'workerMemberId' in member && member.workerMemberId
    ? member.workerMemberId
    : member.id
  const userKey = 'userKey' in member ? member.userKey : (member as TeamMember).userKey
  const profile = userKey ? usePersonProfileStore.getState().getByUserKey(userKey) : undefined
  const account = useWorkerPayrollStore.getState().accounts[workerId]
  const summary = account ? getAccountSummary(account) : { accrued: 0, debt: 0, bonuses: 0, fines: 0, advances: 0 }
  const task = currentTaskForWorker(workerId, contractorId)
  const obj = task?.objectId
    ? useObjectStore.getState().userObjects.find((o) => o.id === task.objectId)
    : undefined
  const brigade = userKey ? brigadeByUserKey.get(userKey) : undefined
  const foremanKey = profile?.foremanUserKey ?? (member as TeamMember).foremanUserKey

  return {
    id: workerId,
    userKey,
    name: profile?.fullName ?? ('fullName' in member ? member.fullName : member.name),
    phone: profile?.phone ?? member.phone,
    facePhoto: profile?.facePhoto ?? member.facePhoto,
    personalCode: profile?.personalCode ?? member.personalCode,
    specializationIds: profile?.specializationIds ?? member.specializationIds ?? [],
    specializationText: specializationLabel((profile?.specializationIds ?? member.specializationIds ?? [])[0] ?? 'universal'),
    typeLabel: workerTypeLabel(
      profile?.workerBrigadeMode,
      profile?.workerEmploymentType ?? (member as TeamMember).workerEmploymentType,
      profile?.workerBrigadeMode === 'brigadier',
    ),
    foremanUserKey: foremanKey,
    foremanName: foremanKey ? foremanNameMap.get(foremanKey) : undefined,
    brigadeId: brigade?.id,
    brigadeName: brigade?.name,
    currentObjectId: task?.objectId,
    currentObjectName: obj?.name ?? task?.house,
    currentTaskId: task?.id,
    currentTaskTitle: task?.title,
    totalEarned: summary.accrued + summary.bonuses,
    balance: summary.debt,
    status: resolveWorkerStatus(workerId, taskIdsForWorker(workerId, contractorId)),
  }
}

export function buildOrgTeamData(contractorId: string): {
  summary: OrgTeamSummary
  foremen: OrgForemanRow[]
  workers: OrgWorkerRow[]
} {
  const orgMembers = useOrganizationStore.getState().getMembersForContractor(contractorId)
  const orgForemen = orgMembers.filter((m) => m.memberRole === 'foreman')
  const contractorWorkers = useObjectStore.getState().getContractorWorkers(contractorId)
  const teamMembers = useObjectStore.getState().teamMembers
  const profiles = usePersonProfileStore.getState().profiles
  const userObjects = useObjectStore.getState().userObjects
  const taskObjectIds = new Set<string>()
  for (const t of Object.values(useProjectWorkflowStore.getState().tasks)) {
    if (t.contractorId === contractorId && t.objectId) taskObjectIds.add(t.objectId)
  }
  const objectOptions = userObjects
    .filter((o) => taskObjectIds.has(o.id))
    .map((o) => ({ id: o.id, name: o.name }))

  const foremanNameMap = new Map<string, string>()
  for (const f of orgForemen) {
    foremanNameMap.set(f.userKey, f.fullName)
    const p = profiles[f.userKey]
    if (p) foremanNameMap.set(f.userKey, p.fullName)
  }

  const brigadeByUserKey = new Map<string, Brigade>()
  const brigadeMemberKeys = new Set<string>()
  for (const b of useBrigadeStore.getState().brigades) {
    for (const k of b.memberUserKeys) {
      brigadeMemberKeys.add(k)
      brigadeByUserKey.set(k, b)
    }
  }

  const workerMap = new Map<string, OrgWorkerRow>()

  const addWorkerSource = (m: TeamMember | OrgMember) => {
    const row = buildWorkerRow(m, contractorId, foremanNameMap, brigadeByUserKey)
    if (!workerMap.has(row.id)) workerMap.set(row.id, row)
  }

  for (const w of contractorWorkers) addWorkerSource(w)
  for (const m of orgMembers.filter((x) => x.memberRole === 'worker')) {
    if (m.workerMemberId) {
      addWorkerSource({
        id: m.workerMemberId,
        name: m.fullName,
        role: 'Мастер',
        phone: m.phone,
        specializationIds: m.specializationIds,
        facePhoto: m.facePhoto,
        personalCode: m.personalCode,
        userKey: m.userKey,
        foremanUserKey: m.foremanUserKey,
        workerEmploymentType: m.workerEmploymentType,
      })
    }
  }
  for (const tm of teamMembers) {
    if (tm.foremanUserKey && foremanNameMap.has(tm.foremanUserKey)) addWorkerSource(tm)
  }

  const allWorkers = [...workerMap.values()]

  const foremen: OrgForemanRow[] = orgForemen.map((f) => {
    const foremanId = foremanIdFromPhone(f.phone) || f.id
    const faccount = useForemanPayrollStore.getState().accounts[foremanId]
    const fsummary = faccount ? getForemanAccountSummary(faccount) : { accrued: 0, balance: 0, bonuses: 0, fines: 0, advances: 0 }
    const brigades = useBrigadeStore.getState().getBrigadesForForeman(f.userKey)
    const underForeman = allWorkers.filter((w) => w.foremanUserKey === f.userKey)
    const brigadeWorkerIds = new Set<string>()
    for (const b of brigades) {
      for (const k of b.memberUserKeys) {
        const w = allWorkers.find((x) => x.userKey === k)
        if (w) brigadeWorkerIds.add(w.id)
      }
    }
    const soloWorkers = underForeman.filter((w) => !w.userKey || !brigadeMemberKeys.has(w.userKey))
    const brigadeWorkers = underForeman.filter((w) => w.userKey && brigadeMemberKeys.has(w.userKey))

    const objectSet = new Map<string, string>()
    for (const w of underForeman) {
      if (w.currentObjectId && w.currentObjectName) objectSet.set(w.currentObjectId, w.currentObjectName)
    }

    const foremanWorkerId = f.workerMemberId
    const status = foremanWorkerId
      ? resolveWorkerStatus(foremanWorkerId, taskIdsForWorker(foremanWorkerId, contractorId))
      : underForeman.some((w) => w.status === 'working')
        ? 'working'
        : underForeman.some((w) => w.status === 'free')
          ? 'free'
          : 'off'

    return {
      id: f.id,
      userKey: f.userKey,
      foremanId,
      name: f.fullName,
      phone: f.phone,
      facePhoto: f.facePhoto ?? profiles[f.userKey]?.facePhoto,
      personalCode: f.personalCode ?? profiles[f.userKey]?.personalCode,
      specializationIds: f.specializationIds,
      specializationText: specializationLabel(f.specializationIds[0] ?? 'universal'),
      status,
      currentObjects: [...objectSet.entries()].map(([id, name]) => ({ id, name })),
      masterCount: underForeman.length,
      totalEarned: fsummary.accrued + fsummary.bonuses,
      balance: fsummary.balance,
      brigades,
      soloWorkers,
      brigadeWorkers,
    }
  })

  const onObjectsNow = allWorkers.filter((w) => w.status === 'working').length
  const payrollFundPeriod = allWorkers.reduce((s, w) => s + w.totalEarned, 0)
    + foremen.reduce((s, f) => s + f.totalEarned, 0)

  return {
    summary: {
      foremanCount: foremen.length,
      workerCount: allWorkers.length,
      onObjectsNow,
      payrollFundPeriod,
      objectOptions,
    },
    foremen,
    workers: allWorkers.sort((a, b) => a.name.localeCompare(b.name, 'ru')),
  }
}

export function filterForemen(rows: OrgForemanRow[], f: OrgTeamFilters): OrgForemanRow[] {
  return rows.filter((row) => {
    if (f.search) {
      const q = f.search.toLowerCase()
      if (!row.name.toLowerCase().includes(q) && !(row.personalCode ?? '').toLowerCase().includes(q)) return false
    }
    if (f.specializationId && !row.specializationIds.includes(f.specializationId)) return false
    if (f.status !== 'all' && row.status !== f.status) return false
    if (f.objectId && !row.currentObjects.some((o) => o.id === f.objectId)) return false
    return true
  })
}

export function filterWorkers(rows: OrgWorkerRow[], f: OrgTeamFilters): OrgWorkerRow[] {
  return rows.filter((row) => {
    if (f.search) {
      const q = f.search.toLowerCase()
      if (!row.name.toLowerCase().includes(q) && !(row.personalCode ?? '').toLowerCase().includes(q)) return false
    }
    if (f.specializationId && !row.specializationIds.includes(f.specializationId)) return false
    if (f.status !== 'all' && row.status !== f.status) return false
    if (f.objectId && row.currentObjectId !== f.objectId) return false
    return true
  })
}

export function workHistoryForWorker(workerId: string, contractorId: string) {
  const tasks = useProjectWorkflowStore.getState().tasks
  const ids = taskIdsForWorker(workerId, contractorId)
  const account = useWorkerPayrollStore.getState().accounts[workerId]
  return ids
    .map((id) => {
      const t = tasks[id]
      if (!t) return null
      const accrual = account?.accruals.find((a) => a.taskId === id)
      const obj = useObjectStore.getState().userObjects.find((o) => o.id === t.objectId)
      return {
        taskId: id,
        title: t.title,
        objectName: obj?.name ?? t.house,
        status: t.status,
        completedAt: accrual?.acceptedAt ?? (t.status === 'done' ? t.dueDate : undefined),
        volume: accrual?.completedVolume,
        volumeUnit: accrual?.volumeUnit,
        amount: accrual?.amount,
      }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
}

export function workHistoryForForeman(foremanUserKey: string, contractorId: string) {
  const foremanMember = useOrganizationStore.getState()
    .getForemenForContractor(contractorId)
    .find((f) => f.userKey === foremanUserKey)
  const foremanId = foremanMember ? foremanIdFromPhone(foremanMember.phone) : foremanUserKey
  const account = useForemanPayrollStore.getState().accounts[foremanId]
  if (!account) return []
  return account.accruals.map((a) => ({
    taskId: a.taskId,
    title: a.taskTitle,
    objectName: a.objectName ?? 'Объект',
    completedAt: a.acceptedAt,
    volume: a.completedVolume,
    volumeUnit: a.volumeUnit,
    amount: a.amount,
    workType: a.workType,
  })).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
}
