import React, { useMemo, useState } from 'react'
import { Plus, Users, KeyRound, Copy, Check, Clock, HardHat } from 'lucide-react'
import toast from 'react-hot-toast'
import { SubcontractorHeader } from '@components/subcontractor/SubcontractorHeader'
import { BigButton } from '@components/BigButton'
import { useUserStore } from '@store/userStore'
import { useObjectStore } from '@store/objectStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useOrganizationStore } from '@store/organizationStore'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'
import { useForemanPayrollStore } from '@store/foremanPayrollStore'
import { useBrigadeStore } from '@store/brigadeStore'
import { useAttendanceStore } from '@store/attendanceStore'
import { usePersonProfileStore } from '@store/personProfileStore'
import { specializationLabels } from '@/constants/specializations'
import { OrgTeamStatsBanner } from '@components/orgTeam/OrgTeamStatsBanner'
import { OrgTeamFiltersBar } from '@components/orgTeam/OrgTeamFiltersBar'
import { OrgForemanTeamCard } from '@components/orgTeam/OrgForemanTeamCard'
import { OrgWorkerTeamCard } from '@components/orgTeam/OrgWorkerTeamCard'
import {
  buildOrgTeamData,
  filterForemen,
  filterWorkers,
  type OrgTeamFilters,
} from '@utils/orgTeamData'

const emptyFilters: OrgTeamFilters = {
  search: '',
  specializationId: '',
  status: 'all',
  objectId: '',
}

