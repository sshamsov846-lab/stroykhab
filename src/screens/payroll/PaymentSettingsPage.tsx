import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { useUserStore } from '@store/userStore'
import { usePaymentSettingsStore } from '@store/paymentSettingsStore'
import { getCurrentUserKey } from '@utils/notificationFilter'
import { PaymentLevelSettingsForm } from '@components/paymentSettings/PaymentLevelSettingsForm'
import { NotificationBell } from '@components/NotificationBell'

export const PaymentSettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const role = useUserStore((s) => s.role)
  const contractorId = useUserStore((s) => s.contractorId)
  const foremanKey = getCurrentUserKey()

  const getForemanProfile = usePaymentSettingsStore((s) => s.getForemanProfile)
  const getOrgProfile = usePaymentSettingsStore((s) => s.getOrgProfile)
  const updateForemanPayWorkers = usePaymentSettingsStore((s) => s.updateForemanPayWorkers)
  const updateForemanRequisites = usePaymentSettingsStore((s) => s.updateForemanRequisites)
  const updateOrgPayForemen = usePaymentSettingsStore((s) => s.updateOrgPayForemen)
  const updateOrgChargeClient = usePaymentSettingsStore((s) => s.updateOrgChargeClient)
  const updateOrgRequisites = usePaymentSettingsStore((s) => s.updateOrgRequisites)

  const [orgTab, setOrgTab] = useState<'foremen' | 'client'>('foremen')

  if (role !== 'foreman' && role !== 'subcontractor') {
    return (
      <div className="p-4 text-gray-500">Раздел доступен прорабу и организации</div>
    )
  }

  const foremanProfile = getForemanProfile(foremanKey)
  const orgProfile = contractorId ? getOrgProfile(contractorId) : null

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg-mobile font-bold flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-primary-600" />
            Настройки оплаты
          </h1>
          <p className="text-xs-mobile text-gray-500">Подстройте правила под свою фирму</p>
        </div>
        <NotificationBell />
      </div>

      <div className="p-4 space-y-4">
        {role === 'foreman' && (
          <PaymentLevelSettingsForm
            title="Как платить мастерам и бригадам"
            hint="Прораб → мастер: когда закрывать, как считать, какой документ"
            settings={foremanProfile.payWorkers}
            requisites={foremanProfile.requisites}
            onSave={(settings, requisites) => {
              updateForemanPayWorkers(foremanKey, settings)
              if (requisites) updateForemanRequisites(foremanKey, requisites)
            }}
          />
        )}

        {role === 'subcontractor' && contractorId && orgProfile && (
          <>
            <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100">
              <button
                type="button"
                onClick={() => setOrgTab('foremen')}
                className={`flex-1 py-2 rounded-lg text-sm-mobile font-medium ${
                  orgTab === 'foremen' ? 'bg-primary-600 text-white' : 'text-gray-600'
                }`}
              >
                Прорабам
              </button>
              <button
                type="button"
                onClick={() => setOrgTab('client')}
                className={`flex-1 py-2 rounded-lg text-sm-mobile font-medium ${
                  orgTab === 'client' ? 'bg-primary-600 text-white' : 'text-gray-600'
                }`}
              >
                Заказчику
              </button>
            </div>

            {orgTab === 'foremen' ? (
              <PaymentLevelSettingsForm
                title="Как платить прорабам"
                hint="Организация → прораб"
                settings={orgProfile.payForemen}
                requisites={orgProfile.requisites}
                onSave={(settings, requisites) => {
                  updateOrgPayForemen(contractorId, settings)
                  if (requisites) updateOrgRequisites(contractorId, requisites)
                }}
              />
            ) : (
              <PaymentLevelSettingsForm
                title="Как выставлять заказчику"
                hint="Организация → заказчик (может отличаться от расчёта с прорабом)"
                settings={orgProfile.chargeClient}
                requisites={orgProfile.requisites}
                onSave={(settings, requisites) => {
                  updateOrgChargeClient(contractorId, settings)
                  if (requisites) updateOrgRequisites(contractorId, requisites)
                }}
              />
            )}
          </>
        )}

        <p className="text-xs-mobile text-gray-400 text-center px-2">
          По умолчанию — простой режим. Настройки можно менять в любой момент; интерфейс подстроится автоматически.
        </p>
      </div>
    </div>
  )
}
