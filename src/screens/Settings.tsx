import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Phone, Shield, KeyRound, Copy, Check, Download } from 'lucide-react'
import { useTelegram } from '@hooks/useTelegram'
import { useUserStore, ROLE_LABELS } from '@store/userStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useOrganizationStore } from '@store/organizationStore'
import { BrigadeManagePanel } from '@components/brigade/BrigadeManagePanel'
import { SupabaseConnectionTest } from '@components/SupabaseConnectionTest'
import { WORKER_TYPE_LABELS } from '@/types/person'
import { specializationLabels } from '@/constants/specializations'
import { buildUserKey } from '@utils/notificationFilter'

export const Settings: React.FC = () => {
  const navigate = useNavigate()
  const { isTelegram, haptic } = useTelegram()
  const {
    fullName,
    phone,
    role,
    logout,
    specializationIds,
    organizationId,
    organizationLinkStatus,
    organizationName,
    facePhoto,
    personalCode,
    workerEmploymentType,
    contractorId,
  } = useUserStore()
  const org = useProjectWorkflowStore((s) =>
    organizationId ? s.contractors.find((c) => c.id === organizationId) : undefined,
  )
  const myOrg = useProjectWorkflowStore((s) =>
    role === 'subcontractor' ? s.contractors.find((c) => c.id === contractorId) : undefined,
  )

  const [copied, setCopied] = React.useState(false)

  useEffect(() => {
    if (role !== 'foreman' || organizationLinkStatus !== 'pending') return
    const userKey = buildUserKey(phone, role, '', fullName)
    const member = useOrganizationStore.getState().members.find(
      (m) => m.userKey === userKey && m.memberRole === 'foreman',
    )
    if (member) {
      useUserStore.setState({
        organizationLinkStatus: 'approved',
        organizationId: member.contractorId,
      })
    }
  }, [role, organizationLinkStatus, phone, fullName])

  const handleLogout = () => {
    haptic('medium')
    logout()
    navigate('/register', { replace: true })
  }

  const copyCode = async () => {
    if (!personalCode) return
    try {
      await navigator.clipboard.writeText(personalCode)
      setCopied(true)
      haptic('success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const roleFeatures: Record<string, string[]> = {
    client: ['Просмотр объектов и прогресса', 'Дома, подъезды, квартиры', 'Фото и видео от мастеров', 'Бюджет и организации'],
    foreman: ['Управление объектами', 'Задачи и команда', 'Расходы и фотоотчёты', 'Ссылка для заказчика'],
    subcontractor: ['Мои работы', 'Мои мастера', 'Задачи и статусы', 'Уведомления'],
    worker: ['Мои задачи', 'Таймер работы', 'Фото до/после', 'Голосовые заметки'],
  }

  const showPersonalCode = role !== 'client' && personalCode

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl-mobile font-bold text-gray-900 mb-6">Настройки</h1>

      {role === 'worker' && <BrigadeManagePanel />}

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 mb-4">
        <div className="p-4 flex items-center gap-3">
          {facePhoto && role !== 'client' ? (
            <img
              src={facePhoto}
              alt={fullName}
              className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-primary-100"
            />
          ) : (
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-xl-mobile font-bold text-primary-600">
                {fullName.trim().charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-base-mobile font-bold text-gray-900">{fullName}</p>
            <p className="text-sm-mobile text-gray-500 flex items-center gap-1 mt-0.5">
              <Phone size={14} />
              {phone}
            </p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs-mobile rounded-full">
              {ROLE_LABELS[role]}
            </span>
            {showPersonalCode && (
              <p className="text-xs-mobile font-mono text-primary-600 mt-2">{personalCode}</p>
            )}
            {specializationIds.length > 0 && (
              <p className="text-xs-mobile text-gray-500 mt-2">
                Специализация: {specializationLabels(specializationIds)}
              </p>
            )}
            {role === 'worker' && workerEmploymentType && (
              <p className="text-xs-mobile text-amber-700 mt-1">
                {WORKER_TYPE_LABELS[workerEmploymentType]}
              </p>
            )}
            {(role === 'worker' || role === 'foreman') && organizationLinkStatus === 'approved' && org && (
              <p className="text-xs-mobile text-gray-500 mt-1">Организация: {org.name}</p>
            )}
            {(role === 'worker' || role === 'foreman') && organizationLinkStatus === 'pending' && (
              <p className="text-xs-mobile text-amber-700 mt-1">Ожидает подтверждения организацией</p>
            )}
            {role === 'subcontractor' && (organizationName || myOrg?.name) && (
              <p className="text-xs-mobile text-gray-500 mt-1">{organizationName || myOrg?.name}</p>
            )}
          </div>
        </div>

        {showPersonalCode && (
          <div className="p-4">
            <p className="text-xs-mobile text-gray-400 mb-1">Ваш код для поиска</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg-mobile font-bold text-primary-700 tracking-wide">{personalCode}</p>
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-1 text-primary-600 text-xs-mobile font-medium"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'OK' : 'Копировать'}
              </button>
            </div>
            <p className="text-xs-mobile text-gray-500 mt-1">
              По этому коду вас находят и привязывают к организации или прорабу
            </p>
          </div>
        )}

        <div className="p-4">
          <p className="text-xs-mobile text-gray-400">Режим</p>
          <p className="text-sm-mobile text-gray-700 mt-1">{isTelegram ? 'Telegram Mini App' : 'Веб-браузер'}</p>
        </div>
        <div className="p-4">
          <p className="text-xs-mobile text-gray-400">Версия</p>
          <p className="text-sm-mobile text-gray-700 mt-1">СтройХаб 1.0.0</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} className="text-primary-600" />
          <p className="text-sm-mobile font-semibold text-gray-900">Ваши функции</p>
        </div>
        <ul className="space-y-2">
          {(roleFeatures[role] || []).map((f) => (
            <li key={f} className="text-sm-mobile text-gray-600 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <SupabaseConnectionTest />

      {(role === 'foreman' || role === 'worker' || role === 'subcontractor') && (
        <button
          type="button"
          onClick={() => { haptic('light'); navigate('/connect') }}
          className="w-full flex items-center justify-center gap-2 py-3.5 mb-4 bg-primary-50 text-primary-700 rounded-xl font-medium text-sm-mobile border border-primary-100"
        >
          <KeyRound size={18} />
          Подключиться к объекту
        </button>
      )}

      <button
        type="button"
        onClick={() => { haptic('light'); navigate('/export') }}
        className="w-full flex items-center justify-center gap-2 py-3.5 mb-4 bg-white text-gray-800 rounded-xl font-medium text-sm-mobile border border-gray-200"
      >
        <Download size={18} />
        Экспорт данных
      </button>

      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm-mobile hover:bg-gray-200 active:bg-gray-300 transition-colors"
      >
        <LogOut size={18} />
        Сменить роль / Выйти
      </button>
    </div>
  )
}
