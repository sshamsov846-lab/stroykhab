import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Receipt, CalendarClock, CheckCircle2, HardHat, ChevronRight, Download } from 'lucide-react'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'
import { useForemanPayrollStore } from '@store/foremanPayrollStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useMaterialStore } from '@store/materialStore'
import { formatMoney, calcClientAmount } from '@utils/workerPayrollCalc'
import { buildFinanceRecordsFromPayroll } from '@utils/workflowClientData'
import { buildOrgForemanReport } from '@utils/payrollReports'
import { syncForemanAccrualsFromAcceptedTasks } from '@utils/payrollSync'
const TYPE_ICON = {
  advance: Wallet,
  receipt: Receipt,
  upcoming: CalendarClock,
}

const TYPE_LABEL = {
  advance: 'Аванс',
  receipt: 'Начисление / расход',
  upcoming: 'К оплате',
}

export const ClientFinances: React.FC = () => {
  const navigate = useNavigate()
  const payrollTaskRecords = useWorkerPayrollStore((s) => s.records)
  const payrollAccounts = useWorkerPayrollStore((s) => s.accounts)
  const foremanAccounts = useForemanPayrollStore((s) => s.getAllAccounts())
  const workflowTasks = useProjectWorkflowStore((s) => s.tasks)
  const materialSpendClient = useMaterialStore((s) => s.getTotalMaterialSpend('client'))

  useEffect(() => {
    syncForemanAccrualsFromAcceptedTasks()
  }, [])

  const records = useMemo(
    () => buildFinanceRecordsFromPayroll(payrollTaskRecords, payrollAccounts, workflowTasks),
    [payrollTaskRecords, payrollAccounts, workflowTasks],
  )

  const laborTotal = useMemo(() => {
    let total = 0
    for (const rec of Object.values(payrollTaskRecords)) {
      if (rec.isAccrued) total += calcClientAmount(rec)
    }
    return total
  }, [payrollTaskRecords])

  const paid = records.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0)
  const planned = records.filter((r) => r.status === 'planned').reduce((s, r) => s + r.amount, 0)

  const foremanReport = useMemo(() => buildOrgForemanReport(foremanAccounts), [foremanAccounts])

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4">
        <h1 className="text-xl-mobile font-bold text-gray-900">Финансы / Смета</h1>
        <p className="text-sm-mobile text-gray-500">Авансы, начисления и стоимость работ</p>
      </div>

      <div className="p-4 space-y-4">
        <button
          type="button"
          onClick={() => navigate('/export')}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-gray-200 rounded-xl text-sm-mobile font-medium text-gray-800"
        >
          <Download size={18} />
          Экспорт данных
        </button>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-xs-mobile text-emerald-700">Оплачено</p>
            <p className="text-lg-mobile font-bold text-emerald-900">{paid.toLocaleString('ru-RU')} ₽</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-xs-mobile text-amber-700">К оплате</p>
            <p className="text-lg-mobile font-bold text-amber-900">{planned.toLocaleString('ru-RU')} ₽</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/finances/foremen')}
          className="w-full bg-white rounded-2xl p-4 border border-primary-100 flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <HardHat size={20} className="text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm-mobile font-semibold text-gray-900">Расчёты с прорабами</p>
            <p className="text-xs-mobile text-gray-500">
              Долг организации: {formatMoney(foremanReport.totalBalance)}
            </p>
          </div>
          <ChevronRight size={18} className="text-gray-300 shrink-0" />
        </button>

        {materialSpendClient > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Receipt size={20} className="text-amber-700" />
            </div>
            <div>
              <p className="text-sm-mobile font-semibold text-gray-900">Материалы</p>
              <p className="text-lg-mobile font-bold text-gray-900 mt-0.5">{formatMoney(materialSpendClient)}</p>
              <p className="text-xs-mobile text-gray-500 mt-1">Оплачено заказчиком (поставки на объектах)</p>
            </div>
          </div>
        )}

        {laborTotal > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <HardHat size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm-mobile font-semibold text-gray-900">Стоимость работ</p>
              <p className="text-lg-mobile font-bold text-gray-900 mt-0.5">{formatMoney(laborTotal)}</p>
              <p className="text-xs-mobile text-gray-500 mt-1">По входящим расценкам (принятые задачи)</p>
            </div>
          </div>
        )}

        <h2 className="text-base-mobile font-semibold text-gray-900">Операции</h2>
        {records.length === 0 ? (
          <p className="text-sm-mobile text-gray-500 text-center py-8">
            Операций пока нет. Появятся после начислений и авансов мастерам.
          </p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => {
              const Icon = TYPE_ICON[r.type]
              return (
                <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    r.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {r.status === 'paid' ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm-mobile font-semibold text-gray-900">{r.title}</p>
                    <p className="text-xs-mobile text-gray-500">{r.objectName} · {TYPE_LABEL[r.type]}</p>
                    <p className="text-xs-mobile text-gray-400 mt-0.5">{new Date(r.date).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <p className={`text-base-mobile font-bold shrink-0 ${r.status === 'planned' ? 'text-amber-600' : 'text-gray-900'}`}>
                    {r.amount.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
