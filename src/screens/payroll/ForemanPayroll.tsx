import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Users, Wallet, TrendingUp, List, Building2, SlidersHorizontal, FileText } from 'lucide-react'
import { useTelegram } from '@hooks/useTelegram'
import { useObjectStore } from '@store/objectStore'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'
import { useForemanPayrollStore } from '@store/foremanPayrollStore'
import { formatMoney, getAccountSummary } from '@utils/workerPayrollCalc'
import { buildForemanMoneyReport } from '@utils/payrollReports'
import { resolveCurrentForemanId, resolveCurrentForemanName } from '@utils/foremanId'
import { ForemanOrgAccountView } from '@components/payroll/ForemanOrgAccountView'
import { WorkTypeBreakdownSection } from '@components/payroll/WorkTypeBreakdownSection'
import { MoneyJournalPanel } from '@components/payroll/MoneyJournalPanel'
import { getObjects } from '@api/supabase'
import { filterObjectsForRole } from '@utils/sideJob'
import type { ConstructionObject } from '@types'
import { syncForemanAccrualsFromAcceptedTasks } from '@utils/payrollSync'
import { showPeriodActActions } from '@utils/paymentSettingsHelpers'
import { getCurrentUserKey } from '@utils/notificationFilter'

type Tab = 'org' | 'workers'

