import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '@hooks/useTelegram'
import { BigButton } from '@components/BigButton'
import { createObject } from '@api/supabase'

export const CreateObject: React.FC = () => {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [budget, setBudget] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      setIsSaving(true)
      haptic('success')
      const obj = await createObject({
        name: name.trim(),
        address: address.trim(),
        status: 'active',
        budget_total: Number(budget) || 0,
        budget_spent: 0,
        progress: 0,
      })
      navigate(`/object/${obj.id}`)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl-mobile font-bold text-gray-900 mb-6">Новый объект</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm-mobile font-medium text-gray-700">Название *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-sm-mobile focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Квартира на Ленина" />
        </div>
        <div>
          <label className="text-sm-mobile font-medium text-gray-700">Адрес</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-sm-mobile focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="ул. Ленина, 45" />
        </div>
        <div>
          <label className="text-sm-mobile font-medium text-gray-700">Бюджет (₽)</label>
          <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} min="0"
            className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-sm-mobile focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="450000" />
        </div>
        <BigButton type="submit" variant="primary" size="lg" fullWidth disabled={isSaving}>
          {isSaving ? 'Создание...' : 'Создать объект'}
        </BigButton>
      </form>
    </div>
  )
}
