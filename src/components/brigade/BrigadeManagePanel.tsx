import React, { useMemo, useState } from 'react'
import { Copy, Check, UserPlus, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useUserStore } from '@store/userStore'
import { useBrigadeStore } from '@store/brigadeStore'
import { useObjectStore } from '@store/objectStore'
import { BrigadeFolderCard } from '@components/brigade/BrigadeFolderCard'

export const BrigadeManagePanel: React.FC = () => {
  const brigadeId = useUserStore((s) => s.brigadeId)
  const workerBrigadeMode = useUserStore((s) => s.workerBrigadeMode)
  const brigade = useBrigadeStore((s) => (brigadeId ? s.getBrigade(brigadeId) : undefined))
  const teamMembers = useObjectStore((s) => s.teamMembers)
  const addMember = useBrigadeStore((s) => s.addMember)
  const [copied, setCopied] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  const availableWorkers = useMemo(() => {
    if (!brigade) return []
    const memberKeys = new Set(brigade.memberUserKeys)
    return teamMembers.filter(
      (m) => m.userKey && m.foremanUserKey && !memberKeys.has(m.userKey),
    )
  }, [brigade, teamMembers])

  if (workerBrigadeMode !== 'brigadier' || !brigade) return null

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(brigade.brigadeCode)
      setCopied(true)
      toast.success('Код скопирован')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Не удалось скопировать')
    }
  }

  const handleJoinByCode = () => {
    if (!joinCode.trim()) return
    toast('Покажите этот код мастерам при регистрации', { icon: 'ℹ️' })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4 mb-4">
      <BrigadeFolderCard brigade={brigade} defaultOpen />
      <div className="bg-primary-50 rounded-xl p-3">
        <p className="text-xs-mobile text-gray-500 flex items-center gap-1">
          <KeyRound size={14} /> Код бригады для мастеров
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xl-mobile font-bold text-primary-700 font-mono">{brigade.brigadeCode}</p>
          <button type="button" onClick={copyCode} className="text-primary-600 text-sm-mobile flex items-center gap-1">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'OK' : 'Копировать'}
          </button>
        </div>
      </div>

      {availableWorkers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm-mobile font-medium text-gray-700">Добавить из команды прораба</p>
          {availableWorkers.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                if (!m.userKey) return
                const r = addMember(brigade.id, m.userKey, m.name, m.id)
                if (r.ok) toast.success(`${m.name} в бригаде`)
                else toast.error(r.reason ?? 'Ошибка')
              }}
              className="w-full flex items-center gap-2 p-2 rounded-lg border border-gray-100 text-left hover:bg-gray-50"
            >
              <UserPlus size={16} className="text-primary-600" />
              <span className="text-sm-mobile">{m.name}</span>
            </button>
          ))}
        </div>
      )}

      <div>
        <label className="text-xs-mobile text-gray-500">Или мастер вводит код при регистрации</label>
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder={brigade.brigadeCode}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile uppercase"
          onBlur={handleJoinByCode}
        />
      </div>
    </div>
  )
}
