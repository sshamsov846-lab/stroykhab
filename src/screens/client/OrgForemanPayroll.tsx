import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, HardHat, Wallet } from 'lucide-react'
import { useTelegram } from '@hooks/useTelegram'
import { useForemanPayrollStore } from '@store/foremanPayrollStore'
import { buildOrgForemanReport } from '@utils/payrollReports'
import { formatMoney } from '@utils/workerPayrollCalc'
import { WorkTypeBreakdownSection } from '@components/payroll/WorkTypeBreakdownSection'
import { ForemanOrgAccountView } from '@components/payroll/ForemanOrgAccountView'
import { MoneyJournalPanel } from '@components/payroll/MoneyJournalPanel'
import { getObjects } from '@api/supabase'
import { filterObjectsForRole } from '@utils/sideJob'
import { syncForemanAccrualsFromAcceptedTasks } from '@utils/payrollSync'
import type { ConstructionObject } from '@types'

export const OrgForemanPayroll: React.FC = () => {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const foremanAccounts = useForemanPayrollStore((s) => s.getAllAccounts())

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [objects, setObjects] = useState<ConstructionObject[]>([])

  useEffect(() => {
    getObjects().then((data) => setObjects(filterObjectsForRole(data, 'client')))
    syncForemanAccrualsFromAcceptedTasks()
  }, [])

  const report = useMemo(() => buildOrgForemanReport(foremanAccounts), [foremanAccounts])
  const objectOptions = objects.map((o) => ({ id: o.id, name: o.name }))

  if (detailId) {
    const account = foremanAccounts.find((a) => a.foremanId === detailId)
    return (
      <div className="pb-24 min-h-screen bg-gray-50">
        <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
          <button type="button" onClick={() => setDetailId(null)} className="text-primary-600">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-lg-mobile font-bold text-gray-900">Расчёты с прорабом</h1>
            <p className="text-sm-mobile text-gray-500">{account?.foremanName}</p>
          </div>
        </div>
        <div className="p-4">
          <ForemanOrgAccountView
            foremanId={detailId}
            foremanName={account?.foremanName ?? 'Прораб'}
            canManage
          />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4">
        <button
          type="button"
          onClick={() => navigate('/finances')}
          className="flex items-center gap-2 text-primary-600 text-sm-mobile font-medium mb-2"
        >
          <ArrowLeft size={18} /> К финансам
        </button>
        <h1 className="text-xl-mobile font-bold text-gray-900">Расчёты с прорабами</h1>
        <p className="text-sm-mobile text-gray-500">Начисления за принятые работы · авансы · остаток</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 col-span-2">
            <p className="text-xs-mobile text-primary-700">Организация должна всем прорабам</p>
            <p className="text-2xl-mobile font-bold text-primary-900">{formatMoney(report.totalBalance)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
            <p className="text-[10px] text-gray-500 uppercase">Начислено</p>
            <p className="text-sm-mobile font-bold text-gray-900">{formatMoney(report.totalAccrued)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
            <p className="text-[10px] text-gray-500 uppercase">Прорабов</p>
            <p className="text-sm-mobile font-bold text-gray-900">{report.foremen.length}</p>
          </div>
        </div>

        <section>
          <h2 className="text-base-mobile font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <HardHat size={18} /> Прорабы
          </h2>
          {report.foremen.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
              <Wallet size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm-mobile text-gray-500">
                Начисления появятся после приёмки работ прорабом
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {report.foremen.map((f) => {
                const expanded = expandedId === f.foremanId
                return (
                  <div key={f.foremanId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        haptic('light')
                        setExpandedId(expanded ? null : f.foremanId)
                      }}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{f.foremanName}</p>
                        <p className="text-xs-mobile text-gray-500">
                          Начислено {formatMoney(f.accrued)} · авансы {formatMoney(f.advances)}
                        </p>
                      </div>
                      <p className={`text-sm-mobile font-bold shrink-0 ${f.balance > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                        {formatMoney(f.balance)}
                      </p>
                      {expanded ? <ChevronDown size={18} className="text-gray-300" /> : <ChevronRight size={18} className="text-gray-300" />}
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                        <div className="grid grid-cols-2 gap-2 text-center text-xs-mobile">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-gray-500">Премии</p>
                            <p className="font-bold text-emerald-700">+{formatMoney(f.bonuses)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-gray-500">Штрафы</p>
                            <p className="font-bold text-red-700">−{formatMoney(f.fines)}</p>
                          </div>
                        </div>
                        <WorkTypeBreakdownSection rows={f.byWorkType} />
                        <button
                          type="button"
                          onClick={() => { haptic('light'); setDetailId(f.foremanId) }}
                          className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-sm-mobile font-semibold"
                        >
                          Управление счётом
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <MoneyJournalPanel
          foremanAccounts={foremanAccounts}
          workerAccounts={[]}
          objectOptions={objectOptions}
        />
      </div>
    </div>
  )
}