export const SubcontractorTeam: React.FC = () => {
  const contractorId = useUserStore((s) => s.contractorId) ?? ''
  const personalCode = useUserStore((s) => s.personalCode)
  const org = useProjectWorkflowStore((s) => s.contractors.find((c) => c.id === contractorId))
  const pendingRequests = useOrganizationStore((s) => s.getPendingRequests(contractorId))
  const approveRequest = useOrganizationStore((s) => s.approveJoinRequest)
  const rejectRequest = useOrganizationStore((s) => s.rejectJoinRequest)

  const addWorker = useObjectStore((s) => s.addContractorWorker)
  const contractorWorkers = useObjectStore((s) => s.getContractorWorkers(contractorId))
  const teamMembers = useObjectStore((s) => s.teamMembers)
  const tasks = useProjectWorkflowStore((s) => s.tasks)
  const orgMembers = useOrganizationStore((s) => s.members)
  const workerAccounts = useWorkerPayrollStore((s) => s.accounts)
  const foremanAccounts = useForemanPayrollStore((s) => s.accounts)
  const brigades = useBrigadeStore((s) => s.brigades)
  const checkIns = useAttendanceStore((s) => s.checkIns)
  const profiles = usePersonProfileStore((s) => s.profiles)

  const [foremanFilters, setForemanFilters] = useState<OrgTeamFilters>(emptyFilters)
  const [workerFilters, setWorkerFilters] = useState<OrgTeamFilters>(emptyFilters)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [roleLabel, setRoleLabel] = useState('')
  const [phone, setPhone] = useState('')
  const [copied, setCopied] = useState(false)

  const teamData = useMemo(() => buildOrgTeamData(contractorId), [
    contractorId,
    contractorWorkers,
    pendingRequests,
    teamMembers,
    tasks,
    orgMembers,
    workerAccounts,
    foremanAccounts,
    brigades,
    checkIns,
    profiles,
  ])

  const foremen = useMemo(
    () => filterForemen(teamData.foremen, foremanFilters),
    [teamData.foremen, foremanFilters],
  )
  const workers = useMemo(
    () => filterWorkers(teamData.workers, workerFilters),
    [teamData.workers, workerFilters],
  )

  const displayCode = org?.inviteCode || personalCode

  const copyCode = async () => {
    if (!displayCode) return
    try {
      await navigator.clipboard.writeText(displayCode)
      setCopied(true)
      toast.success('Код скопирован')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Не удалось скопировать')
    }
  }

  const handleAdd = () => {
    if (!name.trim() || !contractorId) {
      toast.error('Укажите имя мастера')
      return
    }
    addWorker(contractorId, {
      name: name.trim(),
      role: roleLabel.trim() || 'Мастер',
      phone: phone.trim(),
      specialty: roleLabel.trim(),
    })
    toast.success('Мастер добавлен')
    setName('')
    setRoleLabel('')
    setPhone('')
    setShowAdd(false)
  }

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <SubcontractorHeader title="Моя команда" subtitle={org?.name} />

      <div className="px-4 py-4 space-y-4">
        <OrgTeamStatsBanner summary={teamData.summary} />

        {displayCode && (
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound size={18} className="text-primary-600" />
              <p className="text-sm-mobile font-semibold text-gray-900">Код организации</p>
            </div>
            <p className="text-2xl-mobile font-bold text-primary-700 tracking-wide">{displayCode}</p>
            <p className="text-xs-mobile text-gray-500 mt-1">Дайте код прорабам для подтверждения при регистрации</p>
            <button
              type="button"
              onClick={copyCode}
              className="mt-3 inline-flex items-center gap-2 text-primary-600 text-sm-mobile font-medium"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Скопировано' : 'Скопировать'}
            </button>
          </div>
        )}

        {pendingRequests.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-600" />
              <h2 className="text-base-mobile font-semibold text-gray-900">
                Запросы на привязку ({pendingRequests.length})
              </h2>
            </div>
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  {req.facePhoto ? (
                    <img src={req.facePhoto} alt={req.fullName} className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-amber-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-lg-mobile font-bold text-amber-700">
                      {req.fullName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm-mobile font-bold text-gray-900">{req.fullName}</p>
                    <p className="text-xs-mobile text-gray-600">
                      {req.memberRole === 'foreman' ? 'Прораб' : 'Мастер'}
                      {req.personalCode ? ` · ${req.personalCode}` : ''}
                    </p>
                    <p className="text-xs-mobile text-gray-500">{req.phone}</p>
                    <p className="text-xs-mobile text-gray-600 mt-1">{specializationLabels(req.specializationIds)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { approveRequest(req.id); toast.success('Запрос одобрен') }}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm-mobile font-medium"
                  >
                    Принять
                  </button>
                  <button
                    type="button"
                    onClick={() => { rejectRequest(req.id); toast.success('Запрос отклонён') }}
                    className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm-mobile font-medium"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <HardHat size={20} className="text-primary-600" />
            <h2 className="text-base-mobile font-semibold text-gray-900">
              Прорабы ({foremen.length})
            </h2>
          </div>
          <OrgTeamFiltersBar
            filters={foremanFilters}
            onChange={(p) => setForemanFilters((f) => ({ ...f, ...p }))}
            objectOptions={teamData.summary.objectOptions}
          />
          {foremen.length === 0 ? (
            <p className="text-sm-mobile text-gray-500 text-center py-6">
              Прорабы появятся после регистрации с кодом организации
            </p>
          ) : (
            foremen.map((f) => <OrgForemanTeamCard key={f.userKey} foreman={f} />)
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-gray-600" />
              <h2 className="text-base-mobile font-semibold text-gray-900">
                Мастера ({workers.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAdd(!showAdd)}
              className="text-primary-600 text-sm-mobile font-medium flex items-center gap-1"
            >
              <Plus size={16} />
              Добавить
            </button>
          </div>
          <OrgTeamFiltersBar
            filters={workerFilters}
            onChange={(p) => setWorkerFilters((f) => ({ ...f, ...p }))}
            objectOptions={teamData.summary.objectOptions}
          />

          {showAdd && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ФИО" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile" />
              <input value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} placeholder="Специальность" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон" type="tel" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile" />
              <BigButton variant="primary" size="md" fullWidth onClick={handleAdd}>Сохранить</BigButton>
            </div>
          )}

          {workers.length === 0 ? (
            <p className="text-sm-mobile text-gray-500 text-center py-8">
              Мастера появятся после привязки к прорабам
            </p>
          ) : (
            workers.map((w) => <OrgWorkerTeamCard key={w.id} worker={w} />)
          )}
        </section>
      </div>
    </div>
  )
}
