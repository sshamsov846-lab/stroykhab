import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTelegram } from '@hooks/useTelegram'
import { BigButton } from '@components/BigButton'
import { createTask } from '@api/supabase'
import type { TaskPriority } from '@types'

export const CreateTask: React.FC = () => {
  const { id: objectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [title, setTitle] = useState('')
  const [room, setRoom] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [hours, setHours] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !objectId) return
    try {
      setIsSaving(true)
      haptic('success')
      await createTask({
        object_id: objectId,
        title: title.trim(),
        room: room.trim() || undefined,
        status: 'pending',
        priority,
        estimated_hours: hours ? Number(hours) : undefined,
      })
      navigate(`/object/${objectId}`)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl-mobile font-bold text-gray-900 mb-6">Новая задача</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm-mobile font-medium text-gray-700">Название *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-sm-mobile focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Установка смесителя" />
        </div>
        <div>
          <label className="text-sm-mobile font-medium text-gray-700">Помещение</label>
          <input value={room} onChange={(e) => setRoom(e.target.value)}
            className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-sm-mobile focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ванная" />
        </div>
        <div>
          <label className="text-sm-mobile font-medium text-gray-700">Приоритет</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-sm-mobile bg-white">
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
            <option value="urgent">Срочный</option>
          </select>
        </div>
        <div>
          <label className="text-sm-mobile font-medium text-gray-700">Часы (план)</label>
          <input type="number" value={hours} onChange={(e) => setHours(e.target.value)} min="0" step="0.5"
            className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-sm-mobile focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="2" />
        </div>
        <BigButton type="submit" variant="primary" size="lg" fullWidth disabled={isSaving}>
          {isSaving ? 'Сохранение...' : 'Создать задачу'}
        </BigButton>
      </form>
    </div>
  )
}
