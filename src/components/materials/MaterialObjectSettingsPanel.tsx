import React from 'react'
import { Settings2 } from 'lucide-react'
import { useMaterialStore } from '@store/materialStore'
import { useUserStore } from '@store/userStore'
import { MaterialPaymentPolicyPicker } from '@components/materials/MaterialPaymentPolicyPicker'
import { PAYMENT_POLICY_LABELS } from '@utils/materialPayment'
import type { MaterialPaymentPolicy } from '@/types/materials'

interface Props {
  objectId: string
  canEdit?: boolean
}

export const MaterialObjectSettingsPanel: React.FC<Props> = ({ objectId, canEdit }) => {
  const fullName = useUserStore((s) => s.fullName)
  const settings = useMaterialStore((s) => s.getObjectPaymentSettings(objectId))
  const setSettings = useMaterialStore((s) => s.setObjectPaymentSettings)
  const [editing, setEditing] = React.useState(false)
  const [draftPolicy, setDraftPolicy] = React.useState<MaterialPaymentPolicy>(settings.policy)
  const [draftSource, setDraftSource] = React.useState<'client' | 'organization'>(
    settings.reimbursementSource ?? 'client',
  )

  React.useEffect(() => {
    setDraftPolicy(settings.policy)
    setDraftSource(settings.reimbursementSource ?? 'client')
  }, [settings.policy, settings.reimbursementSource])

  const save = () => {
    setSettings(objectId, { policy: draftPolicy, reimbursementSource: draftSource }, fullName)
    setEditing(false)
  }

  if (!canEdit) {
    return (
      <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 text-sm-mobile text-primary-900">
        Правило оплаты: <strong>{PAYMENT_POLICY_LABELS[settings.policy]}</strong>
        {settings.policy === 'foreman_receipts' && (
          <span className="text-primary-700">
            {' '}· возмещает {settings.reimbursementSource === 'organization' ? 'организация' : 'заказчик'}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm-mobile font-semibold text-gray-900 flex items-center gap-2">
          <Settings2 size={16} className="text-primary-600" />
          Оплата материалов на объекте
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs-mobile text-primary-600 font-medium"
          >
            Изменить
          </button>
        )}
      </div>
      {editing ? (
        <>
          <MaterialPaymentPolicyPicker
            value={draftPolicy}
            onChange={setDraftPolicy}
            reimbursementSource={draftSource}
            onReimbursementSourceChange={setDraftSource}
            compact
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm-mobile font-medium"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm-mobile font-medium"
            >
              Отмена
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm-mobile text-gray-600">
          {PAYMENT_POLICY_LABELS[settings.policy]}
          {settings.policy === 'foreman_receipts' && (
            <span className="text-gray-500">
              {' '}· возмещает {settings.reimbursementSource === 'organization' ? 'организация' : 'заказчик'}
            </span>
          )}
        </p>
      )}
    </div>
  )
}
