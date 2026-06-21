import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Users, Wallet, SlidersHorizontal } from 'lucide-react'
import { useTelegram } from '@hooks/useTelegram'
import { useUserStore } from '@store/userStore'
import { useObjectStore } from '@store/objectStore'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'
import { SubcontractorHeader } from '@components/subcontractor/SubcontractorHeader'
import { formatMoney, getAccountSummary } from '@utils/workerPayrollCalc'

export const SubcontractorPayroll: React.FC = () => {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const contractorId = useUserStore((s) => s.contractorId)
  const contractorWorkers = useObjectStore((s) => s.getContractorWorkers(contractorId))
  const allAccounts = useWorkerPayrollStore((s) => s.accounts)

  const workers = useMemo(() => {
    const ids = new Set(contractorWorkers.map((m) => m.id))
    for (const a of Object.values(allAccounts)) {
      if (a.contractorId === contractorId) ids.add(a.workerId)
    }
    return [...ids].map((id) => {
      const member = contractorWorkers.find((m) => m.id === id)
      const account = allAccounts[id] ?? {
        workerId: id,
        workerName: member?.name ?? 'Мастер',
        contractorId,
        accruals: [],
        advances: [],
        updatedAt: '',
      }
      const summary = getAccountSummary(account)
      return { workerId: id, name: member?.name ?? account.workerName, ...summary }
    }).sort((a, b) => b.debt - a.debt)
  }, [contractorWorkers, allAccounts, contractorId])

  const total = workers.reduce(
    (acc, w) => ({ accrued: acc.accrued + w.accrued, advances: acc.advances + w.advances, debt: acc.debt + w.debt }),
    { accrued: 0, advances: 0, debt: 0 },
  )

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <SubcontractorHeader title="Расчёты с мастерами" subtitle="Общая касса организации" />

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
            <p className="text-[10px] text-gray-500 uppercase">Начислено</p>
            <p className="text-sm-mobile font-bold text-gray-900">{formatMoney(total.accrued)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
            <p className="text-[10px] text-gray-500 uppercase">Авансы</p>
            <p className="text-sm-mobile font-bold text-emerald-700">{formatMoney(total.advances)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-amber-100 bg-amber-50 text-center">
            <p className="text-[10px] text-amber-700 uppercase">Долг</p>
            <p className="text-sm-mobile font-bold text-amber-900">{formatMoney(total.debt)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { haptic('light'); navigate('/payment-settings') }}
          className="w-full flex items-center justify-center gap-2 bg-white rounded-xl py-3 text-sm-mobile font-medium border border-gray-100"
        >
          <SlidersHorizontal size={18} /> Настройки оплаты
        </button>

        <section>
          <h2 className="text-base-mobile font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Users size={18} /> Счета мастеров
          </h2>
          {workers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
              <Wallet size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm-mobile text-gray-500">Добавьте мастеров и назначьте на задачи</p>
            </div>
          ) : (
            <div className="space-y-2">
              {workers.map((w) => (
                <button
                  key={w.workerId}
                  type="button"
                  onClick={() => {
                    haptic('light')
                    navigate(`/subcontractor/payroll/${w.workerId}`)
                  }}
                  className="w-full bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{w.name}</p>
                    <p className="text-xs-mobile text-gray-500">
                      Начислено {formatMoney(w.accrued)} · авансы {formatMoney(w.advances)}
                    </p>
                  </div>
                  <p className={`text-sm-mobile font-bold shrink-0 ${w.debt > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                    {formatMoney(w.debt)}
                  </p>
                  <ChevronRight size={18} className="text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
