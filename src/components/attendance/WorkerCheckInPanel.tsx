import React from 'react'
import toast from 'react-hot-toast'
import { LogIn, LogOut, MapPin } from 'lucide-react'
import { BigButton } from '@components/BigButton'
import { useAttendanceStore } from '@store/attendanceStore'

interface ObjectOption {
  id: string
  name: string
}

interface Props {
  workerId: string
  workerName: string
  objects: ObjectOption[]
}

export const WorkerCheckInPanel: React.FC<Props> = ({ workerId, workerName, objects }) => {
  const activeCheckIn = useAttendanceStore((s) => s.getActiveCheckIn(workerId))
  const checkIn = useAttendanceStore((s) => s.checkIn)
  const checkOut = useAttendanceStore((s) => s.checkOut)
  const [selectedObjectId, setSelectedObjectId] = React.useState(objects[0]?.id ?? '')

  React.useEffect(() => {
    if (objects.length && !objects.find((o) => o.id === selectedObjectId)) {
      setSelectedObjectId(objects[0].id)
    }
  }, [objects, selectedObjectId])

  if (!objects.length) return null

  const selectedObject = objects.find((o) => o.id === selectedObjectId) || objects[0]

  if (activeCheckIn) {
    return (
      <div className="mx-4 mb-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
        <div className="flex items-start gap-2 mb-3">
          <MapPin size={18} className="text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm-mobile font-semibold text-emerald-900">На объекте</p>
            <p className="text-xs-mobile text-emerald-800">{activeCheckIn.objectName}</p>
            <p className="text-xs-mobile text-emerald-700 mt-0.5">
              Пришёл в {new Date(activeCheckIn.arrivedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <BigButton
          variant="secondary"
          size="md"
          fullWidth
          icon={<LogOut size={18} />}
          onClick={() => {
            checkOut(workerId, activeCheckIn.objectId)
            toast.success('Уход отмечен')
          }}
        >
          Ушёл
        </BigButton>
      </div>
    )
  }

  return (
    <div className="mx-4 mb-4 bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
      <p className="text-sm-mobile font-semibold text-gray-900">Отметка на объекте</p>
      {objects.length > 1 && (
        <select
          value={selectedObjectId}
          onChange={(e) => setSelectedObjectId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
        >
          {objects.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      )}
      {objects.length === 1 && (
        <p className="text-xs-mobile text-gray-500">{selectedObject.name}</p>
      )}
      <BigButton
        variant="primary"
        size="md"
        fullWidth
        icon={<LogIn size={18} />}
        onClick={() => {
          checkIn({
            workerId,
            workerName,
            objectId: selectedObject.id,
            objectName: selectedObject.name,
          })
          toast.success('Приход отмечен')
        }}
      >
        Пришёл
      </BigButton>
    </div>
  )
}
