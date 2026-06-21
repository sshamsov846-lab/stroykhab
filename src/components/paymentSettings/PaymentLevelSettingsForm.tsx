import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type {
  CompanyRequisites,
  PaymentLevelSettings,
} from '@/types/paymentSettings'
import {
  PAYMENT_CALC_LABELS,
  PAYMENT_CLOSING_LABELS,
  PAYMENT_DOCUMENT_LABELS,
  PAYMENT_PERIOD_LABELS,
} from '@/types/paymentSettings'
import { needsRequisites } from '@utils/paymentSettingsHelpers'
import { BigButton } from '@components/BigButton'

interface Props {
  title: string
  hint?: string
  settings: PaymentLevelSettings
  requisites?: CompanyRequisites
  onSave: (settings: PaymentLevelSettings, requisites?: CompanyRequisites) => void
}

export const PaymentLevelSettingsForm: React.FC<Props> = ({
  title,
  hint,
  settings: initial,
  requisites: initialReq,
  onSave,
}) => {
  const [settings, setSettings] = useState<PaymentLevelSettings>(initial)
  const [req, setReq] = useState<CompanyRequisites>(initialReq ?? {})

  useEffect(() => {
    setSettings(initial)
    setReq(initialReq ?? {})
  }, [initial, initialReq])

  const patch = (p: Partial<PaymentLevelSettings>) => setSettings((s) => ({ ...s, ...p }))
  const patchReq = (p: Partial<CompanyRequisites>) => setReq((r) => ({ ...r, ...p }))

  const handleSave = () => {
    onSave(settings, needsRequisites(settings.documentMode) ? req : undefined)
    toast.success('Настройки сохранены')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      <div>
        <p className="text-sm-mobile font-semibold text-gray-900">{title}</p>
        {hint && <p className="text-xs-mobile text-gray-500 mt-0.5">{hint}</p>}
      </div>

      <div>
        <label className="text-xs-mobile font-medium text-gray-700">Когда платить</label>
        <select
          value={settings.closingTrigger}
          onChange={(e) => patch({ closingTrigger: e.target.value as PaymentLevelSettings['closingTrigger'] })}
          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
        >
          {Object.entries(PAYMENT_CLOSING_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {settings.closingTrigger === 'period_act' && (
        <div>
          <label className="text-xs-mobile font-medium text-gray-700">Период акта</label>
          <select
            value={settings.period}
            onChange={(e) => patch({ period: e.target.value as PaymentLevelSettings['period'] })}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
          >
            {Object.entries(PAYMENT_PERIOD_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs-mobile font-medium text-gray-700">Как считать</label>
        <select
          value={settings.calcMode}
          onChange={(e) => patch({ calcMode: e.target.value as PaymentLevelSettings['calcMode'] })}
          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
        >
          {Object.entries(PAYMENT_CALC_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs-mobile font-medium text-gray-700">Документ</label>
        <select
          value={settings.documentMode}
          onChange={(e) => patch({ documentMode: e.target.value as PaymentLevelSettings['documentMode'] })}
          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"
        >
          {Object.entries(PAYMENT_DOCUMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {needsRequisites(settings.documentMode) && (
        <div className="space-y-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-xs-mobile font-medium text-gray-700">Реквизиты для официального PDF</p>
          <input
            value={req.companyName ?? ''}
            onChange={(e) => patchReq({ companyName: e.target.value })}
            placeholder="Название организации"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
          />
          <input
            value={req.inn ?? ''}
            onChange={(e) => patchReq({ inn: e.target.value })}
            placeholder="ИНН"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
          />
          <input
            value={req.address ?? ''}
            onChange={(e) => patchReq({ address: e.target.value })}
            placeholder="Адрес"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
          />
          <input
            value={req.bankName ?? ''}
            onChange={(e) => patchReq({ bankName: e.target.value })}
            placeholder="Банк"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
          />
          <div className="flex gap-2">
            <input
              value={req.bik ?? ''}
              onChange={(e) => patchReq({ bik: e.target.value })}
              placeholder="БИК"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
            />
            <input
              value={req.account ?? ''}
              onChange={(e) => patchReq({ account: e.target.value })}
              placeholder="Р/с"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"
            />
          </div>
        </div>
      )}

      <BigButton variant="primary" size="md" fullWidth onClick={handleSave}>
        Сохранить
      </BigButton>
    </div>
  )
}
