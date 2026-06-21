import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Search, Plus, CheckCircle2, UserMinus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useObjectStore } from '@store/objectStore'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { useUserStore } from '@store/userStore'
import {
  refreshOrganizationDirectory,
  resolveOrgUserKey,
  searchRegisteredContractors,
  syncOrganizationRegistryFromStores,
} from '@utils/objectChain'
import type { Contractor } from '@/types/projectWorkflow'

interface Props {
  objectId: string
  objectName: string
}

export const AddOrganizationPanel: React.FC<Props> = ({ objectId, objectName }) => {
  const fullName = useUserStore((s) => s.fullName)
  const accessMembers = useObjectAccessStore((s) => s.members)
  const addOrganization = useObjectStore((s) => s.addOrganization)
  const clientAddOrganization = useObjectAccessStore((s) => s.clientAddOrganization)
  const revokeMember = useObjectAccessStore((s) => s.revokeMember)

  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(false)

  const reloadDirectory = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      useObjectAccessStore.persist.rehydrate(),
      useUserStore.persist.rehydrate(),
    ])
    syncOrganizationRegistryFromStores()
    await refreshOrganizationDirectory()
    setRefreshKey((k) => k + 1)
    setLoading(false)
  }, [])

  useEffect(() => {
    void reloadDirectory()
  }, [reloadDirectory])

  useEffect(() => {
    const onExternalUpdate = () => void reloadDirectory()
    window.addEventListener('focus', onExternalUpdate)
    window.addEventListener('storage', onExternalUpdate)
    return () => {
      window.removeEventListener('focus', onExternalUpdate)
      window.removeEventListener('storage', onExternalUpdate)
    }
  }, [reloadDirectory])

  const linkedOrgs = useMemo(
    () =>
      useObjectAccessStore
        .getState()
        .getActiveMembers(objectId)
        .filter((m) => m.role === 'subcontractor'),
    [objectId, accessMembers, refreshKey],
  )

  const linkedIds = useMemo(
    () => new Set(linkedOrgs.map((m) => m.contractorId).filter(Boolean)),
    [linkedOrgs],
  )

  const results = useMemo(
    () => searchRegisteredContractors(search).filter((c) => c.isRegisteredOrg),
    [search, refreshKey],
  )

  const handleAdd = (contractor: Contractor) => {
    const orgUserKey = resolveOrgUserKey(contractor.id)
    if (!orgUserKey) {
      toast.error('Организация не зарегистрирована в системе')
      return
    }
    if (linkedIds.has(contractor.id)) {
      toast.error('Организация уже на объекте')
      return
    }

    const result = clientAddOrganization({
      objectId,
      contractorId: contractor.id,
      orgName: contractor.name,
      orgUserKey,
      orgPhone: contractor.phone ?? '',
      addedByName: fullName || 'Заказчик',
    })
    if (!result.ok) {
      toast.error(result.reason ?? 'Не удалось добавить')
      return
    }

    addOrganization(objectId, {
      name: contractor.name,
      specialty: contractor.specialty,
      phone: contractor.phone,
      contractorId: contractor.id,
    })

    toast.success(`${contractor.name} добавлена на объект`)
    setOpen(false)
    setSearch('')
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base-mobile font-semibold text-gray-900 flex items-center gap-2">
          <Building2 size={18} className="text-primary-600" />
          Организации на объекте
        </h3>
        <button
          type="button"
          onClick={() => {
            setOpen(!open)
            if (!open) void reloadDirectory()
          }}
          className="text-primary-600 text-sm-mobile font-medium flex items-center gap-1"
        >
          <Plus size={16} /> Добавить
        </button>
      </div>

      {linkedOrgs.length === 0 && !open && (
        <p className="text-sm-mobile text-gray-500">
          Найдите организацию в общем списке и добавьте на объект «{objectName}».
        </p>
      )}

      {linkedOrgs.map((m) => (
        <div key={m.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm-mobile font-semibold text-gray-900 truncate">{m.fullName}</p>
            <p className="text-xs-mobile text-gray-500">{m.phone}</p>
            <p className="text-xs-mobile text-emerald-700 mt-0.5">
              {m.connectedVia === 'invite_code' ? 'Подключена по коду' : 'Добавлена заказчиком'}
              {' · '}
              {new Date(m.connectedAt).toLocaleDateString('ru-RU')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Убрать «${m.fullName}» с объекта?`)) {
                revokeMember(m.id, fullName || 'Заказчик')
                setRefreshKey((k) => k + 1)
              }
            }}
            className="p-2 rounded-lg text-red-600 hover:bg-red-50 shrink-0"
            title="Убрать с объекта"
          >
            <UserMinus size={18} />
          </button>
        </div>
      ))}

      {open && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <p className="text-xs-mobile text-gray-500">
            Общий список всех зарегистрированных организаций СтройХаб
          </p>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Название или код ОРГ-XXXX"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-2">
            {loading && (
              <p className="text-xs-mobile text-gray-400 text-center py-4">Загрузка списка…</p>
            )}
            {!loading && results.length === 0 && (
              <p className="text-xs-mobile text-gray-500 text-center py-4">
                {search.trim()
                  ? 'Ничего не найдено'
                  : 'Пока нет зарегистрированных организаций. Попросите подрядчика зарегистрироваться как «Организация».'}
              </p>
            )}
            {!loading &&
              results.map((c) => {
                const already = linkedIds.has(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => !already && handleAdd(c)}
                    disabled={already}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      already
                        ? 'border-emerald-100 bg-emerald-50/50 opacity-80'
                        : 'border-gray-100 hover:border-primary-200 hover:bg-primary-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm-mobile font-semibold text-gray-900">{c.name}</p>
                        <p className="text-xs-mobile text-gray-500">{c.specialty}</p>
                        {c.phone && (
                          <p className="text-xs-mobile text-gray-500">{c.phone}</p>
                        )}
                        {c.inviteCode && (
                          <p className="text-xs-mobile font-mono text-primary-600 mt-0.5">{c.inviteCode}</p>
                        )}
                      </div>
                      {!already && (
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          В системе
                        </span>
                      )}
                      {already && (
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      )}
                    </div>
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
