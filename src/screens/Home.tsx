import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useTelegram } from '@hooks/useTelegram'
import { ObjectCard } from '@components/ObjectCard'
import { BigButton } from '@components/BigButton'
import { getObjects } from '@api/supabase'
import type { ConstructionObject } from '@types'

export const Home: React.FC = () => {
  const navigate = useNavigate()
  const { haptic, user } = useTelegram()
  const [objects, setObjects] = useState<ConstructionObject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadObjects() }, [])

  const loadObjects = async () => {
    try {
      setIsLoading(true)
      const data = await getObjects()
      setObjects(data)
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = objects.filter(
    (o) => o.name.toLowerCase().includes(search.toLowerCase()) || o.address.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl-mobile font-bold text-gray-900">
          {user ? `Привет, ${user.first_name}!` : 'СтройКонтроль'}
        </h1>
        <p className="text-sm-mobile text-gray-500">{objects.length} объектов</p>
      </div>

      <div className="px-4 mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск объектов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm-mobile focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="px-4 space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm-mobile text-gray-500">Нет объектов</p>
            <BigButton variant="primary" size="md" className="mt-4" onClick={() => navigate('/object/new')}>
              Создать первый объект
            </BigButton>
          </div>
        ) : (
          filtered.map((obj) => (
            <ObjectCard key={obj.id} object={obj} onClick={() => { haptic('light'); navigate(`/object/${obj.id}`) }} />
          ))
        )}
      </div>

      <button
        onClick={() => { haptic('medium'); navigate('/object/new') }}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg z-40 hover:bg-primary-700 active:scale-95 transition-all"
      >
        <Plus size={28} />
      </button>
    </div>
  )
}
