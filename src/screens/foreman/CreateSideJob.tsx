import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, HardHat } from 'lucide-react'
import toast from 'react-hot-toast'
import { BigButton } from '@components/BigButton'
import { useTelegram } from '@hooks/useTelegram'
import { useObjectStore } from '@store/objectStore'
import { buildSideJobObject } from '@utils/sideJobTasks'
import { SIDE_JOB_TYPE_LABELS, type SideJobType } from '@utils/sideJob'

interface WorkDraft {
  id: string
  title: string
  description: string
}

function newWork(): WorkDraft {
  return { id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, title: '', description: '' }
}

export const CreateSideJob: React.FC = () => {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const registerSideJob = useObjectStore((s) => s.registerSideJob)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [sideJobType, setSideJobType] = useState<SideJobType>('apartment')
  const [budget, setBudget] = useState('')
  const [works, setWorks] = useState<WorkDraft[]>([newWork(), newWork()])
  const [saving, setSaving] = useState(false)

  const addWork = () => setWorks((prev) => [...prev, newWork()])

  const removeWork = (id: string) => {
    setWorks((prev) => (prev.length <= 1 ? prev : prev.filter((w) => w.id !== id)))
  }

  const updateWork = (id: string, patch: Partial<WorkDraft>) => {
    setWorks((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)))
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Укажите название')
      return
    }
    if (!address.trim()) {
      toast.error('Укажите адрес')
      return
    }
    const workList = works.map((w) => ({ title: w.title.trim(), description: w.description.trim() || undefined }))
      .filter((w) => w.title)
    if (workList.length === 0) {
      toast.error('Добавьте хотя бы одну работу')
      return
    }

    setSaving(true)
    try {
      haptic('success')
      const object = buildSideJobObject({
        name: name.trim(),
        address: address.trim(),
        sideJobType,
        budget: budget ? Number(budget) : undefined,
      })
      const objectId = registerSideJob(object, workList)
      toast.success('Подработка создана')
      navigate(`/side-job/${objectId}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-amber-600 text-white px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20">
            <ArrowLeft size={22} />
          </button>
          <div>
            <p className="text-xs-mobile text-amber-100 flex items-center gap-1">
              <HardHat size={14} /> Подработка
            </p>
            <h1 className="text-lg-mobile font-bold">Новый мини-объект</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm-mobile text-gray-600 bg-amber-50 border border-amber-100 rounded-xl p-3">
          Быстрая форма для халтуры со своими мастерами. Заказчик и организации этот объект не увидят.
        </p>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          <label className="text-sm-mobile font-medium text-gray-700">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ремонт квартиры на Ленина 5"
            className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile"
          />
          <label className="text-sm-mobile font-medium text-gray-700">Адрес</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="ул. Ленина, 5"
            className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile"
          />
          <label className="text-sm-mobile font-medium text-gray-700">Тип объекта</label>
          <select
            value={sideJobType}
            onChange={(e) => setSideJobType(e.target.value as SideJobType)}
            className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile"
          >
            {(Object.entries(SIDE_JOB_TYPE_LABELS) as [SideJobType, string][]).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <label className="text-sm-mobile font-medium text-gray-700">Бюджет (необязательно), ₽</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="150000"
            className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile"
          />
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm-mobile font-semibold text-gray-900">Список работ</p>
            <button type="button" onClick={addWork} className="text-sm-mobile text-amber-700 font-medium flex items-center gap-1">
              <Plus size={16} /> Добавить
            </button>
          </div>
          {works.map((work, i) => (
            <div key={work.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs-mobile text-gray-500">Работа {i + 1}</span>
                {works.length > 1 && (
                  <button type="button" onClick={() => removeWork(work.id)} className="text-red-500 p-1" aria-label="Удалить">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <input
                value={work.title}
                onChange={(e) => updateWork(work.id, { title: e.target.value })}
                placeholder="Штукатурка стен"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm-mobile"
              />
              <input
                value={work.description}
                onChange={(e) => updateWork(work.id, { description: e.target.value })}
                placeholder="Описание (необязательно)"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm-mobile"
              />
            </div>
          ))}
        </div>

        <BigButton variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={saving}>
          Создать подработку
        </BigButton>
      </div>
    </div>
  )
}
