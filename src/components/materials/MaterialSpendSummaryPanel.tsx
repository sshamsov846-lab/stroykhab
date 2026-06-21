import React from 'react'
import type { MaterialSpendSummary } from '@/types/materials'
import { PAYMENT_PAYER_LABELS } from '@utils/materialPayment'
import type { AppRole } from '@store/userStore'

interface Props {
  role: AppRole
  summary: MaterialSpendSummary
  foremanBalance?: { purchased: number; pending: number; reimbursed: number }
  pendingReimburseCount?: number
}

function money(n: number) {
  return `${n.toLocaleString('ru-RU')} ₽`
}

export const MaterialSpendSummaryPanel: React.FC<Props> = ({
  role,
  summary,
  foremanBalance,
  pendingReimburseCount = 0,
}) => {
  if (role === 'client') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-3 border border-gray-100 col-span-2">
          <p className="text-[10px] text-gray-500 uppercase">Ваши расходы на материалы</p>
          <p className="text-2xl-mobile font-bold text-gray-900">{money(summary.byPayer.client)}</p>
        </div>
        {pendingReimburseCount > 0 && (
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 col-span-2">
            <p className="text-[10px] text-amber-700 uppercase">Запросы на возмещение</p>
            <p className="text-lg-mobile font-bold text-amber-900">{pendingReimburseCount}</p>
          </div>
        )}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 col-span-2">
          <p className="text-[10px] text-gray-500 uppercase">Всего материалов по объектам</p>
          <p className="text-sm-mobile font-bold text-gray-700">{money(summary.totalDelivered)}</p>
        </div>
      </div>
    )
  }

  if (role === 'subcontractor') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <p className="text-[10px] text-gray-500 uppercase">Затраты орг.</p>
          <p className="text-xl-mobile font-bold text-primary-700">{money(summary.byPayer.organization)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-[10px] text-gray-500 uppercase">Всего на объекте</p>
          <p className="text-xl-mobile font-bold text-gray-900">{money(summary.totalDelivered)}</p>
        </div>
        {pendingReimburseCount > 0 && (
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 col-span-2">
            <p className="text-[10px] text-amber-700 uppercase">Возмещения прорабам</p>
            <p className="text-lg-mobile font-bold text-amber-900">{pendingReimburseCount} запросов</p>
          </div>
        )}
      </div>
    )
  }

  if (role === 'foreman' && foremanBalance) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <p className="text-[10px] text-gray-500 uppercase">Купил по чекам</p>
          <p className="text-xl-mobile font-bold text-gray-900">{money(foremanBalance.purchased)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
          <p className="text-[10px] text-amber-700 uppercase">К возмещению</p>
          <p className="text-xl-mobile font-bold text-amber-900">{money(foremanBalance.pending)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 col-span-2">
          <p className="text-[10px] text-emerald-700 uppercase">Уже возместили</p>
          <p className="text-lg-mobile font-bold text-emerald-800">{money(foremanBalance.reimbursed)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
      <p className="text-xs-mobile text-gray-500">Потрачено на материалы</p>
      <p className="text-2xl-mobile font-bold text-gray-900">{money(summary.totalDelivered)}</p>
      <div className="flex flex-wrap gap-2 text-xs-mobile text-gray-600">
        {(Object.keys(summary.byPayer) as Array<keyof typeof summary.byPayer>).map((k) =>
          summary.byPayer[k] > 0 ? (
            <span key={k} className="bg-gray-50 px-2 py-1 rounded-lg">
              {PAYMENT_PAYER_LABELS[k]}: {money(summary.byPayer[k])}
            </span>
          ) : null,
        )}
      </div>
    </div>
  )
}
