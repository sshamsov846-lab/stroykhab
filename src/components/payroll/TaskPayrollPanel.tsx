import React, { useEffect, useMemo } from 'react'
import { Calendar, Banknote, CheckCircle2, Ruler, AlertTriangle, TrendingUp } from 'lucide-react'
import { useUserStore } from '@store/userStore'
import { useObjectStore } from '@store/objectStore'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'
import { resolveWorkerIdForUser } from '@utils/notificationFilter'
import {
  calcWorkerAmount,
  calcClientAmount,
  calcForemanMargin,
  formatMoney,
  todayDateKey,
} from '@utils/workerPayrollCalc'
import { incomingPrice, outgoingPrice } from '@/types/workerPayroll'
import type { PayType, VolumeUnit } from '@/types/workerPayroll'
import { PAY_TYPE_LABELS, REDO_REASON_LABELS, VOLUME_UNIT_LABELS } from '@/types/workerPayroll'
import { PAYMENT_CLOSING_LABELS } from '@/types/paymentSettings'
import {
  allowedPayTypes,
  defaultPayTypeForCalc,
  getForemanPaySettingsForTask,
  showManualAccrualForTask,
} from '@utils/paymentSettingsHelpers'
import { BigButton } from '@components/BigButton'
import toast from 'react-hot-toast'

interface Props {
  taskId: string
  contractorId?: string
  taskStatus?: string
}

