import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, HardHat, ChevronRight, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { useObjectStore } from '@store/objectStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { STATUS_COLORS, STATUS_LABELS } from '@api/clientView'
import { calcTaskProgress } from '@utils/hierarchyProgress'
import { SIDE_JOB_TYPE_LABELS, ownsSideJob } from '@utils/sideJob'
import { BigButton } from '@components/BigButton'
import { openWorkflowTask } from '@utils/workflowNavigation'
import type { BuiltHierarchyNav } from '@/types/hierarchyNav'

export const SideJobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const object = useObjectStore((s) => s.userObjects.find((o) => o.id === id))
  const tasks = useProjectWorkflowStore((s) => (id ? s.getTasksByObject(id) : []))
  const createSideJobTask = useProjectWorkflowStore((s) => s.createSideJobTask)

  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const progress = useMemo(() => calcTaskProgress(tasks).percent, [tasks])

  const workCount = tasks.length

  if (!id || !object || !object.isSideJob || !ownsSideJob(object)) {
    return (
      <div className="p-4 text-center text-gray-500">
        Подработка не найдена
        <BigButton variant="primary" size="md" className="mt-4" onClick={() => navigate('/')}>
          На главную
        </BigButton>
      </div>
    )
  }

  const handleAddTask = () => {
    if (!newTitle.trim()) {
      toast.error('Укажите название работы')
      return
    }
    const nextIndex = workCount + 1
    const taskId = createSideJobTask(id, {
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      objectName: object.name,
      workIndex: nextIndex,
    })
    setNewTitle('')
    setNewDesc('')
    setAddOpen(false)
    toast.success('Работа добавлена')
    const nav: BuiltHierarchyNav = {
      kind: 'built',
      level: 'works',
      sectionId: '',
      houseId: '',
      entranceId: '',
      floorId: '',
      apartmentId: null,
      zoneId: null,
      workTaskId: null,
    }
    openWorkflowTask(navigate, id, taskId, nav)
  }

  const openTask = (taskId: string) => {
    const nav: BuiltHierarchyNav = {
      kind: 'built',
      level: 'works',
      sectionId: '',
      houseId: '',
      entranceId: '',
      floorId: '',
      apartmentId: null,
      zoneId: null,
      workTaskId: null,
    }
    openWorkflowTask(navigate, id, taskId, nav)
  }

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-amber-600 text-white px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs-mobile text-amber-100 flex items-center gap-1">
              <HardHat size={14} /> Подработка
            </p>
            <h1 className="text-lg-mobile font-bold truncate">{object.name}</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border-2 border-amber-200">
          <div className="flex items-center gap-1 text-sm-mobile text-gray-500 mb-1">
            <MapPin size={14} />
            {object.address}
          </div>
          <p className="text-xs-mobile text-amber-800 bg-amber-50 inline-block px-2 py-0.5 rounded-full">
            {object.sideJobType ? SIDE_JOB_TYPE_LABELS[object.sideJobType] : 'Подработка'}
          </p>
          {object.budget_total > 0 && (
            <p className="text-sm-mobile text-gray-700 mt-2">Бюджет: {object.budget_total.toLocaleString('ru-RU')} ₽</p>
          )}
          <div className="mt-3">
            <div className="flex justify-between text-sm-mobile mb-1">
              <span className="text-gray-600">Прогресс</span>
              <span className="font-bold text-amber-700">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-base-mobile font-semibold text-gray-900">Работы ({tasks.length})</h2>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="text-sm-mobile text-amber-700 font-medium flex items-center gap-1"
          >
            <Plus size={16} /> Добавить
          </button>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm-mobile text-gray-500 text-center py-8">Нет работ — добавьте первую</p>
        ) : (
          tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openTask(t.id)}
              className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-sm-mobile font-semibold text-gray-900">{t.title}</p>
                {t.description && <p className="text-xs-mobile text-gray-500 truncate">{t.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-xs-mobile ${STATUS_COLORS[t.status]}`}>
                  {STATUS_LABELS[t.status]}
                </span>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </button>
          ))
        )}

        {addOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-3xl p-4 space-y-3">
              <p className="text-base-mobile font-bold">Новая работа</p>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Название"
                className="w-full px-4 py-3 rounded-xl border border-gray-200"
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Описание"
                className="w-full px-4 py-3 rounded-xl border border-gray-200"
              />
              <BigButton variant="primary" size="lg" fullWidth onClick={handleAddTask}>
                Добавить и открыть
              </BigButton>
              <BigButton variant="ghost" size="lg" fullWidth onClick={() => setAddOpen(false)}>
                Отмена
              </BigButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
