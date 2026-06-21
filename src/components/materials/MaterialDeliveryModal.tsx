import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Truck, ShoppingCart, Camera, Receipt } from 'lucide-react'
import { BigButton } from '@components/BigButton'
import { useMaterialStore } from '@store/materialStore'
import { useUserStore } from '@store/userStore'
import {
  REQUEST_STATUS_LABELS,
  type MaterialPaymentPayer,
  type WorkflowMaterialRequest,
} from '@/types/materials'
import {
  PAYMENT_PAYER_LABELS,
  resolveRequestPaymentPayer,
} from '@utils/materialPayment'

interface Props {
  request: WorkflowMaterialRequest
  onClose: () => void
}

export const MaterialDeliveryModal: React.FC<Props> = ({ request, onClose }) => {
  const fullName = useUserStore((s) => s.fullName)
  const markOrdered = useMaterialStore((s) => s.markOrdered)
  const markDelivered = useMaterialStore((s) => s.markDelivered)
  const settings = useMaterialStore((s) => s.getObjectPaymentSettings(request.objectId))

  const defaultPayer = resolveRequestPaymentPayer(settings, request.paymentPayer)
  const isMixed = settings.policy === 'mixed'

  const [step, setStep] = useState<'order' | 'deliver'>(request.status === 'ordered' ? 'deliver' : 'order')
  const [deliveredBy, setDeliveredBy] = useState(fullName)
  const [purchasedBy, setPurchasedBy] = useState(fullName)
  const [deliveredQuantity, setDeliveredQuantity] = useState(String(request.quantity))
  const [deliveredAt, setDeliveredAt] = useState(new Date().toISOString().slice(0, 10))
  const [price, setPrice] = useState('')
  const [purchasedByPayer, setPurchasedByPayer] = useState<MaterialPaymentPayer>('foreman')
  const [paymentPayer, setPaymentPayer] = useState<MaterialPaymentPayer>(defaultPayer ?? 'client')
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState('')

  const handleReceiptPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setReceiptPhotoUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  const handleOrder = () => {
    markOrdered(request.id)
    toast.success('Отмечено: заказано')
    setStep('deliver')
  }

  const handleDeliver = () => {
    const qty = Number(deliveredQuantity)
    const sum = Number(price)
    if (!deliveredBy.trim()) {
      toast.error('Укажите, кто привёз')
      return
    }
    if (!qty || qty <= 0) {
      toast.error('Укажите количество')
      return
    }
    if (!sum || sum < 0) {
      toast.error('Укажите цену')
      return
    }
    if (!receiptPhotoUrl) {
      toast.error('Прикрепите фото чека')
      return
    }
    const payer = isMixed ? paymentPayer : (defaultPayer ?? paymentPayer)
    markDelivered(request.id, {
      deliveredBy: deliveredBy.trim(),
      deliveredQuantity: qty,
      deliveredAt: new Date(deliveredAt).toISOString(),
      price: sum,
      purchasedByPayer,
      purchasedBy: purchasedBy.trim() || deliveredBy.trim(),
      paymentPayer: payer,
      purchaseDate: new Date(deliveredAt).toISOString(),
      receiptPhotoUrl,
    })
    toast.success('Материал привезён, мастер уведомлён')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-4 space-y-4 max-h-[90vh] overflow-y-auto">
        <p className="text-base-mobile font-bold text-gray-900">{request.name}</p>
        <p className="text-sm-mobile text-gray-500">
          {request.quantity} {request.unit} · {request.taskTitle}
        </p>
        <p className="text-xs-mobile text-gray-400">
          Статус: {REQUEST_STATUS_LABELS[request.status]}
        </p>
        {defaultPayer && !isMixed && (
          <p className="text-xs-mobile text-primary-700 bg-primary-50 rounded-lg px-3 py-2">
            По договору платит: {PAYMENT_PAYER_LABELS[defaultPayer]}
          </p>
        )}

        {step === 'order' && request.status === 'pending' && (
          <>
            <BigButton variant="primary" size="lg" fullWidth icon={<ShoppingCart size={18} />} onClick={handleOrder}>
              Отметить «Заказано»
            </BigButton>
            <button
              type="button"
              onClick={() => setStep('deliver')}
              className="w-full text-sm-mobile text-primary-600 font-medium"
            >
              Сразу указать поставку →
            </button>
          </>
        )}

        {(step === 'deliver' || request.status === 'ordered') && request.status !== 'delivered' && (
          <div className="space-y-3">
            <p className="text-sm-mobile font-semibold flex items-center gap-2">
              <Truck size={18} /> Поставка и чек
            </p>
            <input
              value={deliveredBy}
              onChange={(e) => setDeliveredBy(e.target.value)}
              placeholder="Кто привёз"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
            />
            <input
              value={purchasedBy}
              onChange={(e) => setPurchasedBy(e.target.value)}
              placeholder="Кто купил (если другой)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={deliveredQuantity}
                onChange={(e) => setDeliveredQuantity(e.target.value)}
                placeholder="Кол-во"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
              />
              <input
                type="date"
                value={deliveredAt}
                onChange={(e) => setDeliveredAt(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
              />
            </div>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Сумма по чеку, ₽"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
            />
            <div>
              <p className="text-xs-mobile text-gray-500 mb-1">Кто купил</p>
              <select
                value={purchasedByPayer}
                onChange={(e) => setPurchasedByPayer(e.target.value as MaterialPaymentPayer)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
              >
                {(Object.entries(PAYMENT_PAYER_LABELS) as [MaterialPaymentPayer, string][]).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            {(isMixed || request.paymentPayer) && (
              <div>
                <p className="text-xs-mobile text-gray-500 mb-1">Кто оплачивает по договору</p>
                <select
                  value={paymentPayer}
                  onChange={(e) => setPaymentPayer(e.target.value as MaterialPaymentPayer)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm-mobile"
                >
                  {(Object.entries(PAYMENT_PAYER_LABELS) as [MaterialPaymentPayer, string][]).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
            )}
            <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer">
              <Camera size={24} className="text-gray-400" />
              <span className="text-sm-mobile text-gray-600">Фото чека</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleReceiptPhoto} />
              {receiptPhotoUrl && (
                <img src={receiptPhotoUrl} alt="Чек" className="w-full max-h-32 object-contain rounded-lg" />
              )}
            </label>
            {purchasedByPayer === 'foreman' && defaultPayer !== 'foreman' && (
              <p className="text-xs-mobile text-amber-700 bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-1">
                <Receipt size={14} />
                Будет создан запрос на возмещение прорабу
              </p>
            )}
            <BigButton variant="primary" size="lg" fullWidth onClick={handleDeliver}>
              Привезено — уведомить мастера
            </BigButton>
          </div>
        )}

        <BigButton variant="ghost" size="lg" fullWidth onClick={onClose}>
          Закрыть
        </BigButton>
      </div>
    </div>
  )
}