export const TaskPayrollPanel: React.FC<Props> = ({ taskId, contractorId, taskStatus }) => {
  const role = useUserStore((s) => s.role)
  const fullName = useUserStore((s) => s.fullName)
  const myWorkerId = resolveWorkerIdForUser(fullName || '')

  const assignedId = useObjectStore(
    (s) => s.contractorWorkerAssignments[taskId] || s.workerTaskAssignments[taskId],
  )

  const ensureRecord = useWorkerPayrollStore((s) => s.ensureRecord)
  const record = useWorkerPayrollStore((s) =>
    assignedId ? s.records[`${taskId}__${assignedId}`] : undefined,
  )
  const setPayType = useWorkerPayrollStore((s) => s.setPayType)
  const updateDaily = useWorkerPayrollStore((s) => s.updateDaily)
  const toggleWorkDay = useWorkerPayrollStore((s) => s.toggleWorkDay)
  const updateVolume = useWorkerPayrollStore((s) => s.updateVolume)
  const confirmVolume = useWorkerPayrollStore((s) => s.confirmVolume)
  const setFixedAmount = useWorkerPayrollStore((s) => s.setFixedAmount)
  const accrueOnTaskAccepted = useWorkerPayrollStore((s) => s.accrueOnTaskAccepted)

  const paySettings = getForemanPaySettingsForTask(taskId)
  const payTypes = allowedPayTypes(paySettings.calcMode)

  useEffect(() => {
    if (!assignedId) return
    const { teamMembers, contractorWorkers } = useObjectStore.getState()
    let name = 'Мастер'
    const tm = teamMembers.find((m) => m.id === assignedId)
    if (tm) name = tm.name
    else {
      for (const list of Object.values(contractorWorkers)) {
        const w = list.find((m) => m.id === assignedId)
        if (w) { name = w.name; break }
      }
    }
    ensureRecord({ taskId, workerId: assignedId, workerName: name, contractorId })
    const rec = useWorkerPayrollStore.getState().records[`${taskId}__${assignedId}`]
    if (rec && !payTypes.includes(rec.payType) && rec.payType !== 'redo') {
      setPayType(taskId, assignedId, defaultPayTypeForCalc(paySettings.calcMode))
    }
  }, [assignedId, taskId, contractorId, ensureRecord, paySettings.calcMode, payTypes, setPayType])

  const isForeman = role === 'foreman'
  const isSubcontractor = role === 'subcontractor'
  const isWorker = role === 'worker'
  const isClient = role === 'client'
  const isOwnTask = isWorker && myWorkerId === assignedId
  const canManage = (isForeman || isSubcontractor) && !record?.isAccrued
  const canMarkDay = (canManage || isOwnTask) && !record?.isAccrued
  const canEditVolume = (canManage || isOwnTask) && !record?.isAccrued
  const canConfirmVolume = isForeman && !record?.isAccrued

  const showIncoming = isForeman || isSubcontractor || isClient
  const showOutgoing = isForeman || isSubcontractor || isWorker
  const showMargin = isForeman

  const workerPreview = useMemo(() => (record ? calcWorkerAmount(record) : 0), [record])
  const clientPreview = useMemo(() => (record ? calcClientAmount(record) : 0), [record])
  const marginPreview = useMemo(() => (record ? calcForemanMargin(record) : 0), [record])

  if (isClient) {
    if (!record) return null
    const amount = record.isAccrued ? calcClientAmount(record) : clientPreview
    if (!amount && !record.incomingUnitPrice) return null
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
        <p className="text-sm-mobile font-semibold text-gray-900">Стоимость работ</p>
        <p className="text-lg-mobile font-bold text-gray-900">{formatMoney(amount)}</p>
        {record.payType === 'volume' && record.incomingUnitPrice != null && (
          <p className="text-xs-mobile text-gray-500">
            {incomingPrice(record)} ₽/{VOLUME_UNIT_LABELS[record.volumeUnit ?? 'm2']}
            {record.completedVolume ? ` × ${record.completedVolume}` : ''}
          </p>
        )}
      </div>
    )
  }

  if (!assignedId) {
    if (!canManage && !isForeman) return null
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <p className="text-sm-mobile font-semibold text-gray-900">Оплата мастера</p>
        <p className="text-xs-mobile text-gray-500 mt-1">Назначьте мастера — затем настройте расценки</p>
      </div>
    )
  }

  if (isWorker && !isOwnTask) return null
  if (!record) return null

  const today = todayDateKey()
  const markedToday = record.workDays.includes(today)
  const taskAccepted = taskStatus === 'done'
  const locked = record.isAccrued || taskAccepted
  const inc = incomingPrice(record)
  const out = outgoingPrice(record)

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm-mobile font-semibold text-gray-900">Оплата · {record.workerName}</p>
          <p className="text-xs-mobile text-gray-500">
            {locked ? 'Задача принята' : 'Настройки до приёмки'}
          </p>
          {(isForeman || isSubcontractor) && (
            <p className="text-[10px] text-primary-600 mt-0.5">{PAYMENT_CLOSING_LABELS[paySettings.closingTrigger]}</p>
          )}
        </div>
        <Banknote size={20} className="text-primary-600 shrink-0" />
      </div>

      {locked ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <div className="space-y-1 flex-1">
            <p className="text-sm-mobile font-semibold text-emerald-900">Задача принята</p>
            {record.isAccrued ? (
              <>
                {showOutgoing && (
                  <p className="text-sm-mobile text-emerald-800">
                    Мастеру: <strong>{formatMoney(record.accruedAmount ?? workerPreview)}</strong>
                  </p>
                )}
                {showIncoming && (
                  <p className="text-sm-mobile text-emerald-800">
                    От заказчика: <strong>{formatMoney(calcClientAmount(record))}</strong>
                  </p>
                )}
                {showMargin && (
                  <p className="text-sm-mobile text-emerald-800 flex items-center gap-1">
                    <TrendingUp size={14} /> Маржа: <strong>{formatMoney(calcForemanMargin(record))}</strong>
                  </p>
                )}
              </>
            ) : showManualAccrualForTask(taskId) && canManage ? (
              <>
                <p className="text-sm-mobile text-amber-800">Ожидает ручного начисления</p>
                <BigButton
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    accrueOnTaskAccepted(taskId, { force: true })
                    toast.success('Начислено вручную')
                  }}
                >
                  Начислить {formatMoney(workerPreview)}
                </BigButton>
              </>
            ) : (
              <p className="text-sm-mobile text-emerald-800">Оплата по акту за период</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {showOutgoing && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm-mobile text-amber-900">
              {isWorker ? 'К начислению' : 'Мастеру'}: <strong>{formatMoney(workerPreview)}</strong>
            </div>
          )}
          {showIncoming && !isWorker && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm-mobile text-blue-900">
              От заказчика: <strong>{formatMoney(clientPreview)}</strong>
            </div>
          )}
          {showMargin && record.payType !== 'redo' && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm-mobile text-emerald-900 flex items-center gap-2">
              <TrendingUp size={16} />
              Маржа прораба: <strong>{formatMoney(marginPreview)}</strong>
            </div>
          )}
        </div>
      )}

      {canManage && !locked && paySettings.calcMode === 'mixed' && (
        <div>
          <label className="text-xs-mobile font-medium text-gray-600">Тип оплаты</label>
          <select
            value={record.payType}
            onChange={(e) => setPayType(taskId, assignedId, e.target.value as PayType)}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
          >
            {payTypes.map((t) => (
              <option key={t} value={t}>{PAY_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      )}

      {canManage && !locked && paySettings.calcMode !== 'mixed' && (
        <p className="text-sm-mobile text-gray-700">Расчёт: <strong>{PAY_TYPE_LABELS[record.payType]}</strong></p>
      )}

      {!canManage && !locked && (
        <p className="text-sm-mobile text-gray-700">Тип: <strong>{PAY_TYPE_LABELS[record.payType]}</strong></p>
      )}

      {record.payType === 'daily' && !locked && (
        <div className="space-y-3">
          {canManage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {showIncoming && (
                <div>
                  <label className="text-xs-mobile font-medium text-gray-600">Ставка заказчика/день</label>
                  <input
                    type="number"
                    min={0}
                    value={record.incomingUnitPrice ?? inc}
                    onChange={(e) => updateVolume(taskId, assignedId, { incomingUnitPrice: Number(e.target.value) })}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
                  />
                </div>
              )}
              {showOutgoing && (
                <div>
                  <label className="text-xs-mobile font-medium text-gray-600">Ставка мастеру/день</label>
                  <input
                    type="number"
                    min={0}
                    value={record.dailyRate ?? out}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      updateVolume(taskId, assignedId, { outgoingUnitPrice: v })
                      updateDaily(taskId, assignedId, v)
                    }}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
                  />
                </div>
              )}
            </div>
          )}
          {canMarkDay && (
            <button
              type="button"
              onClick={() => toggleWorkDay(taskId, assignedId, today)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm-mobile font-medium border ${
                markedToday ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Calendar size={16} />
              {markedToday ? `Сегодня отмечен (${record.workDays.length} дн.)` : 'Отметить выход сегодня'}
            </button>
          )}
          {record.workDays.length > 0 && (
            <p className="text-xs-mobile text-gray-500">Дни: {record.workDays.join(', ')}</p>
          )}
        </div>
      )}

      {record.payType === 'hourly' && !locked && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {canManage && showIncoming && (
              <div>
                <label className="text-xs-mobile font-medium text-gray-600">Ставка заказчика/час</label>
                <input
                  type="number"
                  min={0}
                  value={record.incomingUnitPrice ?? inc}
                  onChange={(e) => updateVolume(taskId, assignedId, { incomingUnitPrice: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
                />
              </div>
            )}
            {(canManage || isOwnTask) && showOutgoing && (
              <div>
                <label className="text-xs-mobile font-medium text-gray-600">Ставка мастеру/час</label>
                <input
                  type="number"
                  min={0}
                  disabled={!canManage}
                  value={record.hourlyRate ?? out}
                  onChange={(e) => updateVolume(taskId, assignedId, { hourlyRate: Number(e.target.value), outgoingUnitPrice: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile disabled:bg-gray-50"
                />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs-mobile font-medium text-gray-600">Отработано часов</label>
            <input
              type="number"
              min={0}
              step="0.5"
              disabled={!canEditVolume}
              value={record.hoursWorked ?? 0}
              onChange={(e) => updateVolume(taskId, assignedId, { hoursWorked: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile disabled:bg-gray-50"
            />
          </div>
        </div>
      )}

      {record.payType === 'volume' && !locked && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {canManage && (
              <>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs-mobile font-medium text-gray-600">Единица</label>
                  <select
                    value={record.volumeUnit ?? 'm2'}
                    onChange={(e) => updateVolume(taskId, assignedId, { volumeUnit: e.target.value as VolumeUnit })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
                  >
                    {(Object.keys(VOLUME_UNIT_LABELS) as VolumeUnit[]).map((u) => (
                      <option key={u} value={u}>{VOLUME_UNIT_LABELS[u]}</option>
                    ))}
                  </select>
                </div>
                {showIncoming && (
                  <div>
                    <label className="text-xs-mobile font-medium text-gray-600">Цена заказчика</label>
                    <input
                      type="number"
                      min={0}
                      value={record.incomingUnitPrice ?? 0}
                      onChange={(e) => updateVolume(taskId, assignedId, { incomingUnitPrice: Number(e.target.value) })}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
                    />
                  </div>
                )}
                {showOutgoing && (
                  <div>
                    <label className="text-xs-mobile font-medium text-gray-600">Цена мастеру</label>
                    <input
                      type="number"
                      min={0}
                      value={out}
                      onChange={(e) => updateVolume(taskId, assignedId, { outgoingUnitPrice: Number(e.target.value) })}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
                    />
                  </div>
                )}
              </>
            )}
            {!canManage && showOutgoing && (
              <div className="col-span-2">
                <p className="text-sm-mobile text-gray-700">
                  Ваша цена: <strong>{out} ₽/{VOLUME_UNIT_LABELS[record.volumeUnit ?? 'm2']}</strong>
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs-mobile font-medium text-gray-600 flex items-center gap-1">
              <Ruler size={14} /> Выполнено
            </label>
            <input
              type="number"
              min={0}
              step="0.1"
              disabled={!canEditVolume}
              value={record.completedVolume ?? 0}
              onChange={(e) => updateVolume(taskId, assignedId, { completedVolume: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile disabled:bg-gray-50"
            />
          </div>
          {canConfirmVolume && (
            <button
              type="button"
              onClick={() => confirmVolume(taskId, assignedId, true)}
              className="text-sm-mobile text-primary-600 font-medium"
            >
              Подтвердить объём
            </button>
          )}
          {record.volumeConfirmed && (
            <p className="text-xs-mobile text-emerald-700">Объём подтверждён прорабом</p>
          )}
        </div>
      )}

      {record.payType === 'fixed' && !locked && (
        <div>
          <label className="text-xs-mobile font-medium text-gray-600">Сумма за задачу, ₽</label>
          <input
            type="number"
            min={0}
            disabled={!canManage}
            value={record.fixedAmount ?? 0}
            onChange={(e) => setFixedAmount(taskId, assignedId, Number(e.target.value))}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile disabled:bg-gray-50"
          />
        </div>
      )}

      {record.payType === 'redo' && (
        <div className="space-y-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <div className="flex items-center gap-2 text-amber-800 text-sm-mobile font-medium">
            <AlertTriangle size={16} /> Переделка
          </div>
          <p className="text-sm-mobile text-amber-900">
            {record.redoReason ? REDO_REASON_LABELS[record.redoReason] : 'Свой брак — бесплатно'}
          </p>
          {record.redoReason === 'own_fault' && (
            <p className="text-xs-mobile text-amber-700">Оплата 0 ₽ · без штрафа · тот же мастер</p>
          )}
          {record.redoReason === 'other_fault' && (
            <p className="text-xs-mobile text-amber-700">Новый мастер · оплата по часам</p>
          )}
        </div>
      )}

      {taskStatus === 'rejected' && record.redoReason === 'own_fault' && isOwnTask && !locked && (
        <p className="text-xs-mobile text-gray-600">Исправьте брак и снова отправьте на проверку</p>
      )}
    </div>
  )
}
