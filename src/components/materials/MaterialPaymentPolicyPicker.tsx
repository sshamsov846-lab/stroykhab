import React from 'react'
import type { MaterialPaymentPolicy } from '@/types/materials'
import {
  PAYMENT_POLICY_HINTS,
  PAYMENT_POLICY_LABELS,
} from '@utils/materialPayment'

const POLICIES: MaterialPaymentPolicy[] = [
  'client_material',
  'turnkey',
  'foreman_receipts',
  'mixed',
]

interface Props {
  value: MaterialPaymentPolicy
  onChange: (policy: MaterialPaymentPolicy) => void
  reimbursementSource?: 'client' | 'organization'
  onReimbursementSourceChange?: (v: 'client' | 'organization') => void
  compact?: boolean
}

export const MaterialPaymentPolicyPicker: React.FC<Props> = ({
  value,
  onChange,
  reimbursementSource = 'client',
  onReimbursementSourceChange,
  compact,
}) => (
  <div className={compact ? 'space-y-2' : 'space-y-3'}>
    <p className="text-sm-mobile font-semibold text-gray-900">Кто оплачивает материалы</p>
    <div className="space-y-2">
      {POLICIES.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
            value === p ? 'border-primary-500 bg-primary-50' : 'border-gray-100 bg-white'
          }`}
        >
          <p className="text-sm-mobile font-semibold text-gray-900">{PAYMENT_POLICY_LABELS[p]}</p>
          {!compact && (
            <p className="text-xs-mobile text-gray-500 mt-0.5">{PAYMENT_POLICY_HINTS[p]}</p>
          )}
        </button>
      ))}
    </div>
    {value === 'foreman_receipts' && onReimbursementSourceChange && (
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-2">
        <p className="text-xs-mobile font-medium text-amber-900">Кто возмещает прорабу</p>
        <select
          value={reimbursementSource}
          onChange={(e) => onReimbursementSourceChange(e.target.value as 'client' | 'organization')}
          className="w-full px-3 py-2 rounded-lg border border-amber-200 text-sm-mobile bg-white"
        >
          <option value="client">Заказчик</option>
          <option value="organization">Организация</option>
        </select>
      </div>
    )}
  </div>
)
