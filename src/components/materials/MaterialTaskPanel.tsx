import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Package, PauseCircle, PlayCircle, Plus } from 'lucide-react'
import { BigButton } from '@components/BigButton'
import { useMaterialStore } from '@store/materialStore'
import { useAttendanceStore } from '@store/attendanceStore'
import {
  MATERIAL_UNITS,
  URGENCY_LABELS,
  REQUEST_STATUS_LABELS,
  type MaterialUrgency,
  type MaterialPaymentPayer,
} from '@/types/materials'
import { PAYMENT_PAYER_LABELS } from '@utils/materialPayment'

interface Props {
  taskId: string
  objectId: string
  taskTitle: string
  isAssignedWorker: boolean
  isForeman: boolean
  workerId?: string
  workerName: string
}

export const MaterialTaskPanel: React.FC<Props> = ({
  taskId,
  objectId,
  taskTitle,
  isAssignedWorker,
  isForeman,
  workerId,
  workerName,
}) => {
  const requests = useMaterialStore((s) => s.getRequestsByTask(taskId))
  const activeWait = useMaterialStore((s) => s.getActiveWaitForTask(taskId))
  const downtimeMs = useMaterialStore((s) => s.getDowntimeMs(taskId))
  const createRequest = useMaterialStore((s) => s.createRequest)
  const paymentSettings = useMaterialStore((s) => s.getObjectPaymentSettings(objectId))
  const startWait = useMaterialStore((s) => s.startMaterialWait)
  const endWait = useMaterialStore((s) => s.endMaterialWait)
  const startDowntime = useAttendanceStore((s) => s.startDowntime)
  const endDowntime = useAttendanceStore((s) => s.endDowntime)
  const activeDowntime = useAttendanceStore((s) => s.getActiveDowntime(taskId))

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<string>(MATERIAL_UNITS[0])
  const [urgency, setUrgency] = useState<MaterialUrgency>('normal')
  const [paymentPayer, setPaymentPayer] = useState<MaterialPaymentPayer>('client')
  const isMixed = paymentSettings.policy === 'mixed'

  const formatDowntime = (ms: number) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    if (h > 0) return `${h} ч ${m} мин`
    return `${m} мин`
  }

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Укажите название материала')
      return
    }
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      toast.error('Укажите количество')
      return
    }
    createRequest({
      objectId,
      taskId,
      taskTitle,
      name: name.trim(),
      quantity: qty,
      unit,
      urgency,
      requestedBy: workerName,
      requestedByWorkerId: workerId,
      paymentPayer: isMixed ? paymentPayer : undefined,
    })
    toast.success('Заявка отправлена прорабу')
    setName('')
    setQuantity('1')
    setOpen(false)
  }

  const pendingRequest = requests.find((r) => r.status === 'pending' || r.status === 'ordered')

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <div className="flex items-center gap-2">
        <Package size={18} className="text-primary-600" />
        <p className="text-sm-mobile font-semibold text-gray-900">Материалы</p>
      </div>

      {activeWait && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
          <p className="text-sm-mobile font-bold text-red-800 flex items-center gap-2">
            <PauseCircle size={18} /> Жду материал
          </p>
          <p className="text-xs-mobile text-red-700 mt-1">
            Простой: {formatDowntime(downtimeMs)}
          </p>
          {isAssignedWorker && (
            <button
              type="button"
              onClick={() => {
                endWait(taskId)
                endDowntime(taskId)
                toast.success('Простой завершён')
              }}
              className="mt-2 text-sm-mobile text-red-700 font-medium flex items-center gap-1"
            >
              <PlayCircle size={16} /> Материал есть — продолжить
            </button>
          )}
        </div>
      )}

      {requests.length > 0 && (
        <div className="space-y-2">
          {requests.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl p-3 border text-sm-mobile ${
                r.status === 'delivered'
                  ? 'bg-emerald-50 border-emerald-100'
                  : r.status === 'ordered'
                    ? 'bg-amber-50 border-amber-100'
                    : 'bg-gray-50 border-gray-100'
              }`}
            >
              <p className="font-medium text-gray-900">
                {r.name} — {r.quantity} {r.unit}
              </p>
              <p className="text-xs-mobile text-gray-500 mt-0.5">
                {REQUEST_STATUS_LABELS[r.status]} · {URGENCY_LABELS[r.urgency]}
              </p>
              {r.status === 'delivered' && r.deliveredAt && (
                <p className="text-xs-mobile text-emerald-700 mt-1">
                  Привезено {new Date(r.deliveredAt).toLocaleDateString('ru-RU')}
                  {r.price != null ? ` · ${r.price.toLocaleString('ru-RU')} ₽` : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {isAssignedWorker && !open && (
        <div className="flex flex-col gap-2">
          <BigButton
            variant="secondary"
            size="md"
            fullWidth
            icon={<Plus size={16} />}
            onClick={() => setOpen(true)}
          >
            Нужен материал
          </BigButton>
          {!activeWait && (
            <button
              type="button"
              onClick={() => {
                startWait({
                  taskId,
                  objectId,
                  taskTitle,
                  workerName,
                  requestId: pendingRequest?.id,
                })
                if (!activeDowntime) {
                  startDowntime({
                    taskId,
                    objectId,
                    taskTitle,
                    workerId,
                    workerName,
                    reason: 'no_material',
                  })
                }
                toast('Задача на паузе — жду материал', { icon: '⏸️' })
              }}
              className="w-full py-3 rounded-xl border-2 border-red-200 bg-red-50 text-red-800 text-sm-mobile font-semibold flex items-center justify-center gap-2"
            >
              <PauseCircle size={18} /> Жду материал
            </button>
          )}
        </div>
      )}

      {isAssignedWorker && open && (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Цемент, кабель, плитка..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="flex-1 px-3 py-3 rounded-xl border border-gray-200 text-base-mobile"
            >
              {MATERIAL_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as MaterialUrgency)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
          >
            {(Object.entries(URGENCY_LABELS) as [MaterialUrgency, string][]).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          {isMixed && (
            <div>
              <p className="text-xs-mobile text-gray-500 mb-1">Кто оплачивает этот материал</p>
              <select
                value={paymentPayer}
                onChange={(e) => setPaymentPayer(e.target.value as MaterialPaymentPayer)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
              >
                {(Object.entries(PAYMENT_PAYER_LABELS) as [MaterialPaymentPayer, string][]).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
          )}
          <BigButton variant="primary" size="md" fullWidth onClick={handleCreate}>
            Отправить заявку
          </BigButton>
          <BigButton variant="ghost" size="md" fullWidth onClick={() => setOpen(false)}>
            Отмена
          </BigButton>
        </div>
      )}

      {!isAssignedWorker && !isForeman && requests.length === 0 && (
        <p className="text-xs-mobile text-gray-500">Заявок на материалы нет</p>
      )}
    </div>
  )
}
