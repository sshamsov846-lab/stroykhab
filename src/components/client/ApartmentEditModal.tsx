import React, { useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { BigButton } from '@components/BigButton'
import { useClientPortalStore } from '@store/clientPortalStore'
import { APARTMENT_TYPE_OPTIONS } from '@utils/apartmentDisplay'
import { WORK_TEMPLATES, type GeneratedApartment, type WorkTemplateId } from '@/types/objectStructure'

interface ApartmentEditModalProps {
  objectId: string
  apartment: GeneratedApartment
  onClose: () => void
  onSaved: (updated: GeneratedApartment) => void
}

export const ApartmentEditModal: React.FC<ApartmentEditModalProps> = ({
  objectId,
  apartment,
  onClose,
  onSaved,
}) => {
  const updateApartment = useClientPortalStore((s) => s.updateApartment)
  const [number, setNumber] = useState(apartment.number)
  const [rooms, setRooms] = useState(apartment.rooms ?? 2)
  const [roomCount, setRoomCount] = useState(apartment.roomCount ?? apartment.rooms ?? 2)
  const [area, setArea] = useState(apartment.area != null ? String(apartment.area) : '')
  const [notes, setNotes] = useState(apartment.notes ?? '')
  const [workTemplate, setWorkTemplate] = useState<WorkTemplateId>(apartment.workTemplate)

  const handleTypeChange = (typeRooms: number) => {
    setRooms(typeRooms)
    setRoomCount(Math.max(0, typeRooms))
  }

  const handleSave = () => {
    if (!number.trim()) {
      toast.error('Укажите номер квартиры')
      return
    }
    const areaNum = area === '' ? undefined : Number(area)
    const patch = {
      number: number.trim(),
      rooms,
      roomCount: Math.max(0, roomCount),
      area: areaNum && areaNum > 0 ? areaNum : undefined,
      notes: notes.trim() || undefined,
      workTemplate,
      label: undefined,
    }
    updateApartment(objectId, apartment.id, patch)
    onSaved({ ...apartment, ...patch })
    toast.success('Квартира обновлена')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg-mobile font-bold">Изменить квартиру</h2>
          <button type="button" onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={22} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm-mobile text-gray-500">
            Площадь используется для расчёта оплаты по объёму (₽/м² × площадь квартиры).
          </p>

          <div>
            <label className="text-sm-mobile font-medium text-gray-700">Номер квартиры</label>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
              placeholder="250"
            />
          </div>

          <div>
            <label className="text-sm-mobile font-medium text-gray-700">Тип квартиры</label>
            <select
              value={rooms}
              onChange={(e) => handleTypeChange(Number(e.target.value))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
            >
              {APARTMENT_TYPE_OPTIONS.map((o) => (
                <option key={o.rooms} value={o.rooms}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm-mobile font-medium text-gray-700">Количество комнат</label>
            <input
              type="number"
              min={0}
              max={10}
              value={roomCount}
              onChange={(e) => setRoomCount(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
            />
          </div>

          <div>
            <label className="text-sm-mobile font-medium text-gray-700">Площадь, м²</label>
            <input
              type="number"
              min={1}
              step={0.1}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
              placeholder="65"
            />
          </div>

          <div>
            <label className="text-sm-mobile font-medium text-gray-700">Шаблон работ</label>
            <select
              value={workTemplate}
              onChange={(e) => setWorkTemplate(e.target.value as WorkTemplateId)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
            >
              {(Object.entries(WORK_TEMPLATES) as [WorkTemplateId, typeof WORK_TEMPLATES.rough][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm-mobile font-medium text-gray-700">Заметка</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile resize-none"
              placeholder="Например: перенос перегородки"
            />
          </div>

          <BigButton variant="primary" size="lg" fullWidth onClick={handleSave}>
            Сохранить
          </BigButton>
        </div>
      </div>
    </div>
  )
}