export const ForemanPayroll: React.FC = () => {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [tab, setTab] = useState<Tab>('org')

  const foremanId = resolveCurrentForemanId()
  const foremanName = resolveCurrentForemanName()

  const teamMembers = useObjectStore((s) => s.teamMembers)
  const allAccounts = useWorkerPayrollStore((s) => s.accounts)
  const foremanAccount = useForemanPayrollStore((s) => s.accounts[foremanId])
  const allForemanAccounts = useForemanPayrollStore((s) => s.getAllAccounts())

  const [objects, setObjects] = useState<ConstructionObject[]>([])

  useEffect(() => {
    getObjects().then((data) => setObjects(filterObjectsForRole(data, 'foreman')))
    syncForemanAccrualsFromAcceptedTasks()
  }, [])

  const foremanTeamAccounts = useMemo(() => {
    const ids = new Set(teamMembers.map((m) => m.id))
    for (const a of Object.values(allAccounts)) {
      if (!a.contractorId) ids.add(a.workerId)
    }
    return [...ids]
      .map((id) => allAccounts[id])
      .filter((a): a is NonNullable<typeof a> => !!a)
  }, [teamMembers, allAccounts])

  const moneyReport = useMemo(
    () => buildForemanMoneyReport(foremanAccount, foremanTeamAccounts),
    [foremanAccount, foremanTeamAccounts],
  )

  const workers = useMemo(() => {
    const ids = new Set(teamMembers.map((m) => m.id))
    for (const a of Object.values(allAccounts)) {
      if (!a.contractorId) ids.add(a.workerId)
    }
    return [...ids].map((id) => {
      const member = teamMembers.find((m) => m.id === id)
      const account = allAccounts[id] ?? {
        workerId: id,
        workerName: member?.name ?? 'Мастер',
        accruals: [],
        advances: [],
        fines: [],
        bonuses: [],
        updatedAt: '',
      }
      const summary = getAccountSummary(account)
      return { workerId: id, name: member?.name ?? account.workerName, ...summary }
    }).sort((a, b) => b.debt - a.debt)
  }, [teamMembers, allAccounts])

  const objectOptions = objects.map((o) => ({ id: o.id, name: o.name }))
  const periodActMode = showPeriodActActions(getCurrentUserKey())
  const firstObjectId = objects[0]?.id

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-primary-600 text-white px-4 pt-6 pb-4 rounded-b-3xl">
        <h1 className="text-xl-mobile font-bold">Мои деньги</h1>
        <p className="text-sm-mobile text-primary-100 mt-1">Организация · мастера · маржа</p>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => setTab('org')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm-mobile font-medium ${
              tab === 'org' ? 'bg-white text-primary-700' : 'bg-white/20 text-white'
            }`}
          >
            <Building2 size={16} /> От организации
          </button>
          <button
            type="button"
            onClick={() => setTab('workers')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm-mobile font-medium ${
              tab === 'workers' ? 'bg-white text-primary-700' : 'bg-white/20 text-white'
            }`}
          >
            <Users size={16} /> Мастерам
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-2">
        {tab === 'org' ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center col-span-2">
                <p className="text-[10px] text-gray-500">Баланс с организацией</p>
                <p className={`text-xl-mobile font-bold ${moneyReport.fromOrg.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {formatMoney(moneyReport.fromOrg.balance)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-[10px] text-gray-500">Вход (начислено)</p>
                <p className="text-sm-mobile font-bold text-gray-900">{formatMoney(moneyReport.fromOrg.received)}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-[10px] text-gray-500">Авансы от орг</p>
                <p className="text-sm-mobile font-bold text-gray-700">−{formatMoney(moneyReport.fromOrg.advances)}</p>
              </div>
            </div>
            <ForemanOrgAccountView foremanId={foremanId} foremanName={foremanName} />
            <button
              type="button"
              onClick={() => { haptic('light'); navigate('/payment-settings') }}
              className="w-full flex items-center justify-center gap-2 bg-white rounded-xl py-2.5 text-sm-mobile font-medium border border-gray-100"
            >
              <SlidersHorizontal size={18} /> Настройки оплаты
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center col-span-2 flex items-center justify-center gap-2">
                <TrendingUp size={18} className="text-emerald-700" />
                <div>
                  <p className="text-[10px] text-emerald-700">Маржа прораба</p>
                  <p className="text-lg-mobile font-bold text-emerald-900">{formatMoney(moneyReport.margin)}</p>
                  <p className="text-[10px] text-emerald-600">Вход от орг − выплаты мастерам</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-[10px] text-gray-500">Выход мастерам</p>
                <p className="text-sm-mobile font-bold text-gray-900">{formatMoney(moneyReport.toWorkers.accrued)}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-red-100 text-center">
                <p className="text-[10px] text-red-700">Долг мастерам</p>
                <p className="text-sm-mobile font-bold text-red-700">{formatMoney(moneyReport.toWorkers.totalDebt)}</p>
              </div>
            </div>

            <WorkTypeBreakdownSection rows={moneyReport.fromOrg.byWorkType} title="Вход по видам работ" />

            <button
              type="button"
              onClick={() => { haptic('light'); navigate('/payment-settings') }}
              className="w-full flex items-center justify-center gap-2 bg-white rounded-xl py-2.5 text-sm-mobile font-medium border border-gray-100"
            >
              <SlidersHorizontal size={18} /> Настройки оплаты
            </button>

            {periodActMode && firstObjectId && (
              <button
                type="button"
                onClick={() => { haptic('light'); navigate(`/object/${firstObjectId}/payment-acts`) }}
                className="w-full flex items-center justify-center gap-2 bg-primary-50 rounded-xl py-2.5 text-sm-mobile font-medium border border-primary-100 text-primary-700"
              >
                <FileText size={18} /> Сформировать акт за период
              </button>
            )}

            <button
              type="button"
              onClick={() => { haptic('light'); navigate('/foreman/calculator-reports') }}
              className="w-full flex items-center justify-center gap-2 bg-primary-50 rounded-xl py-2.5 text-sm-mobile font-medium border border-primary-100 text-primary-700"
            >
              <FileText size={18} /> Отчёты от мастеров
            </button>

            <button
              type="button"
              onClick={() => { haptic('light'); navigate('/rates') }}
              className="w-full flex items-center justify-center gap-2 bg-white rounded-xl py-2.5 text-sm-mobile font-medium border border-gray-100"
            >
              <List size={18} /> Мои расценки
            </button>

            <h2 className="text-base-mobile font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} /> Баланс с мастерами
            </h2>
            {workers.length === 0 ? (
              <p className="text-sm-mobile text-gray-500 text-center py-8">Добавьте мастеров в «Команду»</p>
            ) : (
              workers.map((w) => (
                <button
                  key={w.workerId}
                  type="button"
                  onClick={() => { haptic('light'); navigate(`/payroll/${w.workerId}`) }}
                  className="w-full bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    <Wallet size={18} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{w.name}</p>
                    <p className="text-xs-mobile text-gray-500">
                      Начислено {formatMoney(w.accrued)} · авансы {formatMoney(w.advances)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm-mobile font-bold ${w.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatMoney(w.debt)}
                    </p>
                    <p className="text-[10px] text-gray-400">к выплате</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </button>
              ))
            )}
          </>
        )}

        <MoneyJournalPanel
          foremanAccounts={allForemanAccounts.filter((a) => a.foremanId === foremanId)}
          workerAccounts={foremanTeamAccounts}
          foremanId={foremanId}
          foremanName={foremanName}
          objectOptions={objectOptions}
        />
      </div>
    </div>
  )
}
