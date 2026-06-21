import React, { useMemo, useState } from 'react'
import { Filter, History } from 'lucide-react'
import {
  buildUnifiedMoneyJournal,
  filterMoneyOperations,
  LEDGER_TYPE_LABELS,
  partyLabel,
  type MoneyOperation,
} from '@utils/moneyJournal'
import type { LedgerEntryType } from '@utils/payrollLedger'
import { formatMoney } from '@utils/workerPayrollCalc'
import type { ForemanAccount } from '@/types/foremanPayroll'
import type { WorkerAccount } from '@/types/workerPayroll'

interface Props {
  foremanAccounts: ForemanAccount[]
  workerAccounts: WorkerAccount[]
  foremanId?: string
  foremanName?: string
  /** Показывать только операции мастера */
  workerId?: string
  objectOptions?: Array<{ id: string; name: string }>
}

const TYPE_OPTIONS: { id: LedgerEntryType | 'all'; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'accrual', label: 'Начисления' },
  { id: 'bonus', label: 'Премии' },
  { id: 'fine', label: 'Штрафы' },
  { id: 'advance', label: 'Авансы' },
  { id: 'settlement', label: 'Расчёты' },
]

export const MoneyJournalPanel: React.FC<Props> = ({
  foremanAccounts,
  workerAccounts,
  foremanId = 'foreman',
  foremanName = 'Прораб',
  workerId,
  objectOptions = [],
}) => {
  const [typeFilter, setTypeFilter] = useState<LedgerEntryType | 'all'>('all')
  const [objectId, setObjectId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const allOps = useMemo(
    () => buildUnifiedMoneyJournal(foremanAccounts, workerAccounts, foremanName, foremanId),
    [foremanAccounts, workerAccounts, foremanName, foremanId],
  )

  const entries = useMemo(() => {
    let ops = allOps
    if (workerId) {
      ops = ops.filter((op) => op.from.id === workerId || op.to.id === workerId)
    }
    return filterMoneyOperations(ops, {
      types: typeFilter === 'all' ? undefined : [typeFilter],
      objectId: objectId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
  }, [allOps, workerId, typeFilter, objectId, dateFrom, dateTo])

  return (
    <section className="space-y-3">
      <h3 className="text-base-mobile font-semibold text-gray-900 flex items-center gap-2">
        <History size={18} /> Журнал операций
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
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
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
            <OperationRow key={e.id} op={e} />
          ))}
        </div>
      )}
    </section>
  )
}

const OperationRow: React.FC<{ op: MoneyOperation }> = ({ op }) => (
  <div className="bg-white rounded-xl p-3 border border-gray-100">
    <div className="flex justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm-mobile font-medium text-gray-900 truncate">{op.label}</p>
        <p className="text-xs-mobile text-gray-500">
          {new Date(op.date).toLocaleDateString('ru-RU')} · {LEDGER_TYPE_LABELS[op.type]}
        </p>
        <p className="text-xs-mobile text-gray-400 truncate">
          {partyLabel(op.from)} → {partyLabel(op.to)}
        </p>
        {op.detail && <p className="text-xs-mobile text-gray-400 truncate">{op.detail}</p>}
        {op.objectName && <p className="text-xs-mobile text-gray-400">{op.objectName}</p>}
      </div>
      <span className={`text-sm-mobile font-bold shrink-0 ${op.amount >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
        {op.amount >= 0 ? '+' : ''}{formatMoney(op.amount)}
      </span>
    </div>
  </div>
)
