import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Banknote, CheckCircle2, Plus, MinusCircle, PlusCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'
import { calcAccountDebt, formatMoney, getAccountSummary } from '@utils/workerPayrollCalc'
import {
  PAY_TYPE_LABELS,
  FINE_REASON_LABELS,
  BONUS_REASON_LABELS,
} from '@/types/workerPayroll'
import { FineBonusPanel } from '@components/payroll/FineBonusPanel'
import { PaymentHistoryPanel } from '@components/payroll/PaymentHistoryPanel'
import { WorkTypeBreakdownSection } from '@components/payroll/WorkTypeBreakdownSection'
import { buildWorkerVolumeReport } from '@utils/payrollReports'

interface Props {
  workerId: string
  workerName: string
  canGiveAdvance: boolean
  showBack?: boolean
  onBack?: () => void
}

export const WorkerAccountView: React.FC<Props> = ({
  workerId,
  workerName,
  canGiveAdvance,
  showBack,
  onBack,
}) => {
  const navigate = useNavigate()
  const accounts = useWorkerPayrollStore((s) => s.accounts)
  const account = accounts[workerId]
  const addAdvance = useWorkerPayrollStore((s) => s.addAdvance)

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [comment, setComment] = useState('')
  const [kind, setKind] = useState<'advance' | 'settlement'>('advance')

  const summary = useMemo(
    () => (account ? getAccountSummary(account) : { accrued: 0, bonuses: 0, fines: 0, advances: 0, debt: 0 }),
    [account],
  )

  const volumeByWorkType = useMemo(() => buildWorkerVolumeReport(account), [account])

  const objectOptions = useMemo(() => {
    if (!account) return []
    const map = new Map<string, string>()
    for (const a of account.accruals) {
      if (a.objectId && a.objectName) map.set(a.objectId, a.objectName)
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [account])

  const handleAdvance = () => {
    const sum = Number(amount.replace(/\s/g, ''))
    if (!sum || sum <= 0) {
      toast.error('Введите сумму')
      return
    }
    addAdvance(workerId, sum, comment.trim() || undefined, date, kind)
    setAmount('')
    setComment('')
    toast.success(kind === 'settlement' ? 'Окончательный расчёт записан' : 'Аванс выдан')
  }

  if (!account) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm-mobile">
        Счёт мастера {workerName} — пока нет начислений. Сумма появится после приёмки задач прорабом.
      </div>
    )
  }

  const debt = calcAccountDebt(account)
  const debtBg = debt > 0 ? 'bg-red-600' : debt < 0 ? 'bg-amber-600' : 'bg-emerald-600'

  return (
    <div className="space-y-4">
      {showBack && (
        <button
          type="button"
          onClick={onBack ?? (() => navigate(-1))}
          className="flex items-center gap-2 text-primary-600 text-sm-mobile font-medium"
        >
          <ArrowLeft size={18} /> Назад
        </button>
      )}

      <div className={`${debtBg} text-white rounded-2xl p-5 text-center`}>
        <p className="text-sm-mobile text-white/80">К выплате</p>
        <h2 className="text-xl-mobile font-bold mt-1">{workerName}</h2>
        <p className="text-3xl-mobile font-bold mt-3">{formatMoney(debt)}</p>
        <p className="text-sm-mobile text-white/80 mt-1">
          {debt > 0 ? 'Прораб должен вам' : debt < 0 ? 'Переплата' : 'Всё выплачено ✓'}
        </p>
        <p className="text-xs-mobile text-white/70 mt-2">
          Начислено + Премии − Штрафы − Авансы
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-[10px] text-gray-500">Начислено</p>
          <p className="text-base-mobile font-bold text-gray-900">{formatMoney(summary.accrued)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-emerald-100 text-center">
          <p className="text-[10px] text-emerald-700">Премии</p>
          <p className="text-base-mobile font-bold text-emerald-700">+{formatMoney(summary.bonuses)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-red-100 text-center">
          <p className="text-[10px] text-red-700">Штрафы</p>
          <p className="text-base-mobile font-bold text-red-700">−{formatMoney(summary.fines)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-[10px] text-gray-500">Авансы</p>
          <p className="text-base-mobile font-bold text-gray-700">−{formatMoney(summary.advances)}</p>
        </div>
      </div>

      <WorkTypeBreakdownSection rows={volumeByWorkType} title="Выполнено по видам работ" />

      {canGiveAdvance && <FineBonusPanel workerId={workerId} />}

      <section>
        <h3 className="text-base-mobile font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" /> Принятые задачи
        </h3>
        {account.accruals.length === 0 ? (
          <p className="text-sm-mobile text-gray-500 bg-white rounded-2xl p-4 border border-gray-100">
            Нет принятых задач
          </p>
        ) : (
          <div className="space-y-2">
            {account.accruals.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => navigate(`/workflow/${a.taskId}`)}
                className="w-full text-left bg-white rounded-2xl p-3 border border-gray-100 flex justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm-mobile font-medium text-gray-900 truncate">{a.taskTitle}</p>
                  <p className="text-xs-mobile text-gray-500">
                    {a.isSideJob ? '🔧 Подработка' : (a.objectName ?? 'Объект')}
                    {' · '}
                    {PAY_TYPE_LABELS[a.payType]} · {new Date(a.acceptedAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <span className="text-sm-mobile font-bold shrink-0 text-gray-900">
                  {formatMoney(a.amount)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {(account.fines?.length ?? 0) > 0 && (
        <section>
          <h3 className="text-base-mobile font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <MinusCircle size={18} className="text-red-600" /> Штрафы
          </h3>
          <div className="space-y-2">
            {(account.fines ?? []).map((f) => (
              <div key={f.id} className="bg-red-50 rounded-xl p-3 border border-red-100 flex justify-between gap-2">
                <div>
                  <p className="text-sm-mobile font-medium text-red-900">{FINE_REASON_LABELS[f.reason]}</p>
                  <p className="text-xs-mobile text-red-700">
                    {new Date(f.createdAt).toLocaleDateString('ru-RU')} · {f.issuedBy}
                    {f.comment ? ` · ${f.comment}` : ''}
                  </p>
                </div>
                <span className="text-sm-mobile font-bold text-red-700">−{formatMoney(f.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {(account.bonuses?.length ?? 0) > 0 && (
        <section>
          <h3 className="text-base-mobile font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <PlusCircle size={18} className="text-emerald-600" /> Премии
          </h3>
          <div className="space-y-2">
            {(account.bonuses ?? []).map((b) => (
              <div key={b.id} className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex justify-between gap-2">
                <div>
                  <p className="text-sm-mobile font-medium text-emerald-900">{BONUS_REASON_LABELS[b.reason]}</p>
                  <p className="text-xs-mobile text-emerald-700">
                    {new Date(b.createdAt).toLocaleDateString('ru-RU')} · {b.issuedBy}
                    {b.comment ? ` · ${b.comment}` : ''}
                  </p>
                </div>
                <span className="text-sm-mobile font-bold text-emerald-700">+{formatMoney(b.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-base-mobile font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Banknote size={18} /> Выданные авансы
        </h3>
        {account.advances.length === 0 ? (
          <p className="text-sm-mobile text-gray-500 bg-white rounded-2xl p-4 border border-gray-100">
            Авансов пока не было
          </p>
        ) : (
          <div className="space-y-2">
            {account.advances.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl p-3 border border-gray-100 flex justify-between gap-2">
                <div>
                  <p className="text-sm-mobile font-medium text-gray-900">
                    {a.kind === 'settlement' ? 'Окончательный расчёт' : 'Аванс'}
                  </p>
                  <p className="text-xs-mobile text-gray-500">
                    {new Date(a.date).toLocaleDateString('ru-RU')}
                    {a.comment ? ` · ${a.comment}` : ''}
                  </p>
                </div>
                <span className="text-sm-mobile font-bold text-gray-700">−{formatMoney(a.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {canGiveAdvance && debt > 0 && (
        <section className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          <p className="text-sm-mobile font-semibold text-gray-900">Выдать аванс / расчёт</p>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as 'advance' | 'settlement')}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
          >
            <option value="advance">Аванс</option>
            <option value="settlement">Окончательный расчёт</option>
          </select>
          <input
            type="number"
            placeholder="Сумма, ₽"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
          />
          <input
            type="text"
            placeholder="Комментарий"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
          />
          <button
            type="button"
            onClick={handleAdvance}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl text-sm-mobile font-semibold"
          >
            <Plus size={18} /> Выдать
          </button>
        </section>
      )}

      <PaymentHistoryPanel
        accounts={accounts}
        workerId={workerId}
        objectOptions={objectOptions}
      />
    </div>
  )
}
