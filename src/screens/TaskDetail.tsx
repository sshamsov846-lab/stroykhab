import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTelegram } from '@hooks/useTelegram'
import { BigButton } from '@components/BigButton'
import { getTaskById } from '@api/supabase'
import type { Task } from '@types'

export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic, showBackButton, hideBackButton } = useTelegram()
  const [task, setTask] = useState<Task | null>(null)

  useEffect(() => {
    showBackButton(() => navigate(-1))
    return () => hideBackButton()
  }, [showBackButton, hideBackButton, navigate])

  useEffect(() => {
    if (id) getTaskById(id).then(setTask).catch(console.error)
  }, [id])

  if (!task) {
    return <div className="p-4"><div className="h-40 bg-gray-200 rounded-xl animate-pulse" /></div>
  }

  return (
    <div className="p-4 pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 mb-4">
        <ArrowLeft size={20} /> Назад
      </button>
      <h1 className="text-xl-mobile font-bold text-gray-900 mb-2">{task.title}</h1>
      {task.room && <p className="text-sm-mobile text-gray-500 mb-4">📍 {task.room}</p>}
      {task.description && <p className="text-sm-mobile text-gray-700 mb-4">{task.description}</p>}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-2 text-sm-mobile">
        <div className="flex justify-between"><span className="text-gray-500">Статус</span><span className="font-medium">{task.status}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Приоритет</span><span className="font-medium">{task.priority}</span></div>
        {task.estimated_hours && <div className="flex justify-between"><span className="text-gray-500">План</span><span>{task.estimated_hours}ч</span></div>}
      </div>
      <BigButton variant="primary" size="lg" fullWidth className="mt-6" onClick={() => { haptic('medium'); navigate(`/object/${task.object_id}`) }}>
        К объекту
      </BigButton>
    </div>
  )
}
