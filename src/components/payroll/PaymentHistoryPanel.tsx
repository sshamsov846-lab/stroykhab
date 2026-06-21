import React, { useMemo, useState } from 'react'
import { Filter, History } from 'lucide-react'
import {
  buildAccountLedger,
  buildAllLedgers,
  filterLedger,
  LEDGER_TYPE_LABELS,
  type LedgerEntryType,
} from '@utils/payrollLedger'
import { formatMoney } from '@utils/workerPayrollCalc'
import type { WorkerAccount } from '@/types/workerPayroll'

interface Props {
  accounts: Record<string, WorkerAccount>
  /** Ограничить одним мастером (счёт мастера) */
  workerId?: string
  objectOptions?: Array<{ id: string; name: string }>
  showWorkerFilter?: boolean
}

const TYPE_OPTIONS: { id: LedgerEntryType | 'all'; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'accrual', label: 'Начисления' },
  { id: 'bonus', label: 'Премии' },
  { id: 'fine', label: 'Штрафы' },
  { id: 'advance', label: 'Авансы' },
  { id: 'settlement', label: 'Расчёты' },
]

export const PaymentHistoryPanel: React.FC<Props> = ({
  accounts,
  workerId,
  objectOptions = [],
  showWorkerFilter = false,
}) => {
  const [typeFilter, setTypeFilter] = useState<LedgerEntryType | 'all'>('all')
  const [filterWorkerId, setFilterWorkerId] = useState(workerId ?? '')
  const [objectId, setObjectId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const workerOptions = useMemo(
    () => Object.values(accounts).map((a) => ({ id: a.workerId, name: a.workerName })),
    [accounts],
  )

  const entries = useMemo(() => {
    const base = workerId
      ? buildAccountLedger(accounts[workerId] ?? { workerId, workerName: '', accruals: [], advances: [], fines: [], bonuses: [], updatedAt: '' })
      : buildAllLedgers(accounts)
    return filterLedger(base, {
      workerId: filterWorkerId || undefined,
      objectId: objectId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      types: typeFilter === 'all' ? undefined : [typeFilter],
    })
  }, [accounts, workerId, filterWorkerId, objectId, dateFrom, dateTo, typeFilter])

  return (
    <section className="space-y-3">
      <h3 className="text-base-mobile font-semibold text-gray-900 flex items-center gap-2">
        <History size={18} /> История операций
      </h3>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
        <div className="flex items-center gap-1.5 text-sm-mobile text-gray-600">
          <Filter size={16} /> Фильтры
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs-mobile ${
                typeFilter === t.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {showWorkerFilter && !workerId && (
            <select
              value={filterWorkerId}
              onChange={(e) => setFilterWorkerId(e.target.value)}
              className="col-span-2 px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
            >
              <option value="">Все мастера</option>
              {workerOptions.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
          {objectOptions.length > 0 && (
            <select
              value={objectId}
              onChange={(e) => setObjectId(e.target.value)}
              className="col-span-2 px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
            >
              <option value="">Все объекты</option>
              {objectOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
            placeholder="С"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
            placeholder="По"
          />
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm-mobile text-gray-500 text-center py-6 bg-white rounded-2xl border border-gray-100">
          Операций не найдено
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="bg-white rounded-xl p-3 border border-gray-100 flex justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm-mobile font-medium text-gray-900 truncate">{e.label}</p>
                <p className="text-xs-mobile text-gray-500">
                  {new Date(e.date).toLocaleDateString('ru-RU')} · {LEDGER_TYPE_LABELS[e.type]}
                  {e.workerName && !workerId ? ` · ${e.workerName}` : ''}
                  {e.issuedBy ? ` · ${e.issuedBy}` : ''}
                </p>
                {e.detail && <p className="text-xs-mobile text-gray-400 truncate">{e.detail}</p>}
              </div>
              <span className={`text-sm-mobile font-bold shrink-0 ${e.amount >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {e.amount >= 0 ? '+' : ''}{formatMoney(e.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
