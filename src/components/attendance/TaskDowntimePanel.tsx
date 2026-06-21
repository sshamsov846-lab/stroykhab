import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { PauseCircle, PlayCircle } from 'lucide-react'
import { BigButton } from '@components/BigButton'
import { useAttendanceStore } from '@store/attendanceStore'
import { useMaterialStore } from '@store/materialStore'
import { DOWNTIME_REASONS, type DowntimeReasonId } from '@/types/attendance'
import { formatDurationMs } from '@utils/timesheetCalc'

interface Props {
  taskId: string
  objectId: string
  taskTitle: string
  isAssignedWorker: boolean
  isForeman: boolean
  workerId?: string
  workerName: string
}

export const TaskDowntimePanel: React.FC<Props> = ({
  taskId,
  objectId,
  taskTitle,
  isAssignedWorker,
  isForeman,
  workerId,
  workerName,
}) => {
  const activeDowntime = useAttendanceStore((s) => s.getActiveDowntime(taskId))
  const downtimeMs = useAttendanceStore((s) => s.getDowntimeMs(taskId))
  const startDowntime = useAttendanceStore((s) => s.startDowntime)
  const endDowntime = useAttendanceStore((s) => s.endDowntime)
  const startMaterialWait = useMaterialStore((s) => s.startMaterialWait)
  const endMaterialWait = useMaterialStore((s) => s.endMaterialWait)

  const [pauseOpen, setPauseOpen] = useState(false)
  const [reason, setReason] = useState<DowntimeReasonId>('no_access')
  const [reasonText, setReasonText] = useState('')

  const reasonLabel = activeDowntime
    ? DOWNTIME_REASONS[activeDowntime.reason] + (activeDowntime.reasonText ? `: ${activeDowntime.reasonText}` : '')
    : ''

  const handleStartPause = () => {
    if (reason === 'other' && !reasonText.trim()) {
      toast.error('Укажите причину простоя')
      return
    }
    startDowntime({
      taskId,
      objectId,
      taskTitle,
      workerId,
      workerName,
      reason,
      reasonText: reason === 'other' ? reasonText : undefined,
    })
    if (reason === 'no_material') {
      startMaterialWait({ taskId, objectId, taskTitle, workerName })
    }
    toast.success('Задача на паузе')
    setPauseOpen(false)
    setReasonText('')
  }

  const handleEndPause = () => {
    endDowntime(taskId)
    if (activeDowntime?.reason === 'no_material') {
      endMaterialWait(taskId)
    }
    toast.success('Работа возобновлена')
  }

  if (!isAssignedWorker && !isForeman && !activeDowntime) return null

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <div className="flex items-center gap-2">
        <PauseCircle size={18} className="text-red-600" />
        <p className="text-sm-mobile font-semibold text-gray-900">Простой</p>
      </div>

      {activeDowntime ? (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
          <p className="text-sm-mobile font-bold text-red-800 flex items-center gap-2">
            <PauseCircle size={18} /> {reasonLabel}
          </p>
          <p className="text-xs-mobile text-red-700 mt-1">
            Простой: {formatDurationMs(downtimeMs)}
            {activeDowntime.workerName && ` · ${activeDowntime.workerName}`}
          </p>
          {isAssignedWorker && (
            <button
              type="button"
              onClick={handleEndPause}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white border border-red-200 text-red-800 text-sm-mobile font-medium"
            >
              <PlayCircle size={16} /> Продолжить работу
            </button>
          )}
        </div>
      ) : isAssignedWorker ? (
        <>
          {!pauseOpen ? (
            <BigButton variant="secondary" size="md" fullWidth icon={<PauseCircle size={18} />} onClick={() => setPauseOpen(true)}>
              Поставить на паузу
            </BigButton>
          ) : (
            <div className="space-y-3 border border-gray-100 rounded-xl p-3">
              <p className="text-xs-mobile font-medium text-gray-600">Причина простоя</p>
              <div className="space-y-1">
                {(Object.entries(DOWNTIME_REASONS) as [DowntimeReasonId, string][]).map(([id, label]) => (
                  <label key={id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="downtime-reason"
                      checked={reason === id}
                      onChange={() => setReason(id)}
                      className="text-primary-600"
                    />
                    <span className="text-sm-mobile text-gray-800">{label}</span>
                  </label>
                ))}
              </div>
              {reason === 'other' && (
                <input
                  type="text"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Опишите причину…"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
                />
              )}
              <div className="flex gap-2">
                <BigButton variant="primary" size="sm" fullWidth onClick={handleStartPause}>
                  Подтвердить паузу
                </BigButton>
                <BigButton variant="ghost" size="sm" onClick={() => setPauseOpen(false)}>
                  Отмена
                </BigButton>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm-mobile text-gray-500">Простоев нет</p>
      )}

      {!activeDowntime && downtimeMs > 0 && (
        <p className="text-xs-mobile text-gray-500">Всего простоя по задаче: {formatDurationMs(downtimeMs)}</p>
      )}
    </div>
  )
}
